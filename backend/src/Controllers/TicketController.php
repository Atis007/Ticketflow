<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use PDO;
use Throwable;

final class TicketController
{
    /**
     * Lists active tickets for the authenticated user.
     * GET /api/tickets
     * Active = not used AND event hasn't started yet.
     */
    public function index(Request $request, array $params = []): void
    {
        $userId = (int) (AuthMiddleware::authenticatedPayload($request)['id'] ?? 0);
        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $pdo = Database::getConnection();

        try {
            $stmt = $pdo->prepare(
                "SELECT
                    t.id,
                    t.qr_code,
                    t.is_used,
                    t.payment_id,
                    e.id        AS event_id,
                    e.title     AS event_title,
                    e.starts_at,
                    e.venue,
                    e.image
                 FROM tickets t
                 INNER JOIN events e ON e.id = t.event_id
                 WHERE t.user_id = :uid
                   AND t.is_used = FALSE
                   AND e.starts_at > NOW()
                 ORDER BY e.starts_at ASC"
            );
            $stmt->execute([':uid' => $userId]);

            Json::success($this->formatTickets($stmt->fetchAll(PDO::FETCH_ASSOC)));
        } catch (Throwable $e) {
            Logger::error('Failed to fetch tickets: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Lists archive tickets for the authenticated user.
     * GET /api/tickets/archive
     * Archive = used OR event has already started.
     */
    public function archive(Request $request, array $params = []): void
    {
        $userId = (int) (AuthMiddleware::authenticatedPayload($request)['id'] ?? 0);
        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $pdo = Database::getConnection();

        try {
            $stmt = $pdo->prepare(
                "SELECT
                    t.id,
                    t.qr_code,
                    t.is_used,
                    t.payment_id,
                    e.id        AS event_id,
                    e.title     AS event_title,
                    e.starts_at,
                    e.venue,
                    e.image
                 FROM tickets t
                 INNER JOIN events e ON e.id = t.event_id
                 WHERE t.user_id = :uid
                   AND (t.is_used = TRUE OR e.starts_at <= NOW())
                 ORDER BY e.starts_at DESC"
            );
            $stmt->execute([':uid' => $userId]);

            Json::success($this->formatTickets($stmt->fetchAll(PDO::FETCH_ASSOC)));
        } catch (Throwable $e) {
            Logger::error('Failed to fetch ticket archive: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Returns a single ticket by ID (must belong to authenticated user).
     * GET /api/tickets/{id}
     */
    public function show(Request $request, array $params = []): void
    {
        $ticketId = (int) ($params['id'] ?? 0);
        if ($ticketId <= 0) {
            Json::error('Invalid ticket id', 400);
        }

        $userId = (int) (AuthMiddleware::authenticatedPayload($request)['id'] ?? 0);
        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $pdo = Database::getConnection();

        try {
            $stmt = $pdo->prepare(
                "SELECT
                    t.id,
                    t.qr_code,
                    t.is_used,
                    t.payment_id,
                    e.id        AS event_id,
                    e.title     AS event_title,
                    e.starts_at,
                    e.venue,
                    e.image
                 FROM tickets t
                 INNER JOIN events e ON e.id = t.event_id
                 WHERE t.id = :id AND t.user_id = :uid
                 LIMIT 1"
            );
            $stmt->execute([':id' => $ticketId, ':uid' => $userId]);
            $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($ticket)) {
                Json::error('Ticket not found', 404);
            }

            Json::success($this->formatTicket($ticket));
        } catch (Throwable $e) {
            Logger::error('Failed to fetch ticket: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Scans a ticket QR code and marks it as used.
     * POST /api/tickets/scan
     * Body: {qrCode: "..."}
     */
    public function scan(Request $request, array $params = []): void
    {
        $body = $request->jsonBody();
        $qrCode = trim((string) ($body['qrCode'] ?? ''));

        if ($qrCode === '') {
            Json::error('qrCode is required', 400);
        }

        $pdo = Database::getConnection();

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare(
                'SELECT t.id, t.event_id, t.user_id, t.is_used,
                        e.title AS event_title
                 FROM tickets t
                 INNER JOIN events e ON e.id = t.event_id
                 WHERE t.qr_code = :qr_code
                 LIMIT 1
                 FOR UPDATE'
            );
            $stmt->execute([':qr_code' => $qrCode]);
            $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($ticket)) {
                $pdo->rollBack();
                Json::error('Ticket not found', 404);
            }

            if ((bool) ($ticket['is_used'] ?? false)) {
                $pdo->rollBack();
                Json::error('Ticket has already been used', 409);
            }

            $pdo->prepare('UPDATE tickets SET is_used = TRUE WHERE id = :id')
                ->execute([':id' => $ticket['id']]);

            $pdo->commit();

            Json::success([
                'ticketId' => (int) $ticket['id'],
                'eventId' => (int) $ticket['event_id'],
                'eventTitle' => (string) ($ticket['event_title'] ?? ''),
                'message' => 'Ticket checked in successfully',
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            Logger::error('Ticket scan failed: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /** @param array<int, array<string, mixed>> $rows */
    private function formatTickets(array $rows): array
    {
        return array_map($this->formatTicket(...), $rows);
    }

    /** @param array<string, mixed> $row */
    private function formatTicket(array $row): array
    {
        return [
            'id'         => (int) ($row['id'] ?? 0),
            'qrCode'     => (string) ($row['qr_code'] ?? ''),
            'isUsed'     => (bool) ($row['is_used'] ?? false),
            'paymentId'  => (int) ($row['payment_id'] ?? 0),
            'eventId'    => (int) ($row['event_id'] ?? 0),
            'eventTitle' => (string) ($row['event_title'] ?? ''),
            'startsAt'   => (string) ($row['starts_at'] ?? ''),
            'venue'      => (string) ($row['venue'] ?? ''),
            'image'      => (string) ($row['image'] ?? ''),
        ];
    }
}
