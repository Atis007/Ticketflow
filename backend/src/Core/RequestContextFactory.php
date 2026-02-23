<?php

declare(strict_types=1);

namespace App\Core;

use App\Services\ClientIpResolver;

final class RequestContextFactory
{
    public static function fromRequest(Request $request): RequestContext
    {
        $ip = (new ClientIpResolver())->resolve($request);

        return new RequestContext(
            requestId: self::resolveRequestId($request),
            startedAtMs: (int) round(microtime(true) * 1000),
            method: $request->method,
            path: $request->path,
            ip: $ip,
            userAgent: self::trimOrNull($request->header('user-agent')),
            platform: self::resolvePlatform($request),
        );
    }

    private static function resolveRequestId(Request $request): string
    {
        $headerName = self::trimOrNull((string) ($_ENV['REQUEST_ID_HEADER'] ?? 'x-request-id'));
        if ($headerName === null) {
            $headerName = 'x-request-id';
        }

        $incoming = self::trimOrNull($request->header($headerName));
        if ($incoming !== null) {
            $normalized = preg_replace('/[^A-Za-z0-9._:-]/', '', $incoming) ?? '';
            if ($normalized !== '') {
                return substr($normalized, 0, 128);
            }
        }

        return bin2hex(random_bytes(16));
    }

    private static function resolvePlatform(Request $request): string
    {
        $raw = strtolower(trim((string) ($request->header('x-client-platform') ?? '')));
        return $raw !== '' ? substr($raw, 0, 32) : 'unknown';
    }

    private static function trimOrNull(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }
}
