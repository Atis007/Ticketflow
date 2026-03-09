<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use PDO;
use Throwable;

final class TicketController
{
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
}
