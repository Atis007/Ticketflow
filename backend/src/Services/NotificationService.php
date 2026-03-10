<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

final class NotificationService
{
    /**
     * Insert a single notification row.
     *
     * @param array<string, mixed> $data  Structured payload stored as JSON in the `message` column.
     */
    public static function create(PDO $pdo, int $userId, string $type, array $data): void
    {
        $stmt = $pdo->prepare(
            'INSERT INTO notifications (user_id, type, title, message)
             VALUES (:user_id, :type, :title, :message)'
        );
        $stmt->execute([
            ':user_id' => $userId,
            ':type'    => $type,
            ':title'   => self::buildTitle($type, $data),
            ':message' => json_encode($data, JSON_UNESCAPED_UNICODE),
        ]);
    }

    /**
     * Notify all users who hold confirmed (paid) tickets for the given event.
     *
     * @param array<string, mixed> $data
     */
    public static function createForEventTicketHolders(PDO $pdo, int $eventId, string $type, array $data): void
    {
        $stmt = $pdo->prepare(
            'SELECT DISTINCT t.user_id
             FROM tickets t
             INNER JOIN payments p ON p.id = t.payment_id
             WHERE t.event_id = :event_id
               AND p.status = :status'
        );
        $stmt->execute([':event_id' => $eventId, ':status' => 'paid']);
        $userIds = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'user_id');

        if ($userIds === []) {
            return;
        }

        $insertStmt = $pdo->prepare(
            'INSERT INTO notifications (user_id, type, title, message)
             VALUES (:user_id, :type, :title, :message)'
        );
        $title   = self::buildTitle($type, $data);
        $encoded = json_encode($data, JSON_UNESCAPED_UNICODE);

        foreach ($userIds as $uid) {
            $insertStmt->execute([
                ':user_id' => (int) $uid,
                ':type'    => $type,
                ':title'   => $title,
                ':message' => $encoded,
            ]);
        }
    }

    /**
     * Build a human-readable title from notification type + payload.
     *
     * @param array<string, mixed> $data
     */
    private static function buildTitle(string $type, array $data): string
    {
        $eventTitle = (string) ($data['event_title'] ?? 'event');

        return match ($type) {
            'purchase_success' => 'Purchase confirmed for "' . $eventTitle . '"',
            'event_updated'    => '"' . $eventTitle . '" has been updated',
            default            => 'Notification',
        };
    }
}
