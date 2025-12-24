<?php
declare(strict_types=1);

namespace App\Helpers;

final class Json
{
    public static function success(array $data = [], int $code = 200): never
    {
        self::respond([
            'success' => true,
            'data' => $data
        ], $code);
    }

    public static function error(string $msg, int $code = 400): never
    {
        self::respond([
            'success' => false,
            'error' => $msg
        ], $code);
    }

    private static function respond(array $payload, int $code): never
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }
}