<?php

declare(strict_types=1);

namespace App\Services;

final class IpInfoService
{
    /** @var array<string, array{expires_at:int,payload:array<string,mixed>|null}> */
    private static array $memoryCache = [];

    public function __construct(
        private readonly HttpClient $httpClient = new HttpClient(),
    ) {}

    /**
     * @return array<string, mixed>|null
     */
    public function lookup(?string $ip): ?array
    {
        $normalizedIp = $this->normalizeIp($ip);
        if ($normalizedIp === null || !$this->isPublicRoutableIp($normalizedIp)) {
            return null;
        }

        $cacheTtl = max(30, min(86400, (int) ($_ENV['IPINFO_CACHE_TTL_SECONDS'] ?? 1800)));
        $cached = $this->getCached($normalizedIp);
        if ($cached !== null) {
            return $cached;
        }

        $provider = strtolower(trim((string) ($_ENV['IPINFO_PROVIDER'] ?? 'ipapi')));
        if ($provider !== 'ipapi') {
            return null;
        }

        $baseUrl = rtrim((string) ($_ENV['IPINFO_BASE_URL'] ?? 'http://ip-api.com/json'), '/');
        if ($baseUrl === '') {
            return null;
        }

        $timeoutMs = (int) ($_ENV['IPINFO_TIMEOUT_MS'] ?? 400);
        $timeoutMs = max(200, min(5000, $timeoutMs));

        $response = $this->httpClient->getJson(
            $baseUrl . '/' . rawurlencode($normalizedIp),
            [
                'fields' => 'status,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query,message',
            ],
            $timeoutMs
        );

        if (!is_array($response)) {
            $this->putCache($normalizedIp, null, min(60, $cacheTtl));
            return null;
        }

        if (($response['status'] ?? 'fail') !== 'success') {
            $payload = [
                'provider' => 'ipapi',
                'status' => 'fail',
                'message' => $response['message'] ?? null,
                'ip' => $normalizedIp,
            ];

            $this->putCache($normalizedIp, $payload, min(120, $cacheTtl));
            return $payload;
        }

        $payload = [
            'provider' => 'ipapi',
            'status' => 'success',
            'ip' => $response['query'] ?? $normalizedIp,
            'country' => $response['country'] ?? null,
            'country_code' => $response['countryCode'] ?? null,
            'region' => $response['regionName'] ?? null,
            'city' => $response['city'] ?? null,
            'postal_code' => $response['zip'] ?? null,
            'latitude' => $response['lat'] ?? null,
            'longitude' => $response['lon'] ?? null,
            'timezone' => $response['timezone'] ?? null,
            'isp' => $response['isp'] ?? null,
            'organization' => $response['org'] ?? null,
            'as' => $response['as'] ?? null,
        ];

        $this->putCache($normalizedIp, $payload, $cacheTtl);

        return $payload;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function getCached(string $ip): ?array
    {
        $cached = self::$memoryCache[$ip] ?? null;
        if (!is_array($cached)) {
            return null;
        }

        if (time() > (int) ($cached['expires_at'] ?? 0)) {
            unset(self::$memoryCache[$ip]);
            return null;
        }

        $payload = $cached['payload'] ?? null;
        return is_array($payload) ? $payload : null;
    }

    /**
     * @param array<string, mixed>|null $payload
     */
    private function putCache(string $ip, ?array $payload, int $ttlSeconds): void
    {
        self::$memoryCache[$ip] = [
            'expires_at' => time() + max(1, $ttlSeconds),
            'payload' => $payload,
        ];
    }

    private function normalizeIp(?string $ip): ?string
    {
        if ($ip === null) {
            return null;
        }

        $trimmed = trim($ip);
        if ($trimmed === '') {
            return null;
        }

        return filter_var($trimmed, FILTER_VALIDATE_IP) !== false ? $trimmed : null;
    }

    private function isPublicRoutableIp(string $ip): bool
    {
        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) !== false;
    }
}
