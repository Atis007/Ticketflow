<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\FileCache;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use Exception;
use PDO;

final class AdminDashboardController
{
    /**
     * Returns dashboard summary counters.
     */
    public function healthSummary(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();
        $cache = new FileCache();
        $cacheTtl = max(5, (int) ($_ENV['ADMIN_HEALTH_CACHE_TTL'] ?? 30));

        $cached = $cache->get('admin_health_summary_v1');
        if (is_array($cached)) {
            Json::success($cached);
        }

        try {
            $stmt = $pdo->query(
                "SELECT
                    (SELECT COUNT(*) FROM users) AS users,
                    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS verified_users,
                    (SELECT COUNT(*) FROM users WHERE is_disabled = TRUE) AS disabled_users,
                    (SELECT COUNT(*) FROM events WHERE starts_at > NOW() AND is_active = TRUE) AS upcoming_events,
                    (SELECT COUNT(*) FROM payments WHERE status = 'failed') AS failed_payments,
                    (SELECT COUNT(*) FROM security_incidents WHERE status = 'open') AS open_incidents,
                    (SELECT COUNT(*) FROM security_blocks WHERE status = 'active') AS active_blocks"
            );
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            $summary = [
                'users' => (int) ($row['users'] ?? 0),
                'verifiedUsers' => (int) ($row['verified_users'] ?? 0),
                'disabledUsers' => (int) ($row['disabled_users'] ?? 0),
                'upcomingEvents' => (int) ($row['upcoming_events'] ?? 0),
                'failedPayments' => (int) ($row['failed_payments'] ?? 0),
                'openIncidents' => (int) ($row['open_incidents'] ?? 0),
                'activeBlocks' => (int) ($row['active_blocks'] ?? 0),
            ];

            $cache->put('admin_health_summary_v1', $summary, $cacheTtl);

            Json::success($summary);
        } catch (Exception $e) {
            Logger::error('Admin health summary failed: ' . $e->getMessage());
            Json::error('Failed to fetch summary', 500);
        }
    }

    /**
     * Returns incremental changes for no-refresh admin dashboard updates.
     */
    public function syncChanges(Request $request, array $params = []): void
    {
        $sinceRaw = trim((string) ($request->query['since'] ?? ''));
        $since = $sinceRaw !== '' ? $sinceRaw : '1970-01-01T00:00:00+00:00';
        $timezone = $this->appTimezone();
        $limit = max(1, min(500, (int) ($request->query['limit'] ?? 200)));

        $cache = new FileCache();
        $cacheTtl = max(5, (int) ($_ENV['ADMIN_SYNC_CACHE_TTL'] ?? 15));
        $cacheKey = 'admin_sync_changes_v1:' . sha1($since . ':' . $timezone . ':' . $limit);
        $cached = $cache->get($cacheKey);
        if (is_array($cached)) {
            Json::success($cached);
        }

        $pdo = Database::getConnection();
        try {
            $changes = [
                'users' => $this->fetchChanged($pdo, "SELECT id, fullname, email, role, is_active, is_disabled, TO_CHAR(timezone(:tz, created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at FROM users WHERE created_at > :since ORDER BY created_at ASC LIMIT :limit", $since, $timezone, $limit),
                'events' => $this->fetchChanged($pdo, "SELECT id, title, slug, is_active, TO_CHAR(timezone(:tz, created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at FROM events WHERE created_at > :since ORDER BY created_at ASC LIMIT :limit", $since, $timezone, $limit),
                'categories' => $this->fetchChanged($pdo, "SELECT id, name, slug, icon, TO_CHAR(timezone(:tz, created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at FROM categories WHERE created_at > :since ORDER BY created_at ASC LIMIT :limit", $since, $timezone, $limit),
                'subcategories' => $this->fetchChanged($pdo, "SELECT id, category_id, name, slug, TO_CHAR(timezone(:tz, created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at FROM subcategories WHERE created_at > :since ORDER BY created_at ASC LIMIT :limit", $since, $timezone, $limit),
                'adminLogs' => $this->fetchChanged($pdo, "SELECT id, admin_id, action, entity_type, entity_id, TO_CHAR(timezone(:tz, created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at FROM admin_logs WHERE created_at > :since ORDER BY created_at ASC LIMIT :limit", $since, $timezone, $limit),
                'deviceLogs' => $this->fetchChanged($pdo, "SELECT id, user_id, ip, action, TO_CHAR(timezone(:tz, created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at FROM device_logs WHERE created_at > :since ORDER BY created_at ASC LIMIT :limit", $since, $timezone, $limit),
                'eventChanges' => $this->fetchChanged($pdo, "SELECT id, event_id, field, TO_CHAR(timezone(:tz, changed_at), 'YYYY-MM-DD HH24:MI:SS') AS changed_at FROM event_changes WHERE changed_at > :since ORDER BY changed_at ASC LIMIT :limit", $since, $timezone, $limit),
                'securityIncidents' => $this->fetchChanged($pdo, "SELECT id, incident_type, status, severity, TO_CHAR(timezone(:tz, updated_at), 'YYYY-MM-DD HH24:MI:SS') AS updated_at FROM security_incidents WHERE updated_at > :since ORDER BY updated_at ASC LIMIT :limit", $since, $timezone, $limit),
                'securityBlocks' => $this->fetchChanged($pdo, "SELECT id, block_type, status, is_permanent, TO_CHAR(timezone(:tz, updated_at), 'YYYY-MM-DD HH24:MI:SS') AS updated_at FROM security_blocks WHERE updated_at > :since ORDER BY updated_at ASC LIMIT :limit", $since, $timezone, $limit),
            ];

            $payload = [
                'changes' => $changes,
                'nextCursor' => (new \DateTimeImmutable('now'))->format('c'),
            ];

            $cache->put($cacheKey, $payload, $cacheTtl);

            Json::success($payload);
        } catch (Exception $e) {
            Logger::error('Admin sync changes failed: ' . $e->getMessage());
            Json::error('Failed to fetch incremental changes', 500);
        }
    }

    /**
     * Executes a since-filtered query and returns changed rows.
     *
     * @return array<int, array<string, mixed>>
     */
    private function fetchChanged(PDO $pdo, string $sql, string $since, string $timezone, int $limit): array
    {
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':since', $since, PDO::PARAM_STR);
        $stmt->bindValue(':tz', $timezone, PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($rows) ? $rows : [];
    }

    private function appTimezone(): string
    {
        $value = (string) ($_ENV['TIMEZONE'] ?? 'UTC');
        $sanitized = preg_replace('/[^A-Za-z0-9_\/+\-]/', '', $value) ?? 'UTC';

        return $sanitized !== '' ? $sanitized : 'UTC';
    }
}
