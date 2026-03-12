<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Config\AppConfig;
use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use App\Services\EmailTemplateService;
use App\Services\EventSeatService;
use App\Services\IpsQrService;
use App\Services\MailService;
use DateTimeImmutable;
use Exception;
use PDO;
use Throwable;

final class PaymentController
{
    /**
     * Initiates a payment — creates a pending payment and generates IPS QR payload.
     * POST /api/payments
     */
    public function initiate(Request $request, array $params = []): void
    {
        $payload = AuthMiddleware::authenticatedPayload($request);
        $userId = (int) ($payload['id'] ?? 0);

        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $body = $request->jsonBody();
        $eventId = (int) ($body['event_id'] ?? 0);
        $currency = strtoupper(trim((string) ($body['currency'] ?? 'RSD')));
        $idempotencyKey = isset($body['idempotency_key']) ? trim((string) $body['idempotency_key']) : null;
        if ($idempotencyKey === '') {
            $idempotencyKey = null;
        }

        $requestedSeatIds = isset($body['seat_ids']) && is_array($body['seat_ids'])
            ? array_map('intval', $body['seat_ids'])
            : null;
        $quantity = $requestedSeatIds === null ? (int) ($body['quantity'] ?? 1) : 0;

        if ($eventId <= 0) {
            Json::error('event_id is required', 400);
        }

        if ($requestedSeatIds === null && ($quantity <= 0 || $quantity > 20)) {
            Json::error('quantity must be between 1 and 20', 400);
        }

        $pdo = Database::getConnection();

        // Idempotency check — outside transaction
        if ($idempotencyKey !== null) {
            $idemStmt = $pdo->prepare(
                'SELECT id, status, amount, currency, ips_qr_payload FROM payments WHERE idempotency_key = :key LIMIT 1'
            );
            $idemStmt->execute([':key' => $idempotencyKey]);
            $existing = $idemStmt->fetch(PDO::FETCH_ASSOC);

            if (is_array($existing)) {
                Json::success([
                    'id'             => (int) $existing['id'],
                    'status'         => (string) $existing['status'],
                    'amount'         => (float) $existing['amount'],
                    'currency'       => (string) $existing['currency'],
                    'ips_qr_payload' => (string) ($existing['ips_qr_payload'] ?? ''),
                ], 200);
            }
        }

        try {
            $pdo->beginTransaction();

            $eventStmt = $pdo->prepare(
                'SELECT id, title, price, is_free, is_active, is_seated, capacity, tickets_sold
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
                Json::error('Free events do not require payment', 400);
            }

            $price = (float) ($event['price'] ?? 0);
            if ($price <= 0) {
                $pdo->rollBack();
                Json::error('Event price is invalid', 400);
            }

            $isSeated = (bool) ($event['is_seated'] ?? false);

            if ($isSeated) {
                if ($requestedSeatIds === null || $requestedSeatIds === []) {
                    $pdo->rollBack();
                    Json::error('seat_ids are required for seated events', 400);
                }

                // Atomically lock available seats — uses FOR UPDATE SKIP LOCKED for concurrency safety
                $lockedSeatIds = (new EventSeatService())->reserveSpecificSeats($pdo, $eventId, $requestedSeatIds, $userId);

                if (count($lockedSeatIds) < count($requestedSeatIds)) {
                    $pdo->rollBack();
                    Json::error('Some selected seats are no longer available', 409);
                }

                $quantity = count($lockedSeatIds);
            } else {
                // GA capacity check
                $capacity = $event['capacity'] !== null ? (int) $event['capacity'] : null;
                $ticketsSold = (int) ($event['tickets_sold'] ?? 0);
                if ($capacity !== null && ($ticketsSold + $quantity) > $capacity) {
                    $pdo->rollBack();
                    Json::error('Not enough capacity for requested quantity', 409);
                }
            }

            $amount = round($price * $quantity, 2);

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

            $pdo->commit();

            Json::success([
                'id'             => $paymentId,
                'status'         => 'pending',
                'amount'         => $amount,
                'currency'       => $currency,
                'ips_qr_payload' => $ipsPayload,
            ], 201);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            Logger::error('Payment initiation failed: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Returns a single payment by ID (must belong to authenticated user).
     * GET /api/payments/{id}
     */
    public function show(Request $request, array $params = []): void
    {
        $paymentId = (int) ($params['id'] ?? 0);
        if ($paymentId <= 0) {
            Json::error('Invalid payment id', 400);
        }

        $payload = AuthMiddleware::authenticatedPayload($request);
        $userId = (int) ($payload['id'] ?? 0);

        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $pdo = Database::getConnection();

        $stmt = $pdo->prepare(
            'SELECT id, event_id, amount, currency, status, ips_qr_payload, paid_at
             FROM payments
             WHERE id = :id AND user_id = :user_id
             LIMIT 1'
        );
        $stmt->execute([':id' => $paymentId, ':user_id' => $userId]);
        $payment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!is_array($payment)) {
            Json::error('Payment not found', 404);
        }

        Json::success([
            'id'             => (int) $payment['id'],
            'event_id'       => (int) $payment['event_id'],
            'amount'         => (float) $payment['amount'],
            'currency'       => (string) $payment['currency'],
            'status'         => (string) $payment['status'],
            'ips_qr_payload' => (string) ($payment['ips_qr_payload'] ?? ''),
            'paid_at'        => $payment['paid_at'],
        ]);
    }

    /**
     * Confirms a pending payment — creates tickets, marks seats sold, sends email.
     * POST /api/payments/{id}/confirm
     */
    public function confirm(Request $request, array $params = []): void
    {
        $paymentId = (int) ($params['id'] ?? 0);
        if ($paymentId <= 0) {
            Json::error('Invalid payment id', 400);
        }

        $payload = AuthMiddleware::authenticatedPayload($request);
        $userId = (int) ($payload['id'] ?? 0);

        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $pdo = Database::getConnection();

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare(
                'SELECT id, user_id, event_id, amount, currency, status, ips_qr_payload
                 FROM payments
                 WHERE id = :id
                 LIMIT 1
                 FOR UPDATE'
            );
            $stmt->execute([':id' => $paymentId]);
            $payment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($payment)) {
                $pdo->rollBack();
                Json::error('Payment not found', 404);
            }

            if ((int) ($payment['user_id'] ?? 0) !== $userId) {
                $pdo->rollBack();
                Json::error('Forbidden', 403);
            }

            $currentStatus = (string) ($payment['status'] ?? '');
            if ($currentStatus === 'paid') {
                $pdo->rollBack();
                Json::success([
                    'id'      => $paymentId,
                    'status'  => 'paid',
                    'message' => 'Payment already confirmed',
                ]);
            }

            if ($currentStatus !== 'pending') {
                $pdo->rollBack();
                Json::error('Payment cannot be confirmed (status: ' . $currentStatus . ')', 400);
            }

            $eventId = (int) ($payment['event_id'] ?? 0);

            $eventStmt = $pdo->prepare(
                'SELECT is_seated, price, tickets_sold FROM events WHERE id = :id LIMIT 1 FOR UPDATE'
            );
            $eventStmt->execute([':id' => $eventId]);
            $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($event)) {
                $pdo->rollBack();
                Json::error('Event not found', 404);
            }

            $isSeated = (bool) ($event['is_seated'] ?? false);
            $price = (float) ($event['price'] ?? 0);

            $seatIds = [];
            $quantity = 0;

            if ($isSeated) {
                $seatStmt = $pdo->prepare(
                    "SELECT id FROM event_seats
                     WHERE event_id = :eid AND reserved_by = :uid AND status = 'locked'
                     FOR UPDATE"
                );
                $seatStmt->execute([':eid' => $eventId, ':uid' => $userId]);
                $seatIds = array_column($seatStmt->fetchAll(PDO::FETCH_ASSOC), 'id');

                if ($seatIds === []) {
                    $pdo->rollBack();
                    Json::error('No locked seats found for this payment', 409);
                }

                $quantity = count($seatIds);
            } else {
                $quantity = $price > 0 ? (int) round((float) $payment['amount'] / $price) : 1;
                if ($quantity <= 0) {
                    $quantity = 1;
                }
            }

            $pdo->prepare("UPDATE payments SET status = 'paid', paid_at = NOW() WHERE id = :id")
                ->execute([':id' => $paymentId]);

            $ticketStmt = $pdo->prepare(
                'INSERT INTO tickets (user_id, event_id, payment_id, qr_code, is_used)
                 VALUES (:user_id, :event_id, :payment_id, :qr_code, FALSE)
                 RETURNING id'
            );

            $ticketIds = [];
            for ($i = 0; $i < $quantity; $i++) {
                $ticketStmt->execute([
                    ':user_id'    => $userId,
                    ':event_id'   => $eventId,
                    ':payment_id' => $paymentId,
                    ':qr_code'    => $this->generateQrCode($eventId, $userId, $paymentId),
                ]);
                $ticketIds[] = (int) $ticketStmt->fetchColumn();
            }

            if ($isSeated && $seatIds !== []) {
                $seatToTicketMap = [];
                foreach ($seatIds as $index => $seatId) {
                    $seatToTicketMap[$seatId] = $ticketIds[$index] ?? $ticketIds[0];
                }
                (new EventSeatService())->markSeatsSold($pdo, $seatIds, $seatToTicketMap);
            }

            $pdo->prepare('UPDATE events SET tickets_sold = tickets_sold + :qty WHERE id = :id')
                ->execute([':qty' => $quantity, ':id' => $eventId]);

            $pdo->commit();

            try {
                $this->sendTicketEmail($pdo, $userId, $eventId, $paymentId, (string) ($payment['ips_qr_payload'] ?? ''));
            } catch (Throwable $e) {
                Logger::error('Post-confirm ticket email failed: ' . $e->getMessage());
            }

            Json::success([
                'id'      => $paymentId,
                'status'  => 'paid',
                'tickets' => $ticketIds,
                'message' => 'Payment confirmed successfully',
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            Logger::error('Payment confirmation failed: ' . $e->getMessage());
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

    private function sendTicketEmail(PDO $pdo, int $userId, int $eventId, int $paymentId, string $ipsPayload): void
    {
        $userStmt = $pdo->prepare('SELECT email, fullname FROM users WHERE id = :id LIMIT 1');
        $userStmt->execute([':id' => $userId]);
        $userData = $userStmt->fetch(PDO::FETCH_ASSOC);

        if (!is_array($userData)) {
            return;
        }

        $eventStmt = $pdo->prepare('SELECT title, starts_at, venue FROM events WHERE id = :id LIMIT 1');
        $eventStmt->execute([':id' => $eventId]);
        $event = $eventStmt->fetch(PDO::FETCH_ASSOC);

        if (!is_array($event)) {
            return;
        }

        $ticketStmt = $pdo->prepare('SELECT qr_code FROM tickets WHERE payment_id = :pid ORDER BY id ASC');
        $ticketStmt->execute([':pid' => $paymentId]);
        $tickets = $ticketStmt->fetchAll(PDO::FETCH_ASSOC);
        $qrCodes = array_map(fn($t) => (string) ($t['qr_code'] ?? ''), $tickets);

        if ($qrCodes === []) {
            return;
        }

        $startsAtLabel = 'Date TBA';
        if (isset($event['starts_at'])) {
            try {
                $startsAtLabel = (new DateTimeImmutable((string) $event['starts_at']))->format('D, d M Y H:i');
            } catch (Exception) {
                $startsAtLabel = (string) $event['starts_at'];
            }
        }

        $template = (new EmailTemplateService())->multiTicketDeliveryEmail(
            fullName: (string) ($userData['fullname'] ?? ''),
            eventTitle: (string) ($event['title'] ?? ''),
            startsAtLabel: $startsAtLabel,
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
}
