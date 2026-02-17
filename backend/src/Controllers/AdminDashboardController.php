<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
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

        try {
            $summary = [
                'users' => (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(),
                'verifiedUsers' => (int) $pdo->query('SELECT COUNT(*) FROM users WHERE is_active = TRUE')->fetchColumn(),
                'disabledUsers' => (int) $pdo->query('SELECT COUNT(*) FROM users WHERE is_disabled = TRUE')->fetchColumn(),
                'upcomingEvents' => (int) $pdo->query("SELECT COUNT(*) FROM events WHERE starts_at > NOW() AND is_active = TRUE")->fetchColumn(),
                'failedPayments' => (int) $pdo->query("SELECT COUNT(*) FROM payments WHERE status = 'failed'")->fetchColumn(),
                'openIncidents' => (int) $pdo->query("SELECT COUNT(*) FROM security_incidents WHERE status = 'open'")->fetchColumn(),
                'activeBlocks' => (int) $pdo->query("SELECT COUNT(*) FROM security_blocks WHERE status = 'active'")->fetchColumn(),
            ];

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

        $pdo = Database::getConnection();
        try {
            $changes = [
                'users' => $this->fetchChanged($pdo, 'SELECT id, fullname, email, role, is_active, is_disabled, created_at FROM users WHERE created_at > :since ORDER BY created_at ASC', $since),
                'events' => $this->fetchChanged($pdo, 'SELECT id, title, slug, is_active, created_at FROM events WHERE created_at > :since ORDER BY created_at ASC', $since),
                'categories' => $this->fetchChanged($pdo, 'SELECT id, name, slug, icon, created_at FROM categories WHERE created_at > :since ORDER BY created_at ASC', $since),
                'subcategories' => $this->fetchChanged($pdo, 'SELECT id, category_id, name, slug, created_at FROM subcategories WHERE created_at > :since ORDER BY created_at ASC', $since),
                'adminLogs' => $this->fetchChanged($pdo, 'SELECT id, admin_id, action, entity_type, entity_id, created_at FROM admin_logs WHERE created_at > :since ORDER BY created_at ASC', $since),
                'deviceLogs' => $this->fetchChanged($pdo, 'SELECT id, user_id, ip, action, created_at FROM device_logs WHERE created_at > :since ORDER BY created_at ASC', $since),
                'eventChanges' => $this->fetchChanged($pdo, 'SELECT id, event_id, field, changed_at FROM event_changes WHERE changed_at > :since ORDER BY changed_at ASC', $since),
                'securityIncidents' => $this->fetchChanged($pdo, 'SELECT id, incident_type, status, severity, updated_at FROM security_incidents WHERE updated_at > :since ORDER BY updated_at ASC', $since),
                'securityBlocks' => $this->fetchChanged($pdo, 'SELECT id, block_type, status, is_permanent, updated_at FROM security_blocks WHERE updated_at > :since ORDER BY updated_at ASC', $since),
            ];

            Json::success([
                'changes' => $changes,
                'nextCursor' => (new \DateTimeImmutable('now'))->format('c'),
            ]);
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
    private function fetchChanged(PDO $pdo, string $sql, string $since): array
    {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':since' => $since]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($rows) ? $rows : [];
    }
}
