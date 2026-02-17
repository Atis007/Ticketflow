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

        $status = trim((string) ($request->query['status'] ?? ''));
        $where = '';
        $bind = [];

        if ($status !== '') {
            $where = 'WHERE si.status = :status';
            $bind[':status'] = $status;
        }

        try {
            $count = $pdo->prepare("SELECT COUNT(*) FROM security_incidents si {$where}");
            $count->execute($bind);
            $total = (int) $count->fetchColumn();

            $stmt = $pdo->prepare(
                "SELECT si.*
                 FROM security_incidents si
                 {$where}
                 ORDER BY si.last_seen_at DESC
                 LIMIT :limit OFFSET :offset"
            );
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

        try {
            $total = (int) $pdo->query('SELECT COUNT(*) FROM security_blocks')->fetchColumn();

            $stmt = $pdo->prepare(
                "SELECT *
                 FROM security_blocks
                 ORDER BY created_at DESC
                 LIMIT :limit OFFSET :offset"
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
}
