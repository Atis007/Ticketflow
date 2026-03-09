<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use App\Services\AdminAuditService;
use App\Services\AiServiceClient;
use App\Services\EventChangeLogService;
use App\Services\EventSeatService;
use App\Services\LayoutVersionService;
use Exception;
use PDO;
use Throwable;

final class AdminEventController
{
    /**
     * Lists events for the admin dashboard with pagination and filters.
     */
    public function index(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();
        [$page, $pageSize, $offset] = $this->pagination($request);

        $search = trim((string) ($request->query['search'] ?? ''));
        $isActive = $request->query['isActive'] ?? null;
        $categoryId = $request->query['categoryId'] ?? null;
        $sortBy = (string) ($request->query['sortBy'] ?? 'starts_at');
        $sortDir = strtolower((string) ($request->query['sortDir'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';

        $sortMap = [
            'starts_at' => 'e.starts_at',
            'created_at' => 'e.created_at',
            'title' => 'e.title',
            'city' => 'e.city',
        ];
        $orderBy = $sortMap[$sortBy] ?? 'e.starts_at';

        $where = [];
        $bind = [];

        if ($search !== '') {
            $where[] = '(e.title ILIKE :search OR e.city ILIKE :search OR e.venue ILIKE :search)';
            $bind[':search'] = '%' . $search . '%';
        }

        if ($isActive !== null && $isActive !== '') {
            $where[] = 'e.is_active = :is_active';
            $bind[':is_active'] = filter_var($isActive, FILTER_VALIDATE_BOOLEAN);
        }

        if ($categoryId !== null && (int) $categoryId > 0) {
            $where[] = 'e.category_id = :category_id';
            $bind[':category_id'] = (int) $categoryId;
        }

        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $timezone = $this->appTimezone();

        try {
            $countStmt = $pdo->prepare(
                "SELECT COUNT(*)
                 FROM events e
                 {$whereSql}"
            );
            $countStmt->execute($bind);
            $total = (int) $countStmt->fetchColumn();

            $sql = "SELECT
                        e.id,
                        e.slug,
                        e.title,
                        e.city,
                        e.venue,
                        e.is_active,
                        e.is_free,
                        e.price,
                        e.created_by,
                        TO_CHAR(timezone(:tz, e.starts_at), 'YYYY-MM-DD HH24:MI:SS') AS starts_at,
                        c.name AS category_name,
                        s.name AS subcategory_name,
                        u.fullname AS owner_name
                    FROM events e
                    LEFT JOIN categories c ON c.id = e.category_id
                    LEFT JOIN subcategories s ON s.id = e.subcategory_id
                    LEFT JOIN users u ON u.id = e.created_by
                    {$whereSql}
                    ORDER BY {$orderBy} {$sortDir}
                    LIMIT :limit OFFSET :offset";

            $stmt = $pdo->prepare($sql);
            $stmt->bindValue(':tz', $timezone, PDO::PARAM_STR);
            foreach ($bind as $k => $v) {
                $type = is_bool($v) ? PDO::PARAM_BOOL : (is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
                $stmt->bindValue($k, $v, $type);
            }
            $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $payload = [
                'items' => $items,
                'pagination' => [
                    'page' => $page,
                    'pageSize' => $pageSize,
                    'total' => $total,
                    'totalPages' => $pageSize > 0 ? (int) ceil($total / $pageSize) : 1,
                ],
            ];

            $this->respondNotModifiedIfEtagMatches($request, $payload);
            Json::success($payload);
        } catch (Exception $e) {
            Logger::error('Admin event list failed: ' . $e->getMessage());
            Json::error('Failed to fetch events', 500);
        }
    }

    /**
     * Toggles event active status.
     */
    public function toggleActive(Request $request, array $params = []): void
    {
        $id = (int) ($params['id'] ?? 0);
        $adminId = AuthMiddleware::authenticatedUserId($request);
        if ($id <= 0) {
            Json::error('Invalid event id', 400);
        }

        $pdo = Database::getConnection();
        try {
            $beforeStmt = $pdo->prepare('SELECT is_active FROM events WHERE id = :id LIMIT 1');
            $beforeStmt->execute([':id' => $id]);
            $before = $beforeStmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($before)) {
                Json::error('Event not found', 404);
            }

            $stmt = $pdo->prepare(
                'UPDATE events
                 SET is_active = NOT is_active
                 WHERE id = :id
                 RETURNING id, is_active'
            );
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($row)) {
                Json::error('Event not found', 404);
            }

            (new EventChangeLogService())->logSingleChange(
                $pdo,
                $id,
                $adminId,
                'is_active',
                (bool) ($before['is_active'] ?? false),
                (bool) $row['is_active']
            );

            (new AdminAuditService())->log(
                $pdo,
                $adminId,
                'event.toggle_active',
                'event',
                $id,
                ['is_active' => (bool) $row['is_active']]
            );

            Json::success([
                'id' => (int) $row['id'],
                'isActive' => (bool) $row['is_active'],
            ]);
        } catch (Exception $e) {
            Logger::error('Admin toggle event failed: ' . $e->getMessage());
            Json::error('Failed to update event status', 500);
        }
    }

    /**
     * Generates a venue layout using AI and persists sections + seats.
     * POST /api/admin/events/{id}/generate-layout
     */
    public function generateLayout(Request $request, array $params = []): void
    {
        $eventId = (int) ($params['id'] ?? 0);
        $adminId = AuthMiddleware::authenticatedUserId($request);

        if ($eventId <= 0) {
            Json::error('Invalid event id', 400);
        }

        $pdo = \App\Core\Database::getConnection();

        $eventStmt = $pdo->prepare(
            'SELECT id, title, venue, capacity, is_seated FROM events WHERE id = :id LIMIT 1'
        );
        $eventStmt->execute([':id' => $eventId]);
        $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

        if (!is_array($event)) {
            Json::error('Event not found', 404);
        }

        $body = $request->jsonBody();
        $venueType = trim((string) ($body['venueType'] ?? 'concert_hall'));
        $instructions = trim((string) ($body['instructions'] ?? ''));
        $capacity = (int) ($body['capacity'] ?? $event['capacity'] ?? 500);
        $venueName = trim((string) ($body['venueName'] ?? $event['venue'] ?? $event['title'] ?? ''));

        if ($capacity <= 0) {
            Json::error('capacity must be greater than 0', 400);
        }

        try {
            $aiClient = new AiServiceClient();
            $result = $aiClient->generateLayout($venueName, $venueType, $capacity, $instructions);

            if ($result === null) {
                Json::error('AI service unavailable or failed to generate layout', 502);
            }

            $layout = $result['layout'] ?? null;
            if (!is_array($layout) || !isset($layout['sections'])) {
                Json::error('Invalid layout response from AI service', 502);
            }

            $pdo->beginTransaction();

            // Create sections in DB
            // event_sections.type enum is 'seated' | 'standing'
            $typeMap = [
                'standard' => 'seated',
                'vip' => 'seated',
                'balcony' => 'seated',
                'standing' => 'standing',
                'seated' => 'seated',
            ];

            $sectionStmt = $pdo->prepare(
                'INSERT INTO event_sections (event_id, name, type, capacity, price, x_position, y_position, source)
                 VALUES (:event_id, :name, :type, :capacity, :price, :x_pos, :y_pos, :source)
                 RETURNING id'
            );

            $sectionsWithIds = [];
            foreach ($layout['sections'] as $i => $section) {
                $rawType = strtolower((string) ($section['type'] ?? 'seated'));
                $dbType = $typeMap[$rawType] ?? 'seated';
                $sectionCapacity = 0;
                foreach (($section['rows'] ?? []) as $row) {
                    $sectionCapacity += (int) ($row['seat_count'] ?? $row['seatCount'] ?? 0);
                }

                $sectionStmt->execute([
                    ':event_id'  => $eventId,
                    ':name'      => $section['name'] ?? 'Section ' . ($i + 1),
                    ':type'      => $dbType,
                    ':capacity'  => $sectionCapacity > 0 ? $sectionCapacity : 1,
                    ':price'     => 0,
                    ':x_pos'     => 0,
                    ':y_pos'     => $i,
                    ':source'    => 'ai',
                ]);
                $sectionId = (int) $sectionStmt->fetchColumn();
                $section['section_id'] = $sectionId;
                $sectionsWithIds[] = $section;
            }

            // Generate seats from layout
            $seatService = new EventSeatService();
            $seatService->generateFromLayout($pdo, $eventId, ['sections' => $sectionsWithIds]);

            // Update event to seated if not already
            $pdo->prepare('UPDATE events SET is_seated = TRUE WHERE id = :id')
                ->execute([':id' => $eventId]);

            // Save layout version
            $layoutVersionService = new LayoutVersionService();
            $versionId = $layoutVersionService->save($pdo, $eventId, $layout);

            $pdo->commit();

            (new AdminAuditService())->log(
                $pdo,
                $adminId,
                'event.generate_layout',
                'event',
                $eventId,
                ['version_id' => $versionId, 'sections' => count($layout['sections'])]
            );

            Json::success([
                'eventId' => $eventId,
                'layout' => $layout,
                'versionId' => $versionId,
                'message' => 'Layout generated and persisted successfully',
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            Logger::error('Layout generation failed: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * @return array{0:int,1:int,2:int}
     */
    private function pagination(Request $request): array
    {
        $page = max(1, (int) ($request->query['page'] ?? 1));
        $pageSize = max(1, min(100, (int) ($request->query['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;

        return [$page, $pageSize, $offset];
    }

    private function appTimezone(): string
    {
        $value = (string) ($_ENV['TIMEZONE'] ?? 'UTC');
        $sanitized = preg_replace('/[^A-Za-z0-9_\/+\-]/', '', $value) ?? 'UTC';

        return $sanitized !== '' ? $sanitized : 'UTC';
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function respondNotModifiedIfEtagMatches(Request $request, array $payload): void
    {
        $serialized = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if (!is_string($serialized)) {
            return;
        }

        $etag = 'W/"' . sha1($serialized) . '"';
        header('Cache-Control: private, max-age=0, must-revalidate');
        header('ETag: ' . $etag);

        $ifNoneMatch = trim((string) ($request->header('if-none-match') ?? ''));
        if ($ifNoneMatch !== '' && $ifNoneMatch === $etag) {
            http_response_code(304);
            exit;
        }
    }
}
