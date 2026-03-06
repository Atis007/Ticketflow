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

final class ProfileController
{
    /**
     * Lists purchase history for the authenticated user.
     */
    public function purchases(Request $request, array $params = []): void
    {
        $payload = AuthMiddleware::authenticatedPayload($request);
        $userId = (int) ($payload['id'] ?? 0);

        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $page = max(1, (int) ($request->query['page'] ?? 1));
        $pageSize = max(1, min(50, (int) ($request->query['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;
        $timezone = $this->appTimezone();

        try {
            $pdo = Database::getConnection();

            $stmt = $pdo->prepare(
                "SELECT
                    p.id,
                    p.status,
                    p.ips_qr_payload,
                    p.paid_at,
                    p.amount,
                    p.currency,
                    e.title AS event_title,
                    TO_CHAR(timezone(:tz, e.starts_at), 'YYYY-MM-DD HH24:MI:SS') AS event_date,
                    COUNT(t.id) AS ticket_count
                 FROM payments p
                 INNER JOIN events e ON e.id = p.event_id
                 LEFT JOIN tickets t ON t.payment_id = p.id
                 WHERE p.user_id = :user_id
                 GROUP BY p.id, e.title, e.starts_at
                 ORDER BY COALESCE(p.paid_at, e.starts_at) DESC, p.id DESC
                 LIMIT :limit OFFSET :offset"
            );

            $stmt->bindValue(':tz', $timezone, PDO::PARAM_STR);
            $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $purchases = [];

            foreach ($rows as $row) {
                $ticketCount = (int) ($row['ticket_count'] ?? 0);
                $payloadQuantity = $this->extractQuantity($row['ips_qr_payload'] ?? null);
                $quantity = $ticketCount > 0 ? $ticketCount : $payloadQuantity;

                $purchases[] = [
                    'id' => (int) ($row['id'] ?? 0),
                    'eventName' => (string) ($row['event_title'] ?? ''),
                    'eventDate' => (string) ($row['event_date'] ?? ''),
                    'quantity' => $quantity > 0 ? $quantity : 0,
                    'ticketType' => 'General Admission',
                    'status' => (string) ($row['status'] ?? 'pending'),
                ];
            }

            Json::success([
                'purchases' => $purchases,
                'page' => $page,
                'pageSize' => $pageSize,
            ]);
        } catch (Exception $e) {
            Logger::error('Failed to fetch profile purchases: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Lists favorite events for the authenticated user.
     */
    public function favorites(Request $request, array $params = []): void
    {
        $payload = AuthMiddleware::authenticatedPayload($request);
        $userId = (int) ($payload['id'] ?? 0);

        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $page = max(1, (int) ($request->query['page'] ?? 1));
        $pageSize = max(1, min(50, (int) ($request->query['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;
        $timezone = $this->appTimezone();

        try {
            $pdo = Database::getConnection();

            $stmt = $pdo->prepare(
                "SELECT
                    f.id,
                    e.title,
                    e.image,
                    e.city,
                    e.venue,
                    TO_CHAR(timezone(:tz, e.starts_at), 'YYYY-MM-DD HH24:MI:SS') AS event_date,
                    e.slug AS event_slug,
                    COALESCE(s.slug, c.slug) AS scope_slug
                 FROM favorites f
                 INNER JOIN events e ON e.id = f.event_id
                 LEFT JOIN subcategories s ON s.id = e.subcategory_id
                 LEFT JOIN categories c ON c.id = e.category_id
                 WHERE f.user_id = :user_id
                 ORDER BY f.created_at DESC, f.id DESC
                 LIMIT :limit OFFSET :offset"
            );

            $stmt->bindValue(':tz', $timezone, PDO::PARAM_STR);
            $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $favorites = [];

            foreach ($rows as $row) {
                $scopeSlug = (string) ($row['scope_slug'] ?? '');
                $eventSlug = (string) ($row['event_slug'] ?? '');
                $eventPath = ($scopeSlug !== '' && $eventSlug !== '')
                    ? '/events/' . $scopeSlug . '/' . $eventSlug
                    : '/events';

                $location = trim(
                    implode(', ', array_filter([
                        (string) ($row['city'] ?? ''),
                        (string) ($row['venue'] ?? ''),
                    ]))
                );

                $favorites[] = [
                    'id' => (int) ($row['id'] ?? 0),
                    'title' => (string) ($row['title'] ?? ''),
                    'date' => (string) ($row['event_date'] ?? ''),
                    'location' => $location,
                    'imageUrl' => (string) ($row['image'] ?? ''),
                    'eventPath' => $eventPath,
                ];
            }

            Json::success([
                'favorites' => $favorites,
                'page' => $page,
                'pageSize' => $pageSize,
            ]);
        } catch (Exception $e) {
            Logger::error('Failed to fetch profile favorites: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    private function appTimezone(): string
    {
        $value = (string) ($_ENV['TIMEZONE'] ?? 'Europe/Belgrade');
        $sanitized = preg_replace('/[^A-Za-z0-9_\/+\-]/', '', $value) ?? 'Europe/Belgrade';

        return $sanitized !== '' ? $sanitized : 'Europe/Belgrade';
    }

    private function extractQuantity(null|string $payload): int
    {
        if ($payload === null || $payload === '') {
            return 0;
        }

        try {
            $decoded = json_decode($payload, true, flags: JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return 0;
        }

        if (!is_array($decoded)) {
            return 0;
        }

        return (int) ($decoded['quantity'] ?? 0);
    }
}
