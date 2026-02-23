<?php

declare(strict_types=1);

namespace App\Services;

final class IpInfoService
{
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

        $provider = strtolower(trim((string) ($_ENV['IPINFO_PROVIDER'] ?? 'ipapi')));
        if ($provider !== 'ipapi') {
            return null;
        }

        $baseUrl = rtrim((string) ($_ENV['IPINFO_BASE_URL'] ?? 'http://ip-api.com/json'), '/');
        if ($baseUrl === '') {
            return null;
        }

        $timeoutMs = (int) ($_ENV['IPINFO_TIMEOUT_MS'] ?? 1500);
        $timeoutMs = max(200, min(5000, $timeoutMs));

        $response = $this->httpClient->getJson(
            $baseUrl . '/' . rawurlencode($normalizedIp),
            [
                'fields' => 'status,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query,message',
            ],
            $timeoutMs
        );

        if (!is_array($response)) {
            return null;
        }

        if (($response['status'] ?? 'fail') !== 'success') {
            return [
                'provider' => 'ipapi',
                'status' => 'fail',
                'message' => $response['message'] ?? null,
                'ip' => $normalizedIp,
            ];
        }

        return [
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
