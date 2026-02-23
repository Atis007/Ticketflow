<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Logger;
use App\Core\Request;
use App\Core\RequestContext;
use PDO;
use Throwable;

final class DeviceLogService
{
    public function __construct(
        private readonly ClientIpResolver $ipResolver = new ClientIpResolver(),
        private readonly DeviceDetectionService $deviceDetectionService = new DeviceDetectionService(),
        private readonly IpInfoService $ipInfoService = new IpInfoService(),
    ) {}

    public function logAuthEvent(
        PDO $pdo,
        Request $request,
        string $action,
        string $outcome,
        ?int $userId = null,
        ?int $sessionId = null
    ): void {
        $payload = $this->buildPayload(
            request: $request,
            action: $action,
            outcome: $outcome,
            userId: $userId,
            sessionId: $sessionId,
            eventId: null,
            paymentId: null,
            extraContext: null,
        );

        $this->insertWithFallback($pdo, $payload);
    }

    /**
     * Purchase logging hook for future payment endpoints.
     *
     * @param array<string, mixed>|null $purchaseContext
     */
    public function logPurchaseEvent(
        PDO $pdo,
        Request $request,
        string $action,
        string $outcome,
        ?int $userId,
        ?int $sessionId,
        ?int $eventId,
        ?int $paymentId,
        ?array $purchaseContext = null,
    ): void {
        $payload = $this->buildPayload(
            request: $request,
            action: $action,
            outcome: $outcome,
            userId: $userId,
            sessionId: $sessionId,
            eventId: $eventId,
            paymentId: $paymentId,
            extraContext: $purchaseContext,
        );

        $this->insertWithFallback($pdo, $payload);
    }

    /**
     * @param array<string, mixed>|null $extraContext
     *
     * @return array<string, mixed>
     */
    private function buildPayload(
        Request $request,
        string $action,
        string $outcome,
        ?int $userId,
        ?int $sessionId,
        ?int $eventId,
        ?int $paymentId,
        ?array $extraContext,
    ): array {
        $context = RequestContext::current();

        $ip = $context?->ip ?? $this->ipResolver->resolve($request);
        $userAgent = $context?->userAgent ?? $this->trimOrNull($request->header('user-agent'));
        $platform = $context?->platform ?? strtolower(trim((string) ($request->header('x-client-platform') ?? 'unknown')));
        $platform = $platform === '' ? 'unknown' : substr($platform, 0, 32);

        $device = $this->deviceDetectionService->detect($userAgent);
        $ipInfo = $this->withExtraContext($this->ipInfoService->lookup($ip), $extraContext);

        return [
            ':user_id' => $userId,
            ':user_agent' => $userAgent,
            ':ip' => $ip,
            ':ip_info' => $ipInfo === null ? null : json_encode($ipInfo, JSON_UNESCAPED_UNICODE),
            ':action' => substr(trim($action), 0, 255),
            ':request_id' => $context?->requestId,
            ':session_id' => $sessionId,
            ':platform' => $platform,
            ':device_type' => (string) ($device['device_type'] ?? 'unknown'),
            ':outcome' => substr(trim($outcome), 0, 32),
            ':event_id' => $eventId,
            ':payment_id' => $paymentId,
        ];
    }

    /**
     * @param array<string, mixed>|null $ipInfo
     * @param array<string, mixed>|null $extraContext
     *
     * @return array<string, mixed>|null
     */
    private function withExtraContext(?array $ipInfo, ?array $extraContext): ?array
    {
        if ($extraContext === null || $extraContext === []) {
            return $ipInfo;
        }

        $base = $ipInfo ?? [];
        $base['context'] = $extraContext;

        return $base;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function insertWithFallback(PDO $pdo, array $payload): void
    {
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO device_logs
                    (user_id, user_agent, ip, ip_info, action, request_id, session_id, platform, device_type, outcome, event_id, payment_id)
                 VALUES
                    (:user_id, :user_agent, :ip, :ip_info::jsonb, :action, :request_id, :session_id, :platform, :device_type, :outcome, :event_id, :payment_id)'
            );
            $stmt->execute($payload);
            return;
        } catch (Throwable $e) {
            Logger::warning('Device log extended insert failed, falling back: ' . $e->getMessage());
        }

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO device_logs (user_id, user_agent, ip, ip_info, action)
                 VALUES (:user_id, :user_agent, :ip, :ip_info::jsonb, :action)'
            );
            $stmt->execute([
                ':user_id' => $payload[':user_id'] ?? null,
                ':user_agent' => $payload[':user_agent'] ?? null,
                ':ip' => $payload[':ip'] ?? null,
                ':ip_info' => $payload[':ip_info'] ?? null,
                ':action' => $payload[':action'] ?? null,
            ]);
        } catch (Throwable $e) {
            Logger::warning('Device log fallback insert failed: ' . $e->getMessage());
        }
    }

    private function trimOrNull(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }
}
