<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

final class EventSectionService
{
    /**
     * Type mapping from AI layout section types to DB enum values.
     * event_sections.type enum is 'seated' | 'standing'
     */
    private const TYPE_MAP = [
        'standard' => 'seated',
        'vip' => 'seated',
        'balcony' => 'seated',
        'standing' => 'standing',
        'seated' => 'seated',
    ];

    /**
     * Creates event_sections rows from layout sections array.
     * Returns sections with their DB-assigned IDs (section_id).
     *
     * @param array<int, array<string, mixed>> $sections
     * @return array<int, array<string, mixed>>
     */
    public function createSectionsFromLayout(PDO $pdo, int $eventId, array $sections): array
    {
        $stmt = $pdo->prepare(
            'INSERT INTO event_sections (event_id, name, type, capacity, price, x_position, y_position, source)
             VALUES (:event_id, :name, :type, :capacity, :price, :x_pos, :y_pos, :source)
             RETURNING id'
        );

        $sectionsWithIds = [];
        foreach ($sections as $i => $section) {
            $rawType = strtolower((string) ($section['type'] ?? 'seated'));
            $dbType = self::TYPE_MAP[$rawType] ?? 'seated';
            $sectionCapacity = 0;
            foreach (($section['rows'] ?? []) as $row) {
                $sectionCapacity += (int) ($row['seat_count'] ?? $row['seatCount'] ?? 0);
            }

            $stmt->execute([
                ':event_id'  => $eventId,
                ':name'      => $section['name'] ?? 'Section ' . ($i + 1),
                ':type'      => $dbType,
                ':capacity'  => $sectionCapacity > 0 ? $sectionCapacity : 1,
                ':price'     => 0,
                ':x_pos'     => 0,
                ':y_pos'     => $i,
                ':source'    => 'ai',
            ]);
            $sectionId = (int) $stmt->fetchColumn();
            $section['section_id'] = $sectionId;
            $sectionsWithIds[] = $section;
        }

        return $sectionsWithIds;
    }
}
