<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use App\Services\AuthorizationService;
use PDO;
use Throwable;

final class MobileController
{
    /**
     * Registers a push token for the authenticated user.
     * POST /api/push-tokens
     * Body: { token: string, platform: "ios"|"android" }
     */
    public function registerPushToken(Request $request, array $params = []): void
    {
        $actorId = (int) (AuthMiddleware::authenticatedPayload($request)['id'] ?? 0);
        if ($actorId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $body     = $request->jsonBody();
        $token    = trim((string) ($body['token'] ?? ''));
        $platform = (string) ($body['platform'] ?? '');

        if ($token === '') {
            Json::error('token is required', 400);
        }

        if (!in_array($platform, ['ios', 'android'], true)) {
            Json::error('platform must be "ios" or "android"', 400);
        }

        $pdo = Database::getConnection();

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO push_tokens (user_id, token, platform)
                 VALUES (:uid, :token, :platform)
                 ON CONFLICT (token) DO NOTHING
                 RETURNING id, token, platform'
            );
            $stmt->execute([':uid' => $actorId, ':token' => $token, ':platform' => $platform]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($row)) {
                // Conflict — token already exists; return existing row
                $stmt2 = $pdo->prepare(
                    'SELECT id, token, platform FROM push_tokens WHERE token = :token LIMIT 1'
                );
                $stmt2->execute([':token' => $token]);
                $row = $stmt2->fetch(PDO::FETCH_ASSOC);
            }

            Json::success([
                'id'       => (int) ($row['id'] ?? 0),
                'token'    => (string) ($row['token'] ?? ''),
                'platform' => (string) ($row['platform'] ?? ''),
            ]);
        } catch (Throwable $e) {
            Logger::error('Failed to register push token: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Removes a push token by ID (must belong to authenticated user).
     * DELETE /api/push-tokens/{id}
     */
    public function deletePushToken(Request $request, array $params = []): void
    {
        $id = (int) ($params['id'] ?? 0);
        if ($id <= 0) {
            Json::error('Invalid push token id', 400);
        }

        $actorId = (int) (AuthMiddleware::authenticatedPayload($request)['id'] ?? 0);
        if ($actorId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $pdo = Database::getConnection();

        try {
            $stmt = $pdo->prepare('DELETE FROM push_tokens WHERE id = :id AND user_id = :uid');
            $stmt->execute([':id' => $id, ':uid' => $actorId]);

            if ($stmt->rowCount() === 0) {
                Json::error('Push token not found', 404);
            }

            Json::success(['message' => 'Push token removed']);
        } catch (Throwable $e) {
            Logger::error('Failed to delete push token: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Downloads offline check-in ticket cache for an event.
     * GET /api/checkin/event/{id}/tickets
     * Caller must be the event owner or an admin.
     */
    public function checkinTickets(Request $request, array $params = []): void
    {
        $eventId = (int) ($params['id'] ?? 0);
        if ($eventId <= 0) {
            Json::error('Invalid event id', 400);
        }

        $payload   = AuthMiddleware::authenticatedPayload($request);
        $actorId   = (int) ($payload['id'] ?? 0);
        $actorRole = $payload['role'] ?? null;

        if ($actorId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $pdo = Database::getConnection();

        try {
            $evtStmt = $pdo->prepare('SELECT id, created_by FROM events WHERE id = :id LIMIT 1');
            $evtStmt->execute([':id' => $eventId]);
            $event = $evtStmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($event)) {
                Json::error('Event not found', 404);
            }

            (new AuthorizationService())->assertOwnerOrAdmin($actorId, $actorRole, (int) $event['created_by']);

            $stmt = $pdo->prepare(
                'SELECT t.id,
                        t.qr_code,
                        t.is_used,
                        es.seat_label,
                        esec.name AS section_name
                 FROM tickets t
                 INNER JOIN events e ON e.id = t.event_id
                 LEFT JOIN event_seats es ON es.ticket_id = t.id
                 LEFT JOIN event_sections esec ON esec.id = es.section_id
                 WHERE t.event_id = :event_id
                   AND (e.ends_at IS NULL OR e.ends_at > NOW())
                 ORDER BY t.id ASC'
            );
            $stmt->execute([':event_id' => $eventId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Json::success(array_map(static fn(array $r): array => [
                'id'          => (int) ($r['id'] ?? 0),
                'qrCode'      => (string) ($r['qr_code'] ?? ''),
                'isUsed'      => (bool) ($r['is_used'] ?? false),
                'seatLabel'   => isset($r['seat_label']) ? (string) $r['seat_label'] : null,
                'sectionName' => isset($r['section_name']) ? (string) $r['section_name'] : null,
            ], $rows));
        } catch (Throwable $e) {
            Logger::error('Failed to fetch check-in tickets: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Syncs offline QR scans with LWW conflict resolution.
     * POST /api/checkin/sync
     * Body: array of { ticket_id: int, qr_code: string, scanned_at: ISO8601 }
     */
    public function checkinSync(Request $request, array $params = []): void
    {
        $actorId = (int) (AuthMiddleware::authenticatedPayload($request)['id'] ?? 0);
        if ($actorId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $body = $request->jsonBody();

        if (!is_array($body) || array_is_list($body) === false) {
            Json::error('Request body must be a JSON array', 400);
        }

        if (count($body) === 0) {
            Json::error('Scan array must not be empty', 400);
        }

        if (count($body) > 500) {
            Json::error('Batch size exceeds limit of 500', 400);
        }

        $pdo = Database::getConnection();

        try {
            $pdo->beginTransaction();

            $results = [];

            foreach ($body as $record) {
                $ticketId  = (int) ($record['ticket_id'] ?? 0);
                $qrCode    = (string) ($record['qr_code'] ?? '');
                $scannedAt = (string) ($record['scanned_at'] ?? '');

                if ($ticketId <= 0 || $qrCode === '' || $scannedAt === '') {
                    $results[] = [
                        'ticket_id'  => $ticketId,
                        'resolution' => 'invalid_record',
                    ];
                    continue;
                }

                $stmt = $pdo->prepare(
                    'SELECT id, qr_code, is_used, used_at
                     FROM tickets
                     WHERE id = :tid AND qr_code = :qr
                     FOR UPDATE'
                );
                $stmt->execute([':tid' => $ticketId, ':qr' => $qrCode]);
                $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!is_array($ticket)) {
                    $results[] = [
                        'ticket_id'  => $ticketId,
                        'resolution' => 'not_found',
                    ];
                    continue;
                }

                try {
                    $scannedDt = new \DateTimeImmutable($scannedAt);
                } catch (Throwable) {
                    $results[] = [
                        'ticket_id'  => $ticketId,
                        'is_used'    => (bool) ($ticket['is_used'] ?? false),
                        'used_at'    => $ticket['used_at'] ?? null,
                        'resolution' => 'invalid_timestamp',
                    ];
                    continue;
                }

                $isUsed  = (bool) ($ticket['is_used'] ?? false);
                $usedAt  = $ticket['used_at'] ?? null;
                $doWrite = false;

                if (!$isUsed || $usedAt === null) {
                    $doWrite = true;
                } else {
                    try {
                        $existingDt = new \DateTimeImmutable($usedAt);
                        if ($scannedDt < $existingDt) {
                            $doWrite = true;
                        }
                    } catch (Throwable) {
                        // If existing timestamp is unparseable, overwrite
                        $doWrite = true;
                    }
                }

                if ($doWrite) {
                    $scannedIso = $scannedDt->format(\DateTimeInterface::ATOM);
                    $pdo->prepare(
                        'UPDATE tickets SET is_used = TRUE, used_at = :scanned_at WHERE id = :id'
                    )->execute([':scanned_at' => $scannedIso, ':id' => $ticket['id']]);

                    $results[] = [
                        'ticket_id'  => $ticketId,
                        'is_used'    => true,
                        'used_at'    => $scannedIso,
                        'resolution' => 'accepted',
                    ];
                } else {
                    $results[] = [
                        'ticket_id'  => $ticketId,
                        'is_used'    => true,
                        'used_at'    => $usedAt,
                        'resolution' => 'already_used',
                    ];
                }
            }

            $pdo->commit();

            Json::success(['results' => $results]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            Logger::error('Check-in sync failed: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }
}
