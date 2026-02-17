<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use Exception;
use PDO;

final class EventController
{
    /**
     * Lists active events for a subcategory slug.
     */
    public function indexBySubcategory(Request $request, array $params = []): void
    {
        $subcategorySlug = trim((string) ($params['subcategory_slug'] ?? ''));
        if ($subcategorySlug === '') {
            Json::error('Subcategory slug is required', 400);
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare(
                "SELECT
                    e.id,
                    e.slug,
                    e.title,
                    e.image,
                    e.city,
                    e.venue,
                    TO_CHAR(e.starts_at, 'YYYY.MM.DD HH24:MI:SS') AS starts_at,
                    e.is_free,
                    e.price,
                    e.is_seated,
                    s.slug AS subcategory_slug,
                    c.slug AS category_slug
                 FROM events e
                 INNER JOIN subcategories s ON s.id = e.subcategory_id
                 INNER JOIN categories c ON c.id = e.category_id
                 WHERE s.slug = :subcategory_slug
                   AND e.is_active = TRUE
                 ORDER BY e.starts_at ASC"
            );

            $stmt->execute([':subcategory_slug' => $subcategorySlug]);
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Json::success([
                'subcategorySlug' => $subcategorySlug,
                'events' => $events,
            ]);
        } catch (Exception $e) {
            Logger::error('Failed to list events by subcategory: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Returns event detail by subcategory slug and event slug.
     */
    public function showBySubcategoryAndSlug(Request $request, array $params = []): void
    {
        $subcategorySlug = trim((string) ($params['subcategory_slug'] ?? ''));
        $eventSlug = trim((string) ($params['event_slug'] ?? ''));

        if ($subcategorySlug === '' || $eventSlug === '') {
            Json::error('Subcategory slug and event slug are required', 400);
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare(
                "SELECT
                    e.id,
                    e.slug,
                    e.title,
                    e.description,
                    e.image,
                    e.city,
                    e.venue,
                    TO_CHAR(e.starts_at, 'YYYY.MM.DD HH24:MI:SS') AS starts_at,
                    TO_CHAR(e.ends_at, 'YYYY.MM.DD HH24:MI:SS') AS ends_at,
                    e.capacity,
                    e.tickets_sold,
                    e.is_free,
                    e.price,
                    e.is_seated,
                    e.created_by,
                    s.id AS subcategory_id,
                    s.name AS subcategory_name,
                    s.slug AS subcategory_slug,
                    c.id AS category_id,
                    c.name AS category_name,
                    c.slug AS category_slug
                 FROM events e
                 INNER JOIN subcategories s ON s.id = e.subcategory_id
                 INNER JOIN categories c ON c.id = e.category_id
                 WHERE s.slug = :subcategory_slug
                   AND e.slug = :event_slug
                   AND e.is_active = TRUE
                 LIMIT 1"
            );

            $stmt->execute([
                ':subcategory_slug' => $subcategorySlug,
                ':event_slug' => $eventSlug,
            ]);

            $event = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!is_array($event)) {
                Json::error('Event not found', 404);
            }

            Json::success(['event' => $event]);
        } catch (Exception $e) {
            Logger::error('Failed to fetch event detail by slug: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }
}
