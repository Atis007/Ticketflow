<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

final class SecurityService
{
    private const FAILED_LOGIN_THRESHOLD = 8;
    private const FAILED_LOGIN_BLOCK_MINUTES = 120;
    private const FORGOT_PASSWORD_THRESHOLD = 5;
    private const FORGOT_PASSWORD_BLOCK_MINUTES = 60;

    /**
     * Returns true when an IP has an active block.
     */
    public function isIpBlocked(PDO $pdo, string $ip): bool
    {
        $stmt = $pdo->prepare(
            "SELECT 1
             FROM security_blocks
             WHERE block_type = 'ip'
               AND status = 'active'
               AND ip = :ip::inet
               AND (is_permanent = TRUE OR blocked_until > NOW())
             LIMIT 1"
        );

        $stmt->execute([':ip' => $ip]);
        return (bool) $stmt->fetchColumn();
    }

    /**
     * Tracks failed login attempts and creates temporary IP block on threshold.
     */
    public function trackFailedLogin(PDO $pdo, string $ip, string $email, ?array $context = null): void
    {
        $incident = $this->upsertIncident(
            $pdo,
            'failed_login',
            'failed_login:ip:' . $ip . ':15m',
            $ip,
            $email,
            self::FAILED_LOGIN_THRESHOLD,
            $context
        );

        if ((int) ($incident['attempt_count'] ?? 0) >= self::FAILED_LOGIN_THRESHOLD) {
            $this->createTempIpBlock($pdo, $ip, self::FAILED_LOGIN_BLOCK_MINUTES, (int) $incident['id'], 'Too many failed login attempts');
            $this->markIncidentAction($pdo, (int) $incident['id'], 'temp_ip_block', 'high');
        }
    }

    /**
     * Tracks forgot-password request abuse and creates temporary IP block on threshold.
     */
    public function trackForgotPasswordRequest(PDO $pdo, string $ip, string $email, ?array $context = null): void
    {
        $incident = $this->upsertIncident(
            $pdo,
            'forgot_password_spam',
            'forgot_password_spam:ip:' . $ip . ':15m',
            $ip,
            $email,
            self::FORGOT_PASSWORD_THRESHOLD,
            $context
        );

        if ((int) ($incident['attempt_count'] ?? 0) >= self::FORGOT_PASSWORD_THRESHOLD) {
            $this->createTempIpBlock($pdo, $ip, self::FORGOT_PASSWORD_BLOCK_MINUTES, (int) $incident['id'], 'Too many forgot-password attempts');
            $this->markIncidentAction($pdo, (int) $incident['id'], 'temp_ip_block', 'high');
        }
    }

    /**
     * Creates or increments an open security incident by fingerprint.
     *
     * @return array<string, mixed>
     */
    private function upsertIncident(PDO $pdo, string $incidentType, string $fingerprint, string $ip, string $email, int $threshold, ?array $context = null): array
    {
        $details = ['window' => '15m'];
        if (is_array($context) && $context !== []) {
            $details['context'] = $this->sanitizeContext($context);
        }

        $stmt = $pdo->prepare(
            "INSERT INTO security_incidents (
                incident_type, fingerprint, ip, email, threshold_count, details
             ) VALUES (
                :incident_type, :fingerprint, :ip::inet, :email, :threshold_count, :details::jsonb
             )
             ON CONFLICT (fingerprint) WHERE status = 'open'
             DO UPDATE SET
                 attempt_count = security_incidents.attempt_count + 1,
                 last_seen_at = NOW(),
                 details = COALESCE(security_incidents.details, '{}'::jsonb) || EXCLUDED.details,
                 updated_at = NOW()
             RETURNING id, attempt_count"
        );

        $stmt->execute([
            ':incident_type' => $incidentType,
            ':fingerprint' => $fingerprint,
            ':ip' => $ip,
            ':email' => $email,
            ':threshold_count' => $threshold,
            ':details' => json_encode($details, JSON_UNESCAPED_UNICODE),
        ]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : [];
    }

    /**
     * @param array<string, mixed> $context
     *
     * @return array<string, mixed>
     */
    private function sanitizeContext(array $context): array
    {
        $allowed = [
            'request_id',
            'request_path',
            'request_method',
            'platform',
            'source',
            'outcome',
            'app_env',
            'app_region',
            'app_version',
            'app_commit_hash',
            'device_log_id',
        ];

        $sanitized = [];
        foreach ($allowed as $key) {
            if (!array_key_exists($key, $context)) {
                continue;
            }

            $value = $context[$key];
            if (is_scalar($value) || $value === null) {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }

    /**
     * Creates a temporary active IP block.
     */
    private function createTempIpBlock(PDO $pdo, string $ip, int $minutes, int $incidentId, string $reason): void
    {
        $stmt = $pdo->prepare(
            "INSERT INTO security_blocks (
                block_type, ip, reason, is_permanent, blocked_until, escalated_from_incident, status, created_source
             ) VALUES (
                'ip', :ip::inet, :reason, FALSE, NOW() + (:minutes || ' minutes')::interval, :incident_id, 'active', 'system'
             )"
        );

        $stmt->execute([
            ':ip' => $ip,
            ':reason' => $reason,
            ':minutes' => $minutes,
            ':incident_id' => $incidentId,
        ]);
    }

    /**
     * Updates incident status fields after automatic action.
     */
    private function markIncidentAction(PDO $pdo, int $incidentId, string $actionTaken, string $severity): void
    {
        $stmt = $pdo->prepare(
            'UPDATE security_incidents
             SET action_taken = :action_taken,
                 severity = :severity,
                 updated_at = NOW()
             WHERE id = :id'
        );

        $stmt->execute([
            ':action_taken' => $actionTaken,
            ':severity' => $severity,
            ':id' => $incidentId,
        ]);
    }
}
