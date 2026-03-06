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
            'INSERT INTO event_seats (event_id, row_label, seat_number)
             VALUES (:event_id, :row_label, :seat_number)
             ON CONFLICT (event_id, row_label, seat_number) DO NOTHING'
        );

        for ($i = 1; $i <= $capacity; $i++) {
            $stmt->execute([
                ':event_id'    => $eventId,
                ':row_label'   => 'GA',
                ':seat_number' => $i,
            ]);
        }
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
             ORDER BY seat_number ASC
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
            'UPDATE event_seats
             SET status = \'sold\', ticket_id = :ticket_id, updated_at = NOW()
             WHERE id = :seat_id'
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
