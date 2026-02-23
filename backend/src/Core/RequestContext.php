<?php

declare(strict_types=1);

namespace App\Core;

final class RequestContext
{
    private static ?self $current = null;

    public function __construct(
        public readonly string $requestId,
        public readonly int $startedAtMs,
        public readonly string $method,
        public readonly string $path,
        public readonly ?string $ip,
        public readonly ?string $userAgent,
        public readonly string $platform,
    ) {}

    public static function setCurrent(self $context): void
    {
        self::$current = $context;
    }

    public static function current(): ?self
    {
        return self::$current;
    }

    public function durationMs(): int
    {
        $nowMs = (int) round(microtime(true) * 1000);
        return max(0, $nowMs - $this->startedAtMs);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'request_id' => $this->requestId,
            'method' => $this->method,
            'path' => $this->path,
            'ip' => $this->ip,
            'user_agent' => $this->userAgent,
            'platform' => $this->platform,
            'duration_ms' => $this->durationMs(),
        ];
    }
}
