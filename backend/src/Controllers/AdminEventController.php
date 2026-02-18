<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use App\Services\AdminAuditService;
use Exception;
use PDO;

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
                        TO_CHAR(e.starts_at, 'YYYY.MM.DD HH24:MI:SS') AS starts_at,
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
            foreach ($bind as $k => $v) {
                $type = is_bool($v) ? PDO::PARAM_BOOL : (is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
                $stmt->bindValue($k, $v, $type);
            }
            $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

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
     * @return array{0:int,1:int,2:int}
     */
    private function pagination(Request $request): array
    {
        $page = max(1, (int) ($request->query['page'] ?? 1));
        $pageSize = max(1, min(100, (int) ($request->query['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;

        return [$page, $pageSize, $offset];
    }
}
