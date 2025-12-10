<?php
declare(strict_types=1);

namespace App\Helpers;

final class Json
{
    public static function success(array $data = [], int $code = 200): void{
        http_response_code($code);
        echo json_encode([
            "success" => true,
            "data" => $data
        ]);
        exit;
    }

    public static function error(string $msg, int $code = 400): void
    {
        http_response_code($code);
        echo json_encode([
            "success" => false,
            "error" => $msg
        ]);
        exit;
    }
}