<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use Exception;
use PDO;

final class AdminLogController
{
    /**
     * Lists device logs.
     */
    public function deviceLogs(Request $request, array $params = []): void
    {
        $this->listByQuery(
            "SELECT dl.id, dl.user_id, u.email, dl.user_agent, dl.ip, dl.action,
                    TO_CHAR(dl.created_at, 'YYYY.MM.DD HH24:MI:SS') AS created_at
             FROM device_logs dl
             LEFT JOIN users u ON u.id = dl.user_id",
            'dl.created_at',
            $request
        );
    }

    /**
     * Lists admin logs.
     */
    public function adminLogs(Request $request, array $params = []): void
    {
        $this->listByQuery(
            "SELECT al.id, al.admin_id, u.email AS admin_email, al.action, al.entity_type, al.entity_id, al.metadata,
                    TO_CHAR(al.created_at, 'YYYY.MM.DD HH24:MI:SS') AS created_at
             FROM admin_logs al
             LEFT JOIN users u ON u.id = al.admin_id",
            'al.created_at',
            $request
        );
    }

    /**
     * Lists event change logs.
     */
    public function eventChanges(Request $request, array $params = []): void
    {
        $this->listByQuery(
            "SELECT ec.id, ec.event_id, e.title AS event_title, ec.changed_by, u.email AS changed_by_email,
                    ec.field, ec.old_value, ec.new_value, ec.notification_sent,
                    TO_CHAR(ec.changed_at, 'YYYY.MM.DD HH24:MI:SS') AS changed_at
             FROM event_changes ec
             LEFT JOIN events e ON e.id = ec.event_id
             LEFT JOIN users u ON u.id = ec.changed_by",
            'ec.changed_at',
            $request
        );
    }

    /**
     * Performs paginated log listing for a base query.
     */
    private function listByQuery(string $baseSql, string $defaultOrderField, Request $request): void
    {
        $pdo = Database::getConnection();
        $page = max(1, (int) ($request->query['page'] ?? 1));
        $pageSize = max(1, min(100, (int) ($request->query['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;

        try {
            $countStmt = $pdo->query('SELECT COUNT(*) FROM (' . $baseSql . ') t');
            $total = (int) $countStmt->fetchColumn();

            $stmt = $pdo->prepare(
                $baseSql . " ORDER BY {$defaultOrderField} DESC LIMIT :limit OFFSET :offset"
            );
            $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            Json::success([
                'items' => $stmt->fetchAll(PDO::FETCH_ASSOC),
                'pagination' => [
                    'page' => $page,
                    'pageSize' => $pageSize,
                    'total' => $total,
                    'totalPages' => $pageSize > 0 ? (int) ceil($total / $pageSize) : 1,
                ],
            ]);
        } catch (Exception $e) {
            Logger::error('Admin log list failed: ' . $e->getMessage());
            Json::error('Failed to fetch log data', 500);
        }
    }
}
