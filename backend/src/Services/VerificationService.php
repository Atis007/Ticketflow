<?php

declare(strict_types=1);

namespace App\Services;

use PDO;
use RuntimeException;

final class VerificationService
{
    private const TOKEN_TTL_SECONDS = 43200;
    private const RESEND_COOLDOWN_SECONDS = 60;

    /**
     * Injects services used by email verification flows.
     */
    public function __construct(
        private readonly MailService $mailService = new MailService(),
        private readonly EmailTemplateService $templateService = new EmailTemplateService(),
        private readonly AuthSessionService $sessionService = new AuthSessionService(),
    ) {}

    /**
     * Sends a fresh verification email for a user.
     *
     * Applies resend cooldown to reduce abuse.
     */
    public function sendForUser(PDO $pdo, int $userId, string $email, string $fullName): void
    {
        $this->assertResendCooldown($pdo, $userId);
        $token = $this->createToken($pdo, $userId);

        $baseUrl = rtrim($_ENV['APP_BASE_URL'] ?? '', '/');
        if ($baseUrl === '') {
            throw new RuntimeException('APP_BASE_URL is missing');
        }

        $verifyUrl = $baseUrl . '/verify-email?token=' . urlencode($token);
        $template = $this->templateService->verificationEmail($fullName, $verifyUrl, '12 hours');

        $this->mailService->send($email, $template['subject'], $template['html'], $template['text']);
    }

    /**
     * Confirms a verification token and activates the user account.
     *
     * Marks token as used and issues a logged-in session token.
     */
    public function confirmToken(PDO $pdo, string $token, ?string $userAgent, ?string $ip): array
    {
        $stmt = $pdo->prepare(
            'SELECT ev.id, ev.user_id, ev.used, ev.expires_at, u.email, u.fullname, u.role, u.is_active
             FROM email_verifications ev
             JOIN users u ON u.id = ev.user_id
             WHERE ev.token = :token
             LIMIT 1'
        );
        $stmt->execute([':token' => $token]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!is_array($row)) {
            throw new RuntimeException('Invalid verification token');
        }

        $expiresAt = strtotime((string) $row['expires_at']);
        if ($expiresAt === false || $expiresAt < time()) {
            throw new RuntimeException('Verification token expired');
        }

        if ((bool) $row['used'] === true) {
            throw new RuntimeException('Verification token already used');
        }

        $pdo->beginTransaction();

        try {
            $updateUser = $pdo->prepare(
                'UPDATE users
                 SET is_active = TRUE,
                     email_verified_at = COALESCE(email_verified_at, NOW())
                 WHERE id = :user_id'
            );
            $updateUser->execute([':user_id' => (int) $row['user_id']]);

            $updateToken = $pdo->prepare(
                'UPDATE email_verifications
                 SET used = TRUE,
                     used_at = NOW()
                 WHERE id = :id'
            );
            $updateToken->execute([':id' => (int) $row['id']]);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        $session = $this->sessionService->issueSession(
            $pdo,
            (int) $row['user_id'],
            $userAgent,
            $ip,
            'web'
        );

        return [
            'token' => $session['token'],
            'expires_at' => $session['expires_at'],
            'user' => [
                'email' => (string) $row['email'],
                'fullName' => (string) $row['fullname'],
                'role' => (string) $row['role'],
                'isVerified' => true,
            ],
        ];
    }

    /**
     * Creates a new verification token and invalidates prior unused ones.
     */
    private function createToken(PDO $pdo, int $userId): string
    {
        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');

        $pdo->prepare('UPDATE email_verifications SET used = TRUE, used_at = NOW() WHERE user_id = :user_id AND used = FALSE')
            ->execute([':user_id' => $userId]);

        $expiresAt = (new \DateTimeImmutable('now'))
            ->modify('+' . self::TOKEN_TTL_SECONDS . ' seconds')
            ->format('Y-m-d H:i:sP');

        $stmt = $pdo->prepare(
            'INSERT INTO email_verifications (user_id, token, expires_at, used)
             VALUES (:user_id, :token, :expires_at, FALSE)'
        );
        $stmt->execute([
            ':user_id' => $userId,
            ':token' => $token,
            ':expires_at' => $expiresAt,
        ]);

        return $token;
    }

    /**
     * Enforces minimum delay between verification email sends.
     */
    private function assertResendCooldown(PDO $pdo, int $userId): void
    {
        $stmt = $pdo->prepare(
            'SELECT created_at
             FROM email_verifications
             WHERE user_id = :user_id
             ORDER BY created_at DESC
             LIMIT 1'
        );
        $stmt->execute([':user_id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!is_array($row) || !isset($row['created_at'])) {
            return;
        }

        $lastCreatedAt = strtotime((string) $row['created_at']);
        if ($lastCreatedAt === false) {
            return;
        }

        if ((time() - $lastCreatedAt) < self::RESEND_COOLDOWN_SECONDS) {
            throw new RuntimeException('Verification email already sent recently. Please wait a minute.');
        }
    }
}
