<?php

declare(strict_types=1);

namespace App\Core;

final class FileCache
{
    public function __construct(
        private readonly string $cacheDir = __DIR__ . '/../../cache',
    ) {}

    public function get(string $key): ?array
    {
        $path = $this->pathFor($key);
        if (!is_file($path)) {
            return null;
        }

        $raw = file_get_contents($path);
        if ($raw === false || $raw === '') {
            return null;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return null;
        }

        $expiresAt = (int) ($decoded['expires_at'] ?? 0);
        if ($expiresAt > 0 && time() > $expiresAt) {
            @unlink($path);
            return null;
        }

        $payload = $decoded['payload'] ?? null;
        return is_array($payload) ? $payload : null;
    }

    public function put(string $key, array $payload, int $ttlSeconds): void
    {
        if (!is_dir($this->cacheDir)) {
            mkdir($this->cacheDir, 0775, true);
        }

        $record = [
            'expires_at' => time() + max(1, $ttlSeconds),
            'payload' => $payload,
        ];

        file_put_contents($this->pathFor($key), json_encode($record, JSON_UNESCAPED_UNICODE));
    }

    private function pathFor(string $key): string
    {
        return rtrim($this->cacheDir, '/\\') . DIRECTORY_SEPARATOR . sha1($key) . '.json';
    }
}
