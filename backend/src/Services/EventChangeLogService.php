<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

final class EventChangeLogService
{
    /**
     * @param array<string, mixed> $before
     * @param array<string, mixed> $after
     * @param string[] $fields
     */
    public function logDiff(PDO $pdo, int $eventId, ?int $changedBy, array $before, array $after, array $fields): void
    {
        foreach ($fields as $field) {
            $oldValue = $before[$field] ?? null;
            $newValue = $after[$field] ?? null;

            if ($this->normalize($oldValue) === $this->normalize($newValue)) {
                continue;
            }

            $this->logSingleChange($pdo, $eventId, $changedBy, $field, $oldValue, $newValue);
        }
    }

    public function logSingleChange(PDO $pdo, int $eventId, ?int $changedBy, string $field, mixed $oldValue, mixed $newValue): void
    {
        $stmt = $pdo->prepare(
            'INSERT INTO event_changes (event_id, changed_by, field, old_value, new_value)
             VALUES (:event_id, :changed_by, :field, :old_value, :new_value)'
        );

        $stmt->execute([
            ':event_id' => $eventId,
            ':changed_by' => $changedBy,
            ':field' => $field,
            ':old_value' => $this->toLogValue($oldValue),
            ':new_value' => $this->toLogValue($newValue),
        ]);
    }

    private function normalize(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if ($value === null) {
            return '';
        }

        return trim((string) $value);
    }

    private function toLogValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        return (string) $value;
    }
}
