<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\RequestContext;
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
        $finalMetadata = $this->withCanonicalContext($metadata);

        $stmt = $pdo->prepare(
            'INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, metadata)
             VALUES (:admin_id, :action, :entity_type, :entity_id, :metadata)'
        );

        $stmt->execute([
            ':admin_id' => $adminId,
            ':action' => $action,
            ':entity_type' => $entityType,
            ':entity_id' => $entityId,
            ':metadata' => $finalMetadata === null ? null : json_encode($finalMetadata, JSON_UNESCAPED_UNICODE),
        ]);
    }

    /**
     * @param array<string, mixed>|null $metadata
     *
     * @return array<string, mixed>|null
     */
    private function withCanonicalContext(?array $metadata): ?array
    {
        $base = $metadata ?? [];

        $context = RequestContext::current();
        if ($context !== null) {
            $base['request_id'] = $base['request_id'] ?? $context->requestId;
            $base['request_path'] = $base['request_path'] ?? $context->path;
            $base['request_method'] = $base['request_method'] ?? $context->method;
            $base['duration_ms'] = $base['duration_ms'] ?? $context->durationMs();
        }

        $base['source'] = $base['source'] ?? 'backend';
        $base['outcome'] = $base['outcome'] ?? 'success';
        $base['app_env'] = $base['app_env'] ?? (string) ($_ENV['APP_ENV'] ?? 'unknown');
        $base['app_region'] = $base['app_region'] ?? (string) ($_ENV['APP_REGION'] ?? 'unknown');
        $base['app_version'] = $base['app_version'] ?? (string) ($_ENV['APP_VERSION'] ?? 'unknown');
        $base['app_commit_hash'] = $base['app_commit_hash'] ?? (string) ($_ENV['APP_COMMIT_HASH'] ?? 'unknown');

        return $base === [] ? null : $base;
    }
}
