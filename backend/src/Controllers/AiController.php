<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use App\Services\AiServiceClient;
use Exception;
use PDO;
use Throwable;

final class AiController
{
    /**
     * Enhances event content via the AI service.
     * POST /api/ai/enhance-content
     */
    public function enhanceContent(Request $request, array $params = []): void
    {
        $userId = AuthMiddleware::authenticatedUserId($request);

        $body = $request->jsonBody();
        $title = trim((string) ($body['title'] ?? ''));
        $description = trim((string) ($body['description'] ?? ''));

        if ($title === '') {
            Json::error('title is required', 400);
        }

        if ($description === '') {
            Json::error('description is required', 400);
        }

        try {
            $startMs = hrtime(true);
            $aiClient = new AiServiceClient();
            $result = $aiClient->enhanceContent($title, $description);

            if ($result === null) {
                Json::error('AI service unavailable', 502);
            }

            $durationMs = (int) ((hrtime(true) - $startMs) / 1_000_000);

            try {
                $pdo = Database::getConnection();
                $stmt = $pdo->prepare(
                    'INSERT INTO ai_task_logs
                        (user_id, tool_name, input_payload, output_payload, status, duration_ms)
                     VALUES
                        (:user_id, :tool, :input, :output, :status, :duration)'
                );
                $stmt->execute([
                    ':user_id'  => $userId,
                    ':tool'     => 'enhance_content',
                    ':input'    => json_encode(['title' => $title, 'description' => $description], JSON_UNESCAPED_UNICODE),
                    ':output'   => json_encode($result, JSON_UNESCAPED_UNICODE),
                    ':status'   => 'success',
                    ':duration' => $durationMs,
                ]);
            } catch (Throwable $e) {
                Logger::error('Failed to log enhance_content call: ' . $e->getMessage());
            }

            Json::success([
                'original' => ['title' => $title, 'description' => $description],
                'enhanced' => $result,
            ]);
        } catch (Throwable $e) {
            Logger::error('AI enhance-content failed: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Returns paginated AI eval run records.
     * GET /api/ai/eval-results (admin only)
     */
    public function evalResults(Request $request, array $params = []): void
    {
        $page = max(1, (int) ($request->query['page'] ?? 1));
        $pageSize = max(1, min(100, (int) ($request->query['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;

        $eventId = isset($request->query['event_id']) ? (int) $request->query['event_id'] : null;
        $evalName = isset($request->query['eval_name']) ? trim((string) $request->query['eval_name']) : null;
        $status = isset($request->query['status']) ? trim((string) $request->query['status']) : null;

        $allowedStatuses = ['pending', 'running', 'passed', 'failed'];
        if ($status !== null && !in_array($status, $allowedStatuses, true)) {
            Json::error('Invalid status filter', 400);
        }

        try {
            $pdo = Database::getConnection();

            $conditions = [];
            $bindings = [];

            if ($eventId !== null) {
                $conditions[] = 'event_id = :event_id';
                $bindings[':event_id'] = $eventId;
            }
            if ($evalName !== null && $evalName !== '') {
                $conditions[] = 'eval_name = :eval_name';
                $bindings[':eval_name'] = $evalName;
            }
            if ($status !== null) {
                $conditions[] = 'status = :status';
                $bindings[':status'] = $status;
            }

            $where = $conditions !== [] ? 'WHERE ' . implode(' AND ', $conditions) : '';

            $stmt = $pdo->prepare(
                "SELECT * FROM ai_eval_runs {$where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
            );
            foreach ($bindings as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM ai_eval_runs {$where}");
            $countStmt->execute($bindings);
            $total = (int) $countStmt->fetchColumn();

            Json::success([
                'items' => $items,
                'pagination' => [
                    'page'       => $page,
                    'pageSize'   => $pageSize,
                    'total'      => $total,
                    'totalPages' => $pageSize > 0 ? (int) ceil($total / $pageSize) : 1,
                ],
            ]);
        } catch (Exception $e) {
            Logger::error('AI eval-results fetch failed: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }
}
