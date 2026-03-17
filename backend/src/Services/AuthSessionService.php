<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\UserRole;
use PDO;

final class AuthSessionService
{
    /**
     * Checks whether sue session.
     */
    public function issueSession(
        PDO $pdo,
        int $userId,
        ?string $userAgent,
        ?string $ip,
        string $platform = 'unknown',
        ?string $deviceName = null,
        int $ttlSeconds = 86400
    ): array {
        $token = $this->generateToken();
        $tokenHash = $this->hashToken($token);

        $expiresAt = (new \DateTimeImmutable('now'))
            ->modify('+' . $ttlSeconds . ' seconds')
            ->format('Y-m-d H:i:sP');

        $stmt = $pdo->prepare(
            'INSERT INTO auth_sessions (user_id, token_hash, expires_at, user_agent, ip, platform, device_name, last_used_at)
             VALUES (:user_id, :token_hash, :expires_at, :user_agent, :ip, :platform, :device_name, NOW())
             RETURNING id'
        );

        $stmt->execute([
            ':user_id' => $userId,
            ':token_hash' => $tokenHash,
            ':expires_at' => $expiresAt,
            ':user_agent' => $this->trimOrNull($userAgent),
            ':ip' => $this->trimOrNull($ip),
            ':platform' => $this->normalizePlatform($platform),
            ':device_name' => $this->trimOrNull($deviceName),
        ]);

        $sessionId = (int) $stmt->fetchColumn();

        return [
            'session_id' => $sessionId,
            'token' => $token,
            'expires_at' => $expiresAt,
        ];
    }

    /**
     * Authenticates a bearer token and returns its active user payload.
     *
     * Returns null when the token is missing, revoked, expired, or invalid.
     */
    public function authenticateToken(PDO $pdo, string $token): ?array
    {
        $stmt = $pdo->prepare(
            'SELECT s.id AS session_id, s.user_id, u.email, u.role,
                    (u.email_verified_at IS NOT NULL) AS is_verified
             FROM auth_sessions s
             JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = :token_hash
               AND s.revoked_at IS NULL
               AND s.expires_at > NOW()
             LIMIT 1'
        );

        $stmt->execute([
            ':token_hash' => $this->hashToken($token),
        ]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            return null;
        }

        $role = UserRole::tryFrom((string) ($row['role'] ?? ''));
        if ($role === null) {
            return null;
        }

        $touchStmt = $pdo->prepare('UPDATE auth_sessions SET last_used_at = NOW() WHERE id = :id');
        $touchStmt->execute([':id' => (int) $row['session_id']]);

        return [
            'session_id' => (int) $row['session_id'],
            'id' => (int) $row['user_id'],
            'email' => (string) $row['email'],
            'role' => $role,
            'is_verified' => (bool) ($row['is_verified'] ?? false),
        ];
    }

    /**
     * Handles revoke by token.
     */
    public function revokeByToken(PDO $pdo, string $token): void
    {
        $stmt = $pdo->prepare(
            'UPDATE auth_sessions
             SET revoked_at = COALESCE(revoked_at, NOW())
             WHERE token_hash = :token_hash'
        );

        $stmt->execute([
            ':token_hash' => $this->hashToken($token),
        ]);
    }

    /**
     * Handles revoke all by user id.
     */
    public function revokeAllByUserId(PDO $pdo, int $userId): void
    {
        $stmt = $pdo->prepare(
            'UPDATE auth_sessions
             SET revoked_at = COALESCE(revoked_at, NOW())
             WHERE user_id = :user_id'
        );

        $stmt->execute([
            ':user_id' => $userId,
        ]);
    }

    /**
     * Handles generate token.
     */
    private function generateToken(): string
    {
        $raw = random_bytes(32);
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }

    /**
     * Handles hash token.
     */
    private function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    /**
     * Handles normalize platform.
     */
    private function normalizePlatform(string $platform): string
    {
        $normalized = strtolower(trim($platform));

        return match ($normalized) {
            'web', 'mobile', 'admin', 'unknown' => $normalized,
            default => 'unknown',
        };
    }

    /**
     * Handles trim or null.
     */
    private function trimOrNull(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }
}
