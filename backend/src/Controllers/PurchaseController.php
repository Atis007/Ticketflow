<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Config\AppConfig;
use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use App\Services\AuthorizationService;
use App\Services\DeviceLogService;
use App\Services\EmailTemplateService;
use App\Services\EventSeatService;
use App\Services\IpsQrService;
use App\Services\MailService;
use App\Services\NotificationService;
use DateTimeImmutable;
use Exception;
use PDO;
use Throwable;

final class PurchaseController
{
    /**
     * Simulates a payment flow and persists records like a real purchase.
     */
    public function simulate(Request $request, array $params = []): void
    {
        $payload = AuthMiddleware::authenticatedPayload($request);
        $userId = (int) ($payload['id'] ?? 0);
        $sessionId = (int) ($payload['session_id'] ?? 0);

        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $body = $request->jsonBody();
        $eventId = (int) ($body['eventId'] ?? 0);
        $quantity = (int) ($body['quantity'] ?? 1);
        $simulateOutcome = strtolower(trim((string) ($body['simulateOutcome'] ?? 'success')));
        $currency = strtoupper(trim((string) ($body['currency'] ?? 'RSD')));
        $idempotencyKey = isset($body['idempotencyKey']) ? trim((string) $body['idempotencyKey']) : null;
        $requestedSeatIds = isset($body['seatIds']) && is_array($body['seatIds']) ? array_map('intval', $body['seatIds']) : null;
        if ($idempotencyKey === '') {
            $idempotencyKey = null;
        }

        if ($eventId <= 0) {
            Json::error('eventId is required', 400);
        }

        if ($quantity <= 0 || $quantity > 20) {
            Json::error('quantity must be between 1 and 20', 400);
        }

        if (!in_array($simulateOutcome, ['success', 'failed', 'cancelled'], true)) {
            Json::error('simulateOutcome must be one of: success, failed, cancelled', 400);
        }

        $pdo = Database::getConnection();
        $deviceLogService = new DeviceLogService();

        // Verify user account is active and not disabled
        (new AuthorizationService())->assertAccountActive($pdo, $userId);

        // Idempotency check — outside transaction
        if ($idempotencyKey !== null) {
            $idemStmt = $pdo->prepare(
                'SELECT id, status, amount, currency FROM payments WHERE idempotency_key = :key LIMIT 1'
            );
            $idemStmt->execute([':key' => $idempotencyKey]);
            $existing = $idemStmt->fetch(PDO::FETCH_ASSOC);

            if (is_array($existing) && (string) ($existing['status'] ?? '') === 'paid') {
                $ticketStmt = $pdo->prepare('SELECT id FROM tickets WHERE payment_id = :pid ORDER BY id ASC');
                $ticketStmt->execute([':pid' => $existing['id']]);
                $cachedTicketIds = array_column($ticketStmt->fetchAll(PDO::FETCH_ASSOC), 'id');

                Json::success([
                    'message'         => 'Purchase simulated successfully',
                    'payment'         => [
                        'id'       => (int) $existing['id'],
                        'status'   => 'paid',
                        'amount'   => (float) $existing['amount'],
                        'currency' => (string) $existing['currency'],
                    ],
                    'tickets'         => array_map('intval', $cachedTicketIds),
                    'simulateOutcome' => 'success',
                ], 201);
            }
        }

        try {
            $pdo->beginTransaction();

            $eventStmt = $pdo->prepare(
                'SELECT id, title, slug, price, is_free, is_active, is_seated, capacity, tickets_sold, starts_at, venue
                 FROM events
                 WHERE id = :id
                 LIMIT 1
                 FOR UPDATE'
            );
            $eventStmt->execute([':id' => $eventId]);
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($event)) {
                $pdo->rollBack();
                Json::error('Event not found', 404);
            }

            if ((bool) ($event['is_active'] ?? false) !== true) {
                $pdo->rollBack();
                Json::error('Event is not active', 400);
            }

            if ((bool) ($event['is_free'] ?? false) === true) {
                $pdo->rollBack();
                Json::error('Free events are ticketless and do not use purchase flow', 400);
            }

            $price = (float) ($event['price'] ?? 0);
            if ($price <= 0) {
                $pdo->rollBack();
                Json::error('Event price is invalid for paid flow', 400);
            }

            $isSeated = (bool) ($event['is_seated'] ?? false);
            $capacity = $event['capacity'] !== null ? (int) $event['capacity'] : null;
            $ticketsSold = (int) ($event['tickets_sold'] ?? 0);

            if ($simulateOutcome === 'success' && $capacity !== null && ($ticketsSold + $quantity) > $capacity) {
                $pdo->rollBack();
                Json::error('Not enough capacity for requested quantity', 409);
            }

            $amount = round($price * $quantity, 2);

            // INSERT payment with status='pending'
            $paymentStmt = $pdo->prepare(
                'INSERT INTO payments (user_id, event_id, amount, currency, status, ips_qr_payload, paid_at, idempotency_key)
                 VALUES (:user_id, :event_id, :amount, :currency, :status, :payload, NULL, :idem_key)
                 RETURNING id'
            );
            $paymentStmt->execute([
                ':user_id'  => $userId,
                ':event_id' => $eventId,
                ':amount'   => $amount,
                ':currency' => $currency,
                ':status'   => 'pending',
                ':payload'  => '',
                ':idem_key' => $idempotencyKey,
            ]);
            $paymentId = (int) $paymentStmt->fetchColumn();

            // Build real IPS QR payload now that we have paymentId
            $config = AppConfig::all();
            $merchantAccount = (string) ($config['ips']['merchant_account'] ?? '160000000000000000');
            $merchantName = (string) ($config['ips']['merchant_name'] ?? 'Ticketflow d.o.o.');
            $ipsPayload = (new IpsQrService())->buildPayload(
                $paymentId,
                $amount,
                $currency,
                (string) ($event['title'] ?? ''),
                $merchantAccount,
                $merchantName
            );

            $pdo->prepare('UPDATE payments SET ips_qr_payload = :payload WHERE id = :id')
                ->execute([':payload' => $ipsPayload, ':id' => $paymentId]);

            $ticketIds = [];
            $seatIds = [];

            if ($simulateOutcome === 'success') {
                // Reserve seats for seated events
                if ($isSeated) {
                    $seatService = new EventSeatService();
                    if ($requestedSeatIds !== null && $requestedSeatIds !== []) {
                        // User-selected specific seats
                        $seatIds = $seatService->reserveSpecificSeats($pdo, $eventId, $requestedSeatIds, $userId);
                        if (count($seatIds) < count($requestedSeatIds)) {
                            $pdo->rollBack();
                            Json::error('Some selected seats are no longer available', 409);
                        }
                        $quantity = count($seatIds);
                    } else {
                        // Auto-assign seats
                        $seatIds = $seatService->reserveAvailableSeats($pdo, $eventId, $quantity);
                        if (count($seatIds) < $quantity) {
                            $pdo->rollBack();
                            Json::error('Not enough seats available', 409);
                        }
                    }
                }

                // Transition payment pending → paid BEFORE creating tickets
                // (DB trigger enforce_ticket_rules requires payment to be paid)
                $pdo->prepare("UPDATE payments SET status = 'paid', paid_at = NOW() WHERE id = :id")
                    ->execute([':id' => $paymentId]);

                // Create tickets
                $ticketStmt = $pdo->prepare(
                    'INSERT INTO tickets (user_id, event_id, payment_id, qr_code, is_used)
                     VALUES (:user_id, :event_id, :payment_id, :qr_code, FALSE)
                     RETURNING id'
                );
                for ($i = 0; $i < $quantity; $i++) {
                    $ticketStmt->execute([
                        ':user_id'    => $userId,
                        ':event_id'   => $eventId,
                        ':payment_id' => $paymentId,
                        ':qr_code'    => $this->generateQrCode($eventId, $userId, $paymentId),
                    ]);
                    $ticketIds[] = (int) $ticketStmt->fetchColumn();
                }

                // Link seats to tickets
                if ($isSeated && $seatIds !== []) {
                    $seatToTicketMap = [];
                    foreach ($seatIds as $index => $seatId) {
                        $seatToTicketMap[$seatId] = $ticketIds[$index] ?? $ticketIds[0];
                    }
                    (new EventSeatService())->markSeatsSold($pdo, $seatIds, $seatToTicketMap);
                }

                // Increment tickets_sold counter
                $pdo->prepare('UPDATE events SET tickets_sold = tickets_sold + :qty WHERE id = :event_id')
                    ->execute([':qty' => $quantity, ':event_id' => $eventId]);
            } else {
                $finalStatus = $simulateOutcome === 'cancelled' ? 'cancelled' : 'failed';
                $pdo->prepare('UPDATE payments SET status = :status WHERE id = :id')
                    ->execute([':status' => $finalStatus, ':id' => $paymentId]);
            }

            $pdo->commit();

            // Create purchase_success notification — failure must not fail the purchase response
            if ($simulateOutcome === 'success' && $ticketIds !== []) {
                try {
                    $catStmt = $pdo->prepare(
                        'SELECT c.slug AS category_slug
                         FROM events e
                         INNER JOIN categories c ON c.id = e.category_id
                         WHERE e.id = :id
                         LIMIT 1'
                    );
                    $catStmt->execute([':id' => $eventId]);
                    $catRow = $catStmt->fetch(PDO::FETCH_ASSOC);

                    NotificationService::create($pdo, $userId, 'purchase_success', [
                        'event_title'   => (string) ($event['title'] ?? ''),
                        'event_id'      => $eventId,
                        'purchase_id'   => $paymentId,
                        'ticket_count'  => count($ticketIds),
                        'category_slug' => is_array($catRow) ? (string) ($catRow['category_slug'] ?? '') : '',
                        'event_slug'    => (string) ($event['slug'] ?? ''),
                    ]);
                } catch (Throwable $e) {
                    Logger::error('Purchase notification failed: ' . $e->getMessage());
                }
            }

            // Send ticket email — failure must not fail the purchase response
            if ($simulateOutcome === 'success' && $ticketIds !== []) {
                try {
                    $userStmt = $pdo->prepare('SELECT email, fullname FROM users WHERE id = :id LIMIT 1');
                    $userStmt->execute([':id' => $userId]);
                    $userData = $userStmt->fetch(PDO::FETCH_ASSOC);

                    if (is_array($userData)) {
                        $qrCodes = $this->getAllQrCodes($pdo, $ticketIds);
                        $template = (new EmailTemplateService())->multiTicketDeliveryEmail(
                            fullName: (string) ($userData['fullname'] ?? ''),
                            eventTitle: (string) ($event['title'] ?? ''),
                            startsAtLabel: $this->formatEventDateForEmail($event),
                            venue: (string) ($event['venue'] ?? ''),
                            qrCodes: $qrCodes,
                            ipsQrPayload: $ipsPayload,
                        );
                        (new MailService())->send(
                            to: (string) ($userData['email'] ?? ''),
                            subject: $template['subject'],
                            html: $template['html'],
                            text: $template['text'],
                        );
                    }
                } catch (Throwable $e) {
                    Logger::error('Ticket email failed: ' . $e->getMessage());
                }
            }

            $finalStatus = $simulateOutcome === 'success'
                ? 'paid'
                : ($simulateOutcome === 'cancelled' ? 'cancelled' : 'failed');

            $action = $simulateOutcome === 'success'
                ? 'purchase.paid.success'
                : ($simulateOutcome === 'cancelled' ? 'purchase.cancelled' : 'purchase.failed');

            $deviceLogService->logPurchaseEvent(
                $pdo,
                $request,
                $action,
                $simulateOutcome === 'success' ? 'success' : 'failed',
                $userId,
                $sessionId > 0 ? $sessionId : null,
                $eventId,
                $paymentId,
                [
                    'amount'           => $amount,
                    'currency'         => $currency,
                    'quantity'         => $quantity,
                    'ticket_ids'       => $ticketIds,
                    'simulate_outcome' => $simulateOutcome,
                ]
            );

            Json::success([
                'message'         => $simulateOutcome === 'success'
                    ? 'Purchase simulated successfully'
                    : 'Purchase simulated as non-success',
                'payment'         => [
                    'id'           => $paymentId,
                    'status'       => $finalStatus,
                    'amount'       => $amount,
                    'currency'     => $currency,
                    'ipsQrPayload' => $simulateOutcome === 'success' ? $ipsPayload : null,
                ],
                'tickets'         => $ticketIds,
                'simulateOutcome' => $simulateOutcome,
            ], 201);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            Logger::error('Failed to simulate purchase: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    private function generateQrCode(int $eventId, int $userId, int $paymentId): string
    {
        return rtrim(
            strtr(
                base64_encode(
                    hash('sha256', $eventId . ':' . $userId . ':' . $paymentId . ':' . microtime(true) . ':' . random_bytes(12), true)
                ),
                '+/',
                '-_'
            ),
            '='
        );
    }

    private function formatEventDateForEmail(array $event): string
    {
        $startsAt = $event['starts_at'] ?? null;
        if ($startsAt === null) {
            return 'Date TBA';
        }
        try {
            return (new DateTimeImmutable((string) $startsAt))->format('D, d M Y H:i');
        } catch (Exception) {
            return (string) $startsAt;
        }
    }

    private function getFirstQrCode(PDO $pdo, int $ticketId): string
    {
        $stmt = $pdo->prepare('SELECT qr_code FROM tickets WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $ticketId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return is_array($row) ? (string) ($row['qr_code'] ?? '') : '';
    }

    /**
     * @param int[] $ticketIds
     * @return string[]
     */
    private function getAllQrCodes(PDO $pdo, array $ticketIds): array
    {
        if ($ticketIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($ticketIds), '?'));
        $stmt = $pdo->prepare("SELECT qr_code FROM tickets WHERE id IN ({$placeholders}) ORDER BY id ASC");
        $stmt->execute($ticketIds);

        return array_map(fn($row) => (string) ($row['qr_code'] ?? ''), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}
