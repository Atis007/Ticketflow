<?php

declare(strict_types=1);

namespace App\Core;

use Throwable;

final class Logger
{
    private static string $logDir = __DIR__ . '/../../logs/';

    private static function write(string $file, string $message): void
    {
        if (!is_dir(self::$logDir)) {
            mkdir(self::$logDir, 0775, true);
        }

        $line = "[" . date('Y-m-d H:i:s') . "] " . $message . PHP_EOL;

        file_put_contents(self::$logDir . $file, $line, FILE_APPEND);
    }

    public static function info(string $message): void
    {
        self::write('app.log', $message);
    }

    public static function warning(string $message): void
    {
        self::write('app.log', "WARNING: " . $message);
    }

    public static function error(string $message): void
    {
        self::write('error.log', "ERROR: " . $message);
    }

    public static function exception(Throwable $e): void
    {
        $msg = "EXCEPTION: " . $e->getMessage()
            . " in " . $e->getFile() . ":" . $e->getLine()
            . " | Trace: " . $e->getTraceAsString();

        self::write('error.log', $msg);
    }
}
