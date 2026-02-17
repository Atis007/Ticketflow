<?php

declare(strict_types=1);

namespace App\Services;

use PDO;
use RuntimeException;

final class PasswordResetService
{
    /**
     * Injects services used by forgot/reset password flows.
     */
    public function __construct(
        private readonly MailService $mailService = new MailService(),
        private readonly EmailTemplateService $templateService = new EmailTemplateService(),
        private readonly AuthSessionService $sessionService = new AuthSessionService(),
    ) {}

    /**
     * Requests a password reset for the provided email.
     *
     * Response behavior is intentionally anti-enumeration friendly:
     * for unknown emails the method performs dummy work and returns
     * without throwing user-facing existence information.
     */
    public function requestReset(PDO $pdo, string $email): void
    {
        $stmt = $pdo->prepare('SELECT id, fullname, email FROM users WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!is_array($user)) {
            $this->runDummyWork();
            return;
        }

        $userId = (int) $user['id'];
        $token = $this->createToken($pdo, $userId);

        $resetUrl = $this->buildResetUrl($token);
        $template = $this->templateService->passwordResetEmail(
            (string) $user['fullname'],
            $resetUrl,
            '30 minutes'
        );
        $this->mailService->send((string) $user['email'], $template['subject'], $template['html'], $template['text']);
    }

    /**
     * Resets user password from a valid single-use reset token.
     *
     * On success all active sessions for that user are revoked.
     */
    public function resetPassword(PDO $pdo, string $token, string $newPassword): void
    {
        $stmt = $pdo->prepare(
            'SELECT id, user_id, expires_at, used
             FROM password_resets
             WHERE token = :token
             LIMIT 1'
        );
        $stmt->execute([':token' => $token]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!is_array($row)) {
            throw new RuntimeException('Invalid password reset token');
        }

        if ((bool) $row['used'] === true) {
            throw new RuntimeException('Password reset token already used');
        }

        $expiresAt = strtotime((string) $row['expires_at']);
        if ($expiresAt === false || $expiresAt < time()) {
            throw new RuntimeException('Password reset token expired');
        }

        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
        $userId = (int) $row['user_id'];

        $pdo->beginTransaction();

        try {
            $updateUser = $pdo->prepare('UPDATE users SET password = :password WHERE id = :user_id');
            $updateUser->execute([
                ':password' => $hashedPassword,
                ':user_id' => $userId,
            ]);

            $markTokenUsed = $pdo->prepare('UPDATE password_resets SET used = TRUE WHERE id = :id');
            $markTokenUsed->execute([':id' => (int) $row['id']]);

            $this->sessionService->revokeAllByUserId($pdo, $userId);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Creates a fresh reset token and invalidates old unused tokens.
     */
    private function createToken(PDO $pdo, int $userId): string
    {
        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');

        $invalidate = $pdo->prepare('UPDATE password_resets SET used = TRUE WHERE user_id = :user_id AND used = FALSE');
        $invalidate->execute([':user_id' => $userId]);

        $expiresAt = (new \DateTimeImmutable('now'))
            ->modify('+' . $this->resetTokenTtlSeconds() . ' seconds')
            ->format('Y-m-d H:i:sP');

        $insert = $pdo->prepare(
            'INSERT INTO password_resets (user_id, token, expires_at, used)
             VALUES (:user_id, :token, :expires_at, FALSE)'
        );

        $insert->execute([
            ':user_id' => $userId,
            ':token' => $token,
            ':expires_at' => $expiresAt,
        ]);

        return $token;
    }

    /**
     * Builds an absolute password reset URL with token query parameter.
     */
    private function buildResetUrl(string $token): string
    {
        $resetUrl = trim((string) ($this->config()['auth']['password_reset_url'] ?? ''));
        if ($resetUrl === '') {
            throw new RuntimeException('PASSWORD_RESET_URL is missing');
        }

        $separator = str_contains($resetUrl, '?') ? '&' : '?';
        return $resetUrl . $separator . 'token=' . urlencode($token);
    }

    /**
     * Returns reset token TTL in seconds.
     */
    private function resetTokenTtlSeconds(): int
    {
        $ttl = (int) ($this->config()['auth']['reset_token_ttl_seconds'] ?? 1800);
        return $ttl > 0 ? $ttl : 1800;
    }

    /**
     * Performs constant-time style dummy work for unknown emails.
     *
     * This intentionally burns similar CPU cost to reduce timing differences
     * between existing and non-existing accounts in forgot-password flow,
     * making account enumeration attacks harder.
     */
    private function runDummyWork(): void
    {
        $dummy = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        password_hash($dummy, PASSWORD_BCRYPT);
    }

    /**
     * Loads application config array.
     *
     * @return array<string, mixed>
     */
    private function config(): array
    {
        if (!defined('APP_ROOT')) {
            return [];
        }

        $configPath = APP_ROOT . '/config/config.php';
        if (!file_exists($configPath)) {
            return [];
        }

        $loaded = require $configPath;
        return is_array($loaded) ? $loaded : [];
    }
}
