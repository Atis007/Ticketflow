<?php

declare(strict_types=1);

namespace App\Config;

use RuntimeException;

final class Env
{
    public static function require(string $key): string
    {
        if (isset($_ENV[$key])) {
            return (string) $_ENV[$key];
        }

        throw new RuntimeException("Environment variable '{$key}' is not set.");
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        if (!isset($_ENV[$key])) {
            return $default;
        }

        return (string) $_ENV[$key];
    }
}
