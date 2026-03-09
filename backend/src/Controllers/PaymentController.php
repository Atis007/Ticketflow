<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use App\Services\EmailTemplateService;
use App\Services\MailService;
use DateTimeImmutable;
use Exception;
use PDO;
use Throwable;

final class PaymentController
{
    /**
     * Confirms a pending payment — transitions status from 'pending' to 'paid'.
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
                    'id' => $paymentId,
                    'status' => 'paid',
                    'message' => 'Payment already confirmed',
                ]);
            }

            if ($currentStatus !== 'pending') {
                $pdo->rollBack();
                Json::error('Payment cannot be confirmed (status: ' . $currentStatus . ')', 400);
            }

            $pdo->prepare("UPDATE payments SET status = 'paid', paid_at = NOW() WHERE id = :id")
                ->execute([':id' => $paymentId]);

            $pdo->commit();

            // Send ticket delivery email after confirmation
            $eventId = (int) ($payment['event_id'] ?? 0);
            try {
                $this->sendTicketEmail($pdo, $userId, $eventId, $paymentId, (string) ($payment['ips_qr_payload'] ?? ''));
            } catch (Throwable $e) {
                Logger::error('Post-confirm ticket email failed: ' . $e->getMessage());
            }

            Json::success([
                'id' => $paymentId,
                'status' => 'paid',
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
