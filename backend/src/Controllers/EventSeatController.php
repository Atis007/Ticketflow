<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use Exception;
use PDO;

final class EventSeatController
{
    /**
     * Returns seat availability for an event.
     * Public — no authentication required.
     */
    public function index(Request $request, array $params = []): void
    {
        $eventId = (int) ($params['id'] ?? 0);
        if ($eventId <= 0) {
            Json::error('Invalid event id', 400);
        }

        try {
            $pdo = Database::getConnection();

            $eventStmt = $pdo->prepare(
                'SELECT id, capacity, is_seated
                 FROM events
                 WHERE id = :id AND is_active = TRUE
                 LIMIT 1'
            );
            $eventStmt->bindValue(':id', $eventId, PDO::PARAM_INT);
            $eventStmt->execute();
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($event)) {
                Json::error('Event not found', 404);
            }

            $capacity = $event['capacity'] !== null ? (int) $event['capacity'] : 0;
            $isSeated = (bool) $event['is_seated'];

            if (!$isSeated) {
                Json::success([
                    'isSeated' => false,
                    'seats'    => [],
                    'summary'  => ['total' => $capacity],
                ]);
            }

            $seatStmt = $pdo->prepare(
                'SELECT id, row_label AS rowLabel, seat_number AS seatNumber, status
                 FROM event_seats
                 WHERE event_id = :event_id
                 ORDER BY seat_number ASC'
            );
            $seatStmt->bindValue(':event_id', $eventId, PDO::PARAM_INT);
            $seatStmt->execute();
            $seats = $seatStmt->fetchAll(PDO::FETCH_ASSOC);

            $available = 0;
            $sold = 0;
            foreach ($seats as $seat) {
                if ($seat['status'] === 'available') {
                    $available++;
                } else {
                    $sold++;
                }
            }

            Json::success([
                'isSeated' => true,
                'seats'    => $seats,
                'summary'  => [
                    'available' => $available,
                    'sold'      => $sold,
                    'total'     => $available + $sold,
                ],
            ]);
        } catch (Exception $e) {
            Logger::error('Failed to fetch event seats: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }
}
