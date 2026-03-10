<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use Exception;
use PDO;

final class NotificationController
{
    /**
     * GET /api/notifications — last 50 notifications for the authenticated user.
     */
    public function index(Request $request, array $params = []): void
    {
        $payload = AuthMiddleware::authenticatedPayload($request);
        $userId  = (int) ($payload['id'] ?? 0);

        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        try {
            $pdo = Database::getConnection();

            $stmt = $pdo->prepare(
                'SELECT id, type, title, message, is_read, created_at
                 FROM notifications
                 WHERE user_id = :user_id
                 ORDER BY created_at DESC
                 LIMIT 50'
            );
            $stmt->execute([':user_id' => $userId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $notifications = array_map(static function (array $row): array {
                $rawMessage = (string) ($row['message'] ?? '');
                $data       = $rawMessage !== '' ? (json_decode($rawMessage, true) ?? []) : [];

                return [
                    'id'         => (int) $row['id'],
                    'type'       => (string) ($row['type'] ?? ''),
                    'title'      => (string) ($row['title'] ?? ''),
                    'data'       => $data,
                    'is_read'    => (bool) $row['is_read'],
                    'created_at' => (string) $row['created_at'],
                ];
            }, $rows);

            $unreadStmt = $pdo->prepare(
                'SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND is_read = FALSE'
            );
            $unreadStmt->execute([':user_id' => $userId]);
            $unreadCount = (int) $unreadStmt->fetchColumn();

            Json::success([
                'notifications' => $notifications,
                'unread_count'  => $unreadCount,
            ]);
        } catch (Exception $e) {
            Logger::error('Failed to fetch notifications: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * PATCH /api/notifications/{id}/read — mark a single notification as read.
     */
    public function markRead(Request $request, array $params = []): void
    {
        $payload  = AuthMiddleware::authenticatedPayload($request);
        $userId   = (int) ($payload['id'] ?? 0);
        $notifId  = (int) ($params['id'] ?? 0);

        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        if ($notifId <= 0) {
            Json::error('Invalid notification id', 400);
        }

        try {
            $pdo  = Database::getConnection();
            $stmt = $pdo->prepare(
                'UPDATE notifications SET is_read = TRUE WHERE id = :id AND user_id = :user_id'
            );
            $stmt->execute([':id' => $notifId, ':user_id' => $userId]);

            if ($stmt->rowCount() === 0) {
                Json::error('Notification not found', 404);
            }

            Json::success(['message' => 'Notification marked as read']);
        } catch (Exception $e) {
            Logger::error('Failed to mark notification read: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * POST /api/notifications/read-all — mark all notifications as read.
     */
    public function markAllRead(Request $request, array $params = []): void
    {
        $payload = AuthMiddleware::authenticatedPayload($request);
        $userId  = (int) ($payload['id'] ?? 0);

        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        try {
            $pdo  = Database::getConnection();
            $stmt = $pdo->prepare(
                'UPDATE notifications SET is_read = TRUE WHERE user_id = :user_id AND is_read = FALSE'
            );
            $stmt->execute([':user_id' => $userId]);

            Json::success(['message' => 'All notifications marked as read']);
        } catch (Exception $e) {
            Logger::error('Failed to mark all notifications read: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * DELETE /api/notifications/{id} — delete a single notification.
     */
    public function destroy(Request $request, array $params = []): void
    {
        $payload  = AuthMiddleware::authenticatedPayload($request);
        $userId   = (int) ($payload['id'] ?? 0);
        $notifId  = (int) ($params['id'] ?? 0);

        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        if ($notifId <= 0) {
            Json::error('Invalid notification id', 400);
        }

        try {
            $pdo  = Database::getConnection();
            $stmt = $pdo->prepare(
                'DELETE FROM notifications WHERE id = :id AND user_id = :user_id'
            );
            $stmt->execute([':id' => $notifId, ':user_id' => $userId]);

            if ($stmt->rowCount() === 0) {
                Json::error('Notification not found', 404);
            }

            Json::success(['message' => 'Notification deleted']);
        } catch (Exception $e) {
            Logger::error('Failed to delete notification: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }
}
