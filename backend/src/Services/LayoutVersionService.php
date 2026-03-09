<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

final class LayoutVersionService
{
    /**
     * Saves a new layout version for an event.
     *
     * @param array<string, mixed> $layoutJson
     * @param array<string, mixed>|null $diffJson
     */
    public function save(
        PDO $pdo,
        int $eventId,
        array $layoutJson,
        ?array $diffJson = null,
        string $generatedBy = 'ai'
    ): int {
        // Get next version number
        $stmt = $pdo->prepare(
            'SELECT COALESCE(MAX(version_number), 0) + 1
             FROM layout_versions
             WHERE event_id = :event_id'
        );
        $stmt->execute([':event_id' => $eventId]);
        $nextVersion = (int) $stmt->fetchColumn();

        $insertStmt = $pdo->prepare(
            'INSERT INTO layout_versions (event_id, version_number, layout_json, diff_json, generated_by)
             VALUES (:event_id, :version, :layout, :diff, :generated_by)
             RETURNING id'
        );
        $insertStmt->execute([
            ':event_id'     => $eventId,
            ':version'      => $nextVersion,
            ':layout'       => json_encode($layoutJson, JSON_UNESCAPED_UNICODE),
            ':diff'         => $diffJson !== null ? json_encode($diffJson, JSON_UNESCAPED_UNICODE) : null,
            ':generated_by' => $generatedBy,
        ]);

        return (int) $insertStmt->fetchColumn();
    }

    /**
     * Returns all versions for an event, newest first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listVersions(PDO $pdo, int $eventId): array
    {
        $stmt = $pdo->prepare(
            'SELECT id, version_number, generated_by, created_at
             FROM layout_versions
             WHERE event_id = :event_id
             ORDER BY version_number DESC'
        );
        $stmt->execute([':event_id' => $eventId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
