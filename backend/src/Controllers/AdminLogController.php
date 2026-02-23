<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use DateTimeImmutable;
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
            "SELECT dl.id, dl.user_id, u.email, dl.user_agent, dl.ip, dl.action, dl.platform, dl.device_type, dl.outcome,
                    TO_CHAR(timezone(:tz, dl.created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at
             FROM device_logs dl
             LEFT JOIN users u ON u.id = dl.user_id",
            'created_at',
            ['email', 'user_agent', 'ip', 'action', 'platform', 'device_type', 'outcome', 'created_at'],
            $request,
            [
                'action' => 'action',
                'ip' => 'ip',
                'device_type' => 'device_type',
                'platform' => 'platform',
                'outcome' => 'outcome',
            ]
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
            $request,
            [
                'action' => 'action',
                'outcome' => 'metadata->>\'outcome\'',
            ]
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
            $request,
            [
                'field' => 'field',
            ]
        );
    }

    /**
     * Performs paginated log listing for a base query.
     */
    private function listByQuery(
        string $baseSql,
        string $defaultOrderField,
        array $searchColumns,
        Request $request,
        array $exactFilters = []
    ): void
    {
        $pdo = Database::getConnection();
        $page = max(1, (int) ($request->query['page'] ?? 1));
        $pageSize = max(1, min(100, (int) ($request->query['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;
        $cursor = trim((string) ($request->query['cursor'] ?? ''));
        if ($cursor !== '') {
            $page = 1;
            $offset = 0;
        }
        $search = trim((string) ($request->query['search'] ?? ''));
        $timezone = $this->appTimezone();
        $safeOrderField = preg_replace('/[^a-zA-Z0-9_]/', '', $defaultOrderField) ?? '';
        if ($safeOrderField === '') {
            $safeOrderField = 'created_at';
        }

        $whereParts = [];
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
                $whereParts[] = '(' . implode(' OR ', $conditions) . ')';
                $bind[':search'] = '%' . $search . '%';
            }
        }

        foreach ($exactFilters as $queryKey => $columnExpression) {
            $raw = trim((string) ($request->query[$queryKey] ?? ''));
            if ($raw === '') {
                continue;
            }

            $safeQueryKey = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $queryKey) ?? '';
            if ($safeQueryKey === '') {
                continue;
            }

            if (preg_match('/^[a-zA-Z0-9_]+$/', (string) $columnExpression) !== 1 &&
                !str_contains((string) $columnExpression, 'metadata->>')) {
                continue;
            }

            $paramName = ':f_' . $safeQueryKey;
            $whereParts[] = "t.{$columnExpression}::text = {$paramName}";
            $bind[$paramName] = $raw;
        }

        $dateFrom = trim((string) ($request->query['dateFrom'] ?? ''));
        if ($dateFrom !== '') {
            $normalizedFrom = $this->normalizeDateInput($dateFrom, 'dateFrom');
            $whereParts[] = "t.{$safeOrderField}::timestamp >= :date_from";
            $bind[':date_from'] = $normalizedFrom;
        }

        $dateTo = trim((string) ($request->query['dateTo'] ?? ''));
        if ($dateTo !== '') {
            $normalizedTo = $this->normalizeDateInput($dateTo, 'dateTo');
            $whereParts[] = "t.{$safeOrderField}::timestamp <= :date_to";
            $bind[':date_to'] = $normalizedTo;
        }

        if ($cursor !== '') {
            $normalizedCursor = $this->normalizeDateInput($cursor, 'cursor');
            $whereParts[] = "t.{$safeOrderField}::timestamp < :cursor";
            $bind[':cursor'] = $normalizedCursor;
        }

        $whereSql = $whereParts === [] ? '' : ' WHERE ' . implode(' AND ', $whereParts);

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

            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $nextCursor = null;
            if (is_array($items) && $items !== []) {
                $lastItem = $items[count($items) - 1];
                $nextCursor = isset($lastItem[$safeOrderField]) ? (string) $lastItem[$safeOrderField] : null;
            }

            $payload = [
                'items' => $items,
                'pagination' => [
                    'page' => $page,
                    'pageSize' => $pageSize,
                    'total' => $total,
                    'totalPages' => $pageSize > 0 ? (int) ceil($total / $pageSize) : 1,
                ],
                'nextCursor' => $nextCursor,
            ];

            $this->respondNotModifiedIfEtagMatches($request, $payload);
            Json::success($payload);
        } catch (Exception $e) {
            Logger::error('Admin log list failed: ' . $e->getMessage());
            Json::error('Failed to fetch log data', 500);
        }
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

    private function appTimezone(): string
    {
        $value = (string) ($_ENV['TIMEZONE'] ?? 'UTC');
        $sanitized = preg_replace('/[^A-Za-z0-9_\/+\-]/', '', $value) ?? 'UTC';

        return $sanitized !== '' ? $sanitized : 'UTC';
    }

    private function normalizeDateInput(string $value, string $field): string
    {
        try {
            return (new DateTimeImmutable($value))->format('Y-m-d H:i:s');
        } catch (Exception) {
            Json::error('Invalid ' . $field . ' datetime format', 400);
        }
    }
}
