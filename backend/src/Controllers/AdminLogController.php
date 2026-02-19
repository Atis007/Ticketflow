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
                    TO_CHAR(timezone(:tz, dl.created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at
             FROM device_logs dl
             LEFT JOIN users u ON u.id = dl.user_id",
            'created_at',
            ['email', 'user_agent', 'ip', 'action', 'created_at'],
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
                    TO_CHAR(timezone(:tz, al.created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at
             FROM admin_logs al
             LEFT JOIN users u ON u.id = al.admin_id",
            'created_at',
            ['admin_email', 'action', 'entity_type', 'entity_id', 'created_at'],
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
                    TO_CHAR(timezone(:tz, ec.changed_at), 'YYYY-MM-DD HH24:MI:SS') AS changed_at
             FROM event_changes ec
             LEFT JOIN events e ON e.id = ec.event_id
             LEFT JOIN users u ON u.id = ec.changed_by",
            'changed_at',
            ['event_title', 'changed_by_email', 'field', 'old_value', 'new_value', 'changed_at'],
            $request
        );
    }

    /**
     * Performs paginated log listing for a base query.
     */
    private function listByQuery(string $baseSql, string $defaultOrderField, array $searchColumns, Request $request): void
    {
        $pdo = Database::getConnection();
        $page = max(1, (int) ($request->query['page'] ?? 1));
        $pageSize = max(1, min(100, (int) ($request->query['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;
        $search = trim((string) ($request->query['search'] ?? ''));
        $timezone = $this->appTimezone();
        $safeOrderField = preg_replace('/[^a-zA-Z0-9_]/', '', $defaultOrderField) ?? '';
        if ($safeOrderField === '') {
            $safeOrderField = 'created_at';
        }

        $whereSql = '';
        $bind = [];
        if ($search !== '' && $searchColumns !== []) {
            $conditions = [];
            foreach ($searchColumns as $column) {
                $safeColumn = preg_replace('/[^a-zA-Z0-9_]/', '', $column) ?? '';
                if ($safeColumn === '') {
                    continue;
                }

                $conditions[] = "t.{$safeColumn}::text ILIKE :search";
            }

            if ($conditions !== []) {
                $whereSql = ' WHERE ' . implode(' OR ', $conditions);
                $bind[':search'] = '%' . $search . '%';
            }
        }

        try {
            $countStmt = $pdo->prepare('SELECT COUNT(*) FROM (' . $baseSql . ') t' . $whereSql);
            $countStmt->bindValue(':tz', $timezone, PDO::PARAM_STR);
            foreach ($bind as $key => $value) {
                $countStmt->bindValue($key, $value, PDO::PARAM_STR);
            }
            $countStmt->execute();
            $total = (int) $countStmt->fetchColumn();

            $stmt = $pdo->prepare(
                'SELECT * FROM (' . $baseSql . ') t' . $whereSql . " ORDER BY t.{$safeOrderField} DESC LIMIT :limit OFFSET :offset"
            );
            $stmt->bindValue(':tz', $timezone, PDO::PARAM_STR);
            foreach ($bind as $key => $value) {
                $stmt->bindValue($key, $value, PDO::PARAM_STR);
            }
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

    private function appTimezone(): string
    {
        $value = (string) ($_ENV['TIMEZONE'] ?? 'UTC');
        $sanitized = preg_replace('/[^A-Za-z0-9_\/+\-]/', '', $value) ?? 'UTC';

        return $sanitized !== '' ? $sanitized : 'UTC';
    }
}
