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

final class AdminAiController
{
    /**
     * Proxies chat messages to the Python AI service.
     * POST /api/admin/ai/chat
     */
    public function chat(Request $request, array $params = []): void
    {
        $payload = AuthMiddleware::authenticatedPayload($request);
        $adminId = (int) ($payload['id'] ?? 0);
        $adminToken = $request->bearerToken();

        $body = $request->jsonBody();
        $messages = $body['messages'] ?? [];

        if (!is_array($messages) || $messages === []) {
            Json::error('messages array is required', 400);
        }

        $conversationId = trim((string) ($body['conversationId'] ?? bin2hex(random_bytes(16))));

        try {
            $aiClient = new AiServiceClient();
            $result = $aiClient->chat($messages, $adminToken);

            if ($result === null) {
                Json::error('AI service unavailable', 502);
            }

            // Log tool calls to ai_task_logs
            $pdo = Database::getConnection();
            $toolCalls = $result['tool_calls'] ?? [];
            $toolResults = $result['tool_results'] ?? [];

            foreach ($toolCalls as $i => $tc) {
                $toolResult = $toolResults[$i] ?? null;
                $this->logToolCall(
                    $pdo,
                    $adminId,
                    $conversationId,
                    (string) ($tc['name'] ?? ''),
                    $tc['arguments'] ?? [],
                    $toolResult,
                );
            }

            Json::success([
                'response' => $result['response'] ?? '',
                'toolCalls' => $toolCalls,
                'toolResults' => $toolResults,
                'model' => $result['model'] ?? '',
                'conversationId' => $conversationId,
                'demoPrompts' => $result['demo_prompts'] ?? [],
            ]);
        } catch (Throwable $e) {
            Logger::error('Admin AI chat failed: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Returns past AI conversation logs.
     * GET /api/admin/ai/history
     */
    public function history(Request $request, array $params = []): void
    {
        $adminId = AuthMiddleware::authenticatedUserId($request);
        $page = max(1, (int) ($request->query['page'] ?? 1));
        $pageSize = max(1, min(100, (int) ($request->query['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;

        try {
            $pdo = Database::getConnection();

            $stmt = $pdo->prepare(
                'SELECT id, conversation_id, tool_name, status, duration_ms, created_at
                 FROM ai_task_logs
                 WHERE user_id = :admin_id
                 ORDER BY created_at DESC
                 LIMIT :limit OFFSET :offset'
            );
            $stmt->bindValue(':admin_id', $adminId, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $countStmt = $pdo->prepare(
                'SELECT COUNT(*) FROM ai_task_logs WHERE user_id = :admin_id'
            );
            $countStmt->execute([':admin_id' => $adminId]);
            $total = (int) $countStmt->fetchColumn();

            Json::success([
                'items' => $items,
                'pagination' => [
                    'page' => $page,
                    'pageSize' => $pageSize,
                    'total' => $total,
                    'totalPages' => $pageSize > 0 ? (int) ceil($total / $pageSize) : 1,
                ],
            ]);
        } catch (Exception $e) {
            Logger::error('AI history fetch failed: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    private function logToolCall(
        PDO $pdo,
        int $adminId,
        string $conversationId,
        string $toolName,
        array $toolInput,
        ?array $toolResult,
    ): void {
        try {
            $status = ($toolResult['status'] ?? 'error') === 'success' ? 'success' : 'error';
            $durationMs = (int) ($toolResult['duration_ms'] ?? 0);

            $stmt = $pdo->prepare(
                'INSERT INTO ai_task_logs
                    (user_id, conversation_id, tool_name, input_payload, output_payload, status, duration_ms)
                 VALUES
                    (:admin_id, :conv_id, :tool, :input, :output, :status, :duration)'
            );
            $stmt->execute([
                ':admin_id'  => $adminId,
                ':conv_id'   => $conversationId,
                ':tool'      => $toolName,
                ':input'     => json_encode($toolInput, JSON_UNESCAPED_UNICODE),
                ':output'    => $toolResult !== null ? json_encode($toolResult, JSON_UNESCAPED_UNICODE) : null,
                ':status'    => $status,
                ':duration'  => $durationMs,
            ]);
        } catch (Throwable $e) {
            Logger::error('Failed to log AI tool call: ' . $e->getMessage());
        }
    }
}
