<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

final class EventSeatService
{
    /**
     * Generates GA seats for a seated event.
     * Safe to re-call on capacity changes — uses ON CONFLICT DO NOTHING.
     */
    public function generateSeats(PDO $pdo, int $eventId, int $capacity): void
    {
        if ($capacity <= 0) {
            return;
        }

        $stmt = $pdo->prepare(
            'INSERT INTO event_seats (event_id, row_label, seat_label, position_x, position_y)
             VALUES (:event_id, :row_label, :seat_label, :pos_x, :pos_y)
             ON CONFLICT DO NOTHING'
        );

        for ($i = 1; $i <= $capacity; $i++) {
            $stmt->execute([
                ':event_id'    => $eventId,
                ':row_label'   => 'GA',
                ':seat_label'  => (string) $i,
                ':pos_x'       => $i,
                ':pos_y'       => 0,
            ]);
        }
    }

    /**
     * Generates seats from a sectored layout JSON.
     * Expected format: {sections: [{name, section_id, rows: [{label, seatCount}]}]}
     *
     * @param array{sections: array<int, array{name: string, rows: array<int, array{label: string, seatCount: int}>}>} $layout
     */
    public function generateFromLayout(PDO $pdo, int $eventId, array $layout): void
    {
        $sections = $layout['sections'] ?? [];
        if ($sections === []) {
            return;
        }

        $stmt = $pdo->prepare(
            'INSERT INTO event_seats (event_id, section_id, row_label, seat_label, position_x, position_y)
             VALUES (:event_id, :section_id, :row_label, :seat_label, :pos_x, :pos_y)
             ON CONFLICT DO NOTHING'
        );

        $rowY = 0;
        foreach ($sections as $section) {
            $sectionId = $section['section_id'] ?? null;
            $rows = $section['rows'] ?? [];

            foreach ($rows as $row) {
                $rowLabel = (string) ($row['label'] ?? 'GA');
                $seatCount = (int) ($row['seatCount'] ?? $row['seat_count'] ?? 0);

                for ($i = 1; $i <= $seatCount; $i++) {
                    $stmt->execute([
                        ':event_id'    => $eventId,
                        ':section_id'  => $sectionId,
                        ':row_label'   => $rowLabel,
                        ':seat_label'  => (string) $i,
                        ':pos_x'       => $i,
                        ':pos_y'       => $rowY,
                    ]);
                }
                $rowY++;
            }
        }
    }

    /**
     * Reserves specific seats by ID for a user.
     * Must be called inside an active transaction.
     *
     * @param int[] $seatIds
     * @return int[] Seat IDs successfully reserved
     */
    public function reserveSpecificSeats(PDO $pdo, int $eventId, array $seatIds, int $userId, int $timeoutMinutes = 10): array
    {
        if ($seatIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($seatIds), '?'));
        $params = $seatIds;
        $params[] = $eventId;

        $stmt = $pdo->prepare(
            "SELECT id FROM event_seats
             WHERE id IN ({$placeholders})
               AND event_id = ?
               AND (status = 'available' OR (status = 'locked' AND locked_at < NOW() - INTERVAL '{$timeoutMinutes} minutes'))
             FOR UPDATE SKIP LOCKED"
        );
        $stmt->execute($params);
        $available = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'id');

        if ($available === []) {
            return [];
        }

        $updatePlaceholders = implode(',', array_fill(0, count($available), '?'));
        $updateStmt = $pdo->prepare(
            "UPDATE event_seats
             SET status = 'locked',
                 reserved_by = ?,
                 locked_at = NOW()
             WHERE id IN ({$updatePlaceholders})"
        );
        $updateStmt->execute(array_merge([$userId], $available));

        return $available;
    }

    /**
     * Releases expired seat reservations back to available.
     */
    public function releaseExpiredReservations(PDO $pdo, int $timeoutMinutes = 10): int
    {
        $stmt = $pdo->prepare(
            "UPDATE event_seats
             SET status = 'available', reserved_by = NULL, locked_at = NULL
             WHERE status = 'locked' AND locked_at < NOW() - make_interval(mins => :timeout)"
        );
        $stmt->bindValue(':timeout', $timeoutMinutes, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount();
    }

    /**
     * Reserves available seats using FOR UPDATE SKIP LOCKED.
     * Must be called inside an active transaction.
     *
     * @return int[] Seat IDs reserved (may be fewer than $quantity if capacity is exhausted)
     */
    public function reserveAvailableSeats(PDO $pdo, int $eventId, int $quantity): array
    {
        $stmt = $pdo->prepare(
            'SELECT id
             FROM event_seats
             WHERE event_id = :event_id
               AND status = \'available\'
             ORDER BY seat_label ASC
             LIMIT :quantity
             FOR UPDATE SKIP LOCKED'
        );
        $stmt->bindValue(':event_id', $eventId, PDO::PARAM_INT);
        $stmt->bindValue(':quantity', $quantity, PDO::PARAM_INT);
        $stmt->execute();

        return array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'id');
    }

    /**
     * Marks seats as sold and links them to tickets.
     *
     * @param int[] $seatIds
     * @param array<int, int> $seatToTicketMap seat_id => ticket_id
     */
    public function markSeatsSold(PDO $pdo, array $seatIds, array $seatToTicketMap): void
    {
        $stmt = $pdo->prepare(
            "UPDATE event_seats
             SET status = 'sold', ticket_id = :ticket_id
             WHERE id = :seat_id"
        );

        foreach ($seatIds as $seatId) {
            $ticketId = $seatToTicketMap[$seatId] ?? null;
            if ($ticketId === null) {
                continue;
            }
            $stmt->execute([
                ':ticket_id' => $ticketId,
                ':seat_id'   => $seatId,
            ]);
        }
    }
}
