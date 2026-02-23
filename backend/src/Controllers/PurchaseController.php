<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use App\Services\DeviceLogService;
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

        try {
            $pdo->beginTransaction();

            $eventStmt = $pdo->prepare(
                'SELECT id, title, price, is_free, is_active, capacity, tickets_sold
                 FROM events
                 WHERE id = :id
                 LIMIT 1'
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

            $capacity = $event['capacity'] !== null ? (int) $event['capacity'] : null;
            $ticketsSold = (int) ($event['tickets_sold'] ?? 0);

            if ($simulateOutcome === 'success' && $capacity !== null && ($ticketsSold + $quantity) > $capacity) {
                $pdo->rollBack();
                Json::error('Not enough capacity for requested quantity', 409);
            }

            $amount = round($price * $quantity, 2);
            $paymentStatus = $simulateOutcome === 'success' ? 'paid' : 'failed';
            $paymentPayload = [
                'simulate_outcome' => $simulateOutcome,
                'quantity' => $quantity,
                'event_title' => (string) ($event['title'] ?? ''),
            ];

            $paymentStmt = $pdo->prepare(
                'INSERT INTO payments (user_id, event_id, amount, currency, status, ips_qr_payload, paid_at)
                 VALUES (:user_id, :event_id, :amount, :currency, :status, :payload, :paid_at)
                 RETURNING id'
            );
            $paymentStmt->execute([
                ':user_id' => $userId,
                ':event_id' => $eventId,
                ':amount' => $amount,
                ':currency' => $currency,
                ':status' => $paymentStatus,
                ':payload' => json_encode($paymentPayload, JSON_UNESCAPED_UNICODE),
                ':paid_at' => $simulateOutcome === 'success' ? (new \DateTimeImmutable('now'))->format('Y-m-d H:i:sP') : null,
            ]);

            $paymentId = (int) $paymentStmt->fetchColumn();
            $ticketIds = [];

            if ($simulateOutcome === 'success') {
                $ticketStmt = $pdo->prepare(
                    'INSERT INTO tickets (user_id, event_id, payment_id, qr_code, is_used)
                     VALUES (:user_id, :event_id, :payment_id, :qr_code, FALSE)
                     RETURNING id'
                );

                for ($i = 0; $i < $quantity; $i++) {
                    $ticketStmt->execute([
                        ':user_id' => $userId,
                        ':event_id' => $eventId,
                        ':payment_id' => $paymentId,
                        ':qr_code' => $this->generateQrCode($eventId, $userId, $paymentId),
                    ]);
                    $ticketIds[] = (int) $ticketStmt->fetchColumn();
                }

                $soldStmt = $pdo->prepare(
                    'UPDATE events
                     SET tickets_sold = tickets_sold + :qty
                     WHERE id = :event_id'
                );
                $soldStmt->execute([
                    ':qty' => $quantity,
                    ':event_id' => $eventId,
                ]);
            }

            $pdo->commit();

            $action = $simulateOutcome === 'success' ? 'purchase.paid.success' : ($simulateOutcome === 'cancelled' ? 'purchase.cancelled' : 'purchase.failed');
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
                    'amount' => $amount,
                    'currency' => $currency,
                    'quantity' => $quantity,
                    'ticket_ids' => $ticketIds,
                    'simulate_outcome' => $simulateOutcome,
                ]
            );

            Json::success([
                'message' => $simulateOutcome === 'success' ? 'Purchase simulated successfully' : 'Purchase simulated as non-success',
                'payment' => [
                    'id' => $paymentId,
                    'status' => $paymentStatus,
                    'amount' => $amount,
                    'currency' => $currency,
                ],
                'tickets' => $ticketIds,
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
        return rtrim(strtr(base64_encode(hash('sha256', $eventId . ':' . $userId . ':' . $paymentId . ':' . microtime(true) . ':' . random_bytes(12), true)), '+/', '-_'), '=');
    }
}
