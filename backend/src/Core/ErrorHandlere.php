<?php

declare(strict_types=1);

namespace App\Core;

use Throwable;

final class ErrorHandler
{
    public static function register(): void
    {
        set_exception_handler(function (Throwable $e): void {
            Logger::exception($e);

            http_response_code(500);
            echo json_encode([
                "error" => "Internal server error"
            ]);
        });

        set_error_handler(function ($severity, $message, $file, $line): void {
            Logger::error("PHP ERROR: $message in $file:$line");

            http_response_code(500);
            echo json_encode([
                "error" => "Internal server error"
            ]);
        });
    }
}
