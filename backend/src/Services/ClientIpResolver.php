<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Request;

final class ClientIpResolver
{
    public function __construct(
        private readonly TrustedProxyPolicy $trustedProxyPolicy = new TrustedProxyPolicy(),
    ) {}

    public function resolve(Request $request): ?string
    {
        $remoteAddr = $this->normalizeIp($_SERVER['REMOTE_ADDR'] ?? null);
        $trustForwarded = $this->trustedProxyPolicy->shouldTrustForwardedHeaders($remoteAddr);

        if ($trustForwarded) {
            $candidates = [
                $this->fromCfConnectingIp($request),
                $this->fromForwarded($request),
                $this->fromXForwardedFor($request),
                $this->normalizeIp($request->header('x-real-ip')),
            ];

            foreach ($candidates as $candidate) {
                if ($candidate !== null) {
                    return $candidate;
                }
            }
        }

        return $remoteAddr;
    }

    private function fromCfConnectingIp(Request $request): ?string
    {
        return $this->normalizeIp($request->header('cf-connecting-ip'));
    }

    private function fromXForwardedFor(Request $request): ?string
    {
        $header = $request->header('x-forwarded-for');
        if ($header === null) {
            return null;
        }

        $parts = explode(',', $header);
        foreach ($parts as $part) {
            $candidate = $this->normalizeIp($part);
            if ($candidate !== null) {
                return $candidate;
            }
        }

        return null;
    }

    private function fromForwarded(Request $request): ?string
    {
        $header = $request->header('forwarded');
        if ($header === null) {
            return null;
        }

        $segments = explode(',', $header);
        foreach ($segments as $segment) {
            $parts = explode(';', $segment);
            foreach ($parts as $part) {
                $pair = explode('=', trim($part), 2);
                if (count($pair) !== 2) {
                    continue;
                }

                if (strtolower(trim($pair[0])) !== 'for') {
                    continue;
                }

                $value = trim($pair[1], " \t\n\r\0\x0B\"");

                if (str_starts_with($value, '[') && str_contains($value, ']')) {
                    $value = substr($value, 1, (int) strpos($value, ']') - 1);
                }

                if (str_contains($value, ':') && substr_count($value, ':') === 1) {
                    $lastColonPos = strrpos($value, ':');
                    if ($lastColonPos !== false) {
                        $hostPart = substr($value, 0, $lastColonPos);
                        if (filter_var($hostPart, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                            $value = $hostPart;
                        }
                    }
                }

                $candidate = $this->normalizeIp($value);
                if ($candidate !== null) {
                    return $candidate;
                }
            }
        }

        return null;
    }

    private function normalizeIp(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '' || $trimmed === 'unknown') {
            return null;
        }

        if (str_starts_with($trimmed, '::ffff:')) {
            $possibleV4 = substr($trimmed, 7);
            if (filter_var($possibleV4, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
                $trimmed = $possibleV4;
            }
        }

        return filter_var($trimmed, FILTER_VALIDATE_IP) !== false ? $trimmed : null;
    }
}
