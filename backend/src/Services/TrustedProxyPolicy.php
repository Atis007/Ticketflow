<?php

declare(strict_types=1);

namespace App\Services;

final class TrustedProxyPolicy
{
    public function shouldTrustForwardedHeaders(?string $remoteAddr): bool
    {
        $trustProxy = filter_var($_ENV['TRUST_PROXY'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if ($trustProxy !== true) {
            return false;
        }

        $trusted = $this->trustedProxyRanges();
        if ($trusted === []) {
            return true;
        }

        $ip = $this->normalizeIp($remoteAddr);
        if ($ip === null) {
            return false;
        }

        foreach ($trusted as $range) {
            if ($this->ipInRange($ip, $range)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return string[]
     */
    private function trustedProxyRanges(): array
    {
        $raw = trim((string) ($_ENV['TRUSTED_PROXIES'] ?? ''));
        if ($raw === '') {
            return [];
        }

        $parts = array_map('trim', explode(',', $raw));
        $parts = array_filter($parts, static fn (string $part): bool => $part !== '');

        return array_values($parts);
    }

    private function normalizeIp(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        return filter_var($trimmed, FILTER_VALIDATE_IP) !== false ? $trimmed : null;
    }

    private function ipInRange(string $ip, string $range): bool
    {
        $range = trim($range);
        if ($range === '') {
            return false;
        }

        if (!str_contains($range, '/')) {
            return hash_equals($ip, $range);
        }

        [$network, $prefixLengthRaw] = explode('/', $range, 2);
        $network = trim($network);
        $prefixLength = (int) trim($prefixLengthRaw);

        $ipBin = @inet_pton($ip);
        $networkBin = @inet_pton($network);

        if ($ipBin === false || $networkBin === false) {
            return false;
        }

        if (strlen($ipBin) !== strlen($networkBin)) {
            return false;
        }

        $maxBits = strlen($ipBin) * 8;
        if ($prefixLength < 0 || $prefixLength > $maxBits) {
            return false;
        }

        $fullBytes = intdiv($prefixLength, 8);
        $remainingBits = $prefixLength % 8;

        if ($fullBytes > 0) {
            if (substr($ipBin, 0, $fullBytes) !== substr($networkBin, 0, $fullBytes)) {
                return false;
            }
        }

        if ($remainingBits === 0) {
            return true;
        }

        $mask = (0xFF << (8 - $remainingBits)) & 0xFF;
        $ipByte = ord($ipBin[$fullBytes]);
        $networkByte = ord($networkBin[$fullBytes]);

        return ($ipByte & $mask) === ($networkByte & $mask);
    }
}
