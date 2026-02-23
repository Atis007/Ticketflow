<?php

declare(strict_types=1);

namespace App\Config;

final class AppConfig
{
    /**
     * @var array<string, mixed>|null
     */
    private static ?array $cache = null;

    public static function load(bool $forceReload = false): array
    {
        if (!$forceReload && self::$cache !== null) {
            return self::$cache;
        }

        if (!defined('APP_ROOT')) {
            self::$cache = [];
            return self::$cache;
        }

        $configPath = APP_ROOT . '/config/config.php';
        if (!file_exists($configPath)) {
            self::$cache = [];
            return self::$cache;
        }

        $loaded = require $configPath;
        self::$cache = is_array($loaded) ? $loaded : [];

        return self::$cache;
    }

    public static function all(): array
    {
        return self::load();
    }
}
