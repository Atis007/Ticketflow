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

final class AdminSecurityController
{
    /**
     * Lists security incidents.
     */
    public function incidents(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();
        [$page, $pageSize, $offset] = $this->pagination($request);
        $timezone = $this->appTimezone();

        $status = trim((string) ($request->query['status'] ?? ''));
        $search = trim((string) ($request->query['search'] ?? ''));
        $where = [];
        $bind = [];

        if ($status !== '') {
            $where[] = 'si.status = :status';
            $bind[':status'] = $status;
        }

        if ($search !== '') {
            $where[] = '(si.incident_type::text ILIKE :search OR si.ip::text ILIKE :search OR si.email::text ILIKE :search OR si.status::text ILIKE :search OR si.severity::text ILIKE :search OR si.action_taken::text ILIKE :search OR si.attempt_count::text ILIKE :search)';
            $bind[':search'] = '%' . $search . '%';
        }

        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);

        try {
            $count = $pdo->prepare("SELECT COUNT(*) FROM security_incidents si {$whereSql}");
            $count->execute($bind);
            $total = (int) $count->fetchColumn();

            $stmt = $pdo->prepare(
                "SELECT si.id,
                        si.incident_type,
                        si.ip::text AS ip,
                        si.email,
                        si.attempt_count,
                        si.severity,
                        si.status,
                        si.action_taken,
                        TO_CHAR(timezone(:tz, si.last_seen_at), 'YYYY-MM-DD HH24:MI:SS') AS last_seen_at,
                        TO_CHAR(timezone(:tz, si.created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at,
                        TO_CHAR(timezone(:tz, si.updated_at), 'YYYY-MM-DD HH24:MI:SS') AS updated_at,
                        CASE
                            WHEN si.resolved_at IS NULL THEN NULL
                            ELSE TO_CHAR(timezone(:tz, si.resolved_at), 'YYYY-MM-DD HH24:MI:SS')
                        END AS resolved_at
                 FROM security_incidents si
                 {$whereSql}
                 ORDER BY si.last_seen_at DESC
                 LIMIT :limit OFFSET :offset"
            );
            $stmt->bindValue(':tz', $timezone, PDO::PARAM_STR);
            foreach ($bind as $k => $v) {
                $stmt->bindValue($k, $v, PDO::PARAM_STR);
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
            Logger::error('Security incidents list failed: ' . $e->getMessage());
            Json::error('Failed to fetch security incidents', 500);
        }
    }

    /**
     * Lists security blocks.
     */
    public function blocks(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();
        [$page, $pageSize, $offset] = $this->pagination($request);
        $timezone = $this->appTimezone();
        $search = trim((string) ($request->query['search'] ?? ''));

        $whereSql = '';
        $bind = [];
        if ($search !== '') {
            $whereSql = 'WHERE sb.ip::text ILIKE :search OR sb.reason::text ILIKE :search OR sb.status::text ILIKE :search OR sb.created_source::text ILIKE :search OR sb.created_by::text ILIKE :search';
            $bind[':search'] = '%' . $search . '%';
        }

        try {
            if ($whereSql === '') {
                $total = (int) $pdo->query('SELECT COUNT(*) FROM security_blocks')->fetchColumn();
            } else {
                $countStmt = $pdo->prepare("SELECT COUNT(*) FROM security_blocks sb {$whereSql}");
                foreach ($bind as $k => $v) {
                    $countStmt->bindValue($k, $v, PDO::PARAM_STR);
                }
                $countStmt->execute();
                $total = (int) $countStmt->fetchColumn();
            }

            $stmt = $pdo->prepare(
                "SELECT sb.id,
                        sb.block_type,
                        sb.ip::text AS ip,
                        sb.reason,
                        sb.status,
                        sb.is_permanent,
                        sb.created_source,
                        sb.created_by,
                        sb.lifted_by,
                        CASE
                            WHEN sb.blocked_until IS NULL THEN NULL
                            ELSE TO_CHAR(timezone(:tz, sb.blocked_until), 'YYYY-MM-DD HH24:MI:SS')
                        END AS blocked_until,
                        CASE
                            WHEN sb.lifted_at IS NULL THEN NULL
                            ELSE TO_CHAR(timezone(:tz, sb.lifted_at), 'YYYY-MM-DD HH24:MI:SS')
                        END AS lifted_at,
                        TO_CHAR(timezone(:tz, sb.created_at), 'YYYY-MM-DD HH24:MI:SS') AS created_at,
                        TO_CHAR(timezone(:tz, sb.updated_at), 'YYYY-MM-DD HH24:MI:SS') AS updated_at
                 FROM security_blocks sb
                 {$whereSql}
                 ORDER BY sb.created_at DESC
                 LIMIT :limit OFFSET :offset"
            );
            $stmt->bindValue(':tz', $timezone, PDO::PARAM_STR);
            foreach ($bind as $k => $v) {
                $stmt->bindValue($k, $v, PDO::PARAM_STR);
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
            Logger::error('Security blocks list failed: ' . $e->getMessage());
            Json::error('Failed to fetch security blocks', 500);
        }
    }

    /**
     * Creates an admin manual IP block.
     */
    public function createIpBlock(Request $request, array $params = []): void
    {
        $adminId = AuthMiddleware::authenticatedUserId($request);
        $data = $request->jsonBody();
        $ip = trim((string) ($data['ip'] ?? ''));
        $reason = trim((string) ($data['reason'] ?? 'Manual admin block'));
        $isPermanent = (bool) ($data['isPermanent'] ?? false);
        $minutes = max(1, (int) ($data['minutes'] ?? 120));

        if ($ip === '') {
            Json::error('IP is required', 400);
        }

        $pdo = Database::getConnection();

        try {
            $stmt = $pdo->prepare(
                "INSERT INTO security_blocks (
                    block_type, ip, reason, is_permanent, blocked_until, status, created_source, created_by
                 ) VALUES (
                    'ip', :ip::inet, :reason, :is_permanent,
                    CASE WHEN :is_permanent THEN NULL ELSE NOW() + (:minutes || ' minutes')::interval END,
                    'active', 'admin', :created_by
                 )
                 RETURNING id"
            );
            $stmt->execute([
                ':ip' => $ip,
                ':reason' => $reason,
                ':is_permanent' => $isPermanent,
                ':minutes' => $minutes,
                ':created_by' => $adminId,
            ]);

            $id = (int) $stmt->fetchColumn();
            (new AdminAuditService())->log($pdo, $adminId, 'security.block.ip', 'system', $id, ['ip' => $ip, 'isPermanent' => $isPermanent]);

            Json::success(['id' => $id], 201);
        } catch (Exception $e) {
            Logger::error('Create IP block failed: ' . $e->getMessage());
            Json::error('Failed to create IP block', 500);
        }
    }

    /**
     * Lifts an active security block.
     */
    public function liftBlock(Request $request, array $params = []): void
    {
        $id = (int) ($params['id'] ?? 0);
        $adminId = AuthMiddleware::authenticatedUserId($request);
        if ($id <= 0) {
            Json::error('Invalid block id', 400);
        }

        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare(
                "UPDATE security_blocks
                 SET status = 'lifted', lifted_at = NOW(), lifted_by = :lifted_by, updated_at = NOW()
                 WHERE id = :id
                 RETURNING id"
            );
            $stmt->execute([':id' => $id, ':lifted_by' => $adminId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($row)) {
                Json::error('Block not found', 404);
            }

            (new AdminAuditService())->log($pdo, $adminId, 'security.block.lift', 'system', $id, null);
            Json::success(['id' => $id]);
        } catch (Exception $e) {
            Logger::error('Lift block failed: ' . $e->getMessage());
            Json::error('Failed to lift block', 500);
        }
    }

    /**
     * Escalates an incident for manual review.
     */
    public function escalateIncident(Request $request, array $params = []): void
    {
        $adminId = AuthMiddleware::authenticatedUserId($request);
        $this->setIncidentState((int) ($params['id'] ?? 0), 'escalated', 'high', $adminId);
    }

    /**
     * Resolves a security incident.
     */
    public function resolveIncident(Request $request, array $params = []): void
    {
        $id = (int) ($params['id'] ?? 0);
        $adminId = AuthMiddleware::authenticatedUserId($request);
        if ($id <= 0) {
            Json::error('Invalid incident id', 400);
        }

        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare(
                "UPDATE security_incidents
                 SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
                 WHERE id = :id
                 RETURNING id"
            );
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($row)) {
                Json::error('Incident not found', 404);
            }

            (new AdminAuditService())->log($pdo, $adminId, 'security.incident.resolve', 'system', $id, null);

            Json::success(['id' => $id]);
        } catch (Exception $e) {
            Logger::error('Resolve incident failed: ' . $e->getMessage());
            Json::error('Failed to resolve incident', 500);
        }
    }

    /**
     * Sets incident action state.
     */
    private function setIncidentState(int $id, string $actionTaken, string $severity, int $adminId): void
    {
        if ($id <= 0) {
            Json::error('Invalid incident id', 400);
        }

        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare(
                'UPDATE security_incidents
                 SET action_taken = :action_taken, severity = :severity, updated_at = NOW()
                 WHERE id = :id
                 RETURNING id'
            );
            $stmt->execute([
                ':action_taken' => $actionTaken,
                ':severity' => $severity,
                ':id' => $id,
            ]);

            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!is_array($row)) {
                Json::error('Incident not found', 404);
            }

            (new AdminAuditService())->log($pdo, $adminId, 'security.incident.' . $actionTaken, 'system', $id, ['severity' => $severity]);

            Json::success(['id' => $id]);
        } catch (Exception $e) {
            Logger::error('Set incident state failed: ' . $e->getMessage());
            Json::error('Failed to update incident', 500);
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
}
