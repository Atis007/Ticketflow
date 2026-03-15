<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use App\Services\AiServiceClient;
use Throwable;

final class AiController
{
    /**
     * Generates a layout preview without persisting.
     * POST /api/ai/generate-layout-preview
     */
    public function generateLayoutPreview(Request $request, array $params = []): void
    {
        $userId = AuthMiddleware::authenticatedUserId($request);

        $body = $request->jsonBody();
        $venueName = trim((string) ($body['venueName'] ?? ''));
        $venueType = trim((string) ($body['venueType'] ?? 'concert_hall'));
        $capacity = (int) ($body['capacity'] ?? 0);
        $instructions = trim((string) ($body['instructions'] ?? ''));

        if ($capacity <= 0) {
            Json::error('capacity must be greater than 0', 400);
        }

        try {
            $startMs = hrtime(true);
            $aiClient = new AiServiceClient();
            $result = $aiClient->generateLayout($venueName, $venueType, $capacity, $instructions);

            if ($result === null) {
                Json::error('AI service unavailable', 502);
            }

            $layout = $result['layout'] ?? null;
            if (!is_array($layout) || !isset($layout['sections'])) {
                Json::error('Invalid layout response from AI service', 502);
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
                    ':tool'     => 'generate_layout_preview',
                    ':input'    => json_encode([
                        'venueName' => $venueName,
                        'venueType' => $venueType,
                        'capacity' => $capacity,
                        'instructions' => $instructions,
                    ], JSON_UNESCAPED_UNICODE),
                    ':output'   => json_encode($result, JSON_UNESCAPED_UNICODE),
                    ':status'   => 'success',
                    ':duration' => $durationMs,
                ]);
            } catch (Throwable $e) {
                Logger::error('Failed to log generate_layout_preview call: ' . $e->getMessage());
            }

            Json::success(['layout' => $layout]);
        } catch (Throwable $e) {
            Logger::error('AI generate-layout-preview failed: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

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
                'enhanced' => $result['enhanced'] ?? $result,
            ]);
        } catch (Throwable $e) {
            Logger::error('AI enhance-content failed: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }
}
