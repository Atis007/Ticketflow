<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Logger;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

final class HttpClient
{
    private readonly Client $client;

    public function __construct(?Client $client = null)
    {
        $this->client = $client ?? new Client([
            'http_errors' => false,
        ]);
    }

    /**
     * @param array<string, string|int|float|bool> $query
     *
     * @return array<string, mixed>|null
     */
    public function getJson(string $url, array $query = [], int $timeoutMs = 1500): ?array
    {
        $timeoutSeconds = max(0.2, $timeoutMs / 1000);

        try {
            $response = $this->client->request('GET', $url, [
                'query' => $query,
                'timeout' => $timeoutSeconds,
                'connect_timeout' => $timeoutSeconds,
                'headers' => [
                    'Accept' => 'application/json',
                ],
            ]);
        } catch (GuzzleException $e) {
            Logger::warning('HTTP client GET failed: ' . $e->getMessage());
            return null;
        }

        if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
            return null;
        }

        $raw = (string) $response->getBody();
        if ($raw === '') {
            return null;
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }
}
