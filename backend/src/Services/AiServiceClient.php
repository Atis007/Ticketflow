<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Logger;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

final class AiServiceClient
{
    private readonly Client $client;
    private readonly string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) ($_ENV['AI_SERVICE_URL'] ?? 'http://localhost:8100'), '/');
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'http_errors' => false,
            'timeout' => 90,
            'connect_timeout' => 10,
        ]);
    }

    /**
     * Generates a venue layout via the AI service.
     *
     * @return array<string, mixed>|null
     */
    public function generateLayout(string $venueName, string $venueType, int $totalCapacity, string $instructions = ''): ?array
    {
        return $this->post('/api/layout/generate', [
            'venue_name' => $venueName,
            'venue_type' => $venueType,
            'total_capacity' => $totalCapacity,
            'additional_instructions' => $instructions,
        ]);
    }

    /**
     * Sends a chat message to the AI admin assistant.
     *
     * @param array<int, array{role: string, content: string}> $messages
     * @return array<string, mixed>|null
     */
    public function chat(array $messages, ?string $adminToken = null): ?array
    {
        $payload = ['messages' => $messages];
        if ($adminToken !== null) {
            $payload['admin_token'] = $adminToken;
        }

        return $this->post('/api/chat', $payload);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function post(string $path, array $body): ?array
    {
        try {
            $response = $this->client->request('POST', $path, [
                'json' => $body,
                'headers' => ['Accept' => 'application/json'],
            ]);

            $status = $response->getStatusCode();
            $raw = (string) $response->getBody();

            if ($status < 200 || $status >= 300) {
                Logger::error("AI service error [{$status}]: {$raw}");
                return null;
            }

            $decoded = json_decode($raw, true);
            return is_array($decoded) ? $decoded : null;
        } catch (GuzzleException $e) {
            Logger::error('AI service request failed: ' . $e->getMessage());
            return null;
        }
    }
}
