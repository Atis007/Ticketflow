<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

final class AdminAuditService
{
    /**
     * Persists an admin/system action in admin_logs.
     *
     * @param array<string, mixed>|null $metadata
     */
    public function log(PDO $pdo, ?int $adminId, string $action, string $entityType, ?int $entityId = null, ?array $metadata = null): void
    {
        $stmt = $pdo->prepare(
            'INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, metadata)
             VALUES (:admin_id, :action, :entity_type, :entity_id, :metadata)'
        );

        $stmt->execute([
            ':admin_id' => $adminId,
            ':action' => $action,
            ':entity_type' => $entityType,
            ':entity_id' => $entityId,
            ':metadata' => $metadata === null ? null : json_encode($metadata, JSON_UNESCAPED_UNICODE),
        ]);
    }
}
