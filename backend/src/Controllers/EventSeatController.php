<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use App\Services\EventSeatService;
use Exception;
use PDO;
use Throwable;

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
                'SELECT es.id, es.section_id AS "sectionId", sec.name AS "sectionName",
                        es.row_label AS "rowLabel", es.seat_label AS "seatNumber", es.status
                 FROM event_seats es
                 LEFT JOIN event_sections sec ON sec.id = es.section_id
                 WHERE es.event_id = :event_id
                 ORDER BY sec.y_position ASC, es.position_y ASC, es.position_x ASC'
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

    /**
     * Reserves specific seats for a user.
     * POST /api/events/{id}/seats/reserve
     * Body: {seatIds: [1, 2, 3]}
     */
    public function reserve(Request $request, array $params = []): void
    {
        $eventId = (int) ($params['id'] ?? 0);
        if ($eventId <= 0) {
            Json::error('Invalid event id', 400);
        }

        $payload = AuthMiddleware::authenticatedPayload($request);
        $userId = (int) ($payload['id'] ?? 0);
        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $body = $request->jsonBody();
        $seatIds = $body['seatIds'] ?? [];
        if (!is_array($seatIds) || $seatIds === []) {
            Json::error('seatIds array is required', 400);
        }

        $seatIds = array_map('intval', $seatIds);
        if (count($seatIds) > 20) {
            Json::error('Cannot reserve more than 20 seats at once', 400);
        }

        $pdo = Database::getConnection();

        try {
            // Verify event exists and is seated
            $eventStmt = $pdo->prepare(
                'SELECT id, is_seated, is_active FROM events WHERE id = :id LIMIT 1'
            );
            $eventStmt->execute([':id' => $eventId]);
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($event)) {
                Json::error('Event not found', 404);
            }
            if (!(bool) ($event['is_active'] ?? false)) {
                Json::error('Event is not active', 400);
            }
            if (!(bool) ($event['is_seated'] ?? false)) {
                Json::error('Event is not a seated event', 400);
            }

            $pdo->beginTransaction();

            $seatService = new EventSeatService();
            $reserved = $seatService->reserveSpecificSeats($pdo, $eventId, $seatIds, $userId);

            if (count($reserved) < count($seatIds)) {
                $pdo->rollBack();
                Json::error('Some seats are no longer available', 409);
            }

            $pdo->commit();

            Json::success([
                'reserved' => $reserved,
                'expiresInMinutes' => 10,
                'message' => 'Seats reserved successfully',
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            Logger::error('Seat reservation failed: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }
}
