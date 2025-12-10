<?php
declare(strict_types=1);

namespace App\Core;

use App\Controllers\AuthController;

class Router
{
    /** @var array<string, array<string, callable|array{0: string, 1: string}>> */
    private array $routes = [];

    public function __construct()
    {
        // Auth routes
        $this->routes['POST']['/api/auth/login'] = [AuthController::class, 'login'];
        $this->routes['POST']['/api/auth/register'] = [AuthController::class, 'register'];

        // Test route
        $this->routes['GET']['/api/ping'] = function () {
            echo json_encode(["status" => "ok"]);
        };
    }

    public function run(): void
    {
        $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        if(!is_string($requestUri)){
            http_response_code(400);
            echo json_encode(["error" => "Invalid request URI"]);
            return;
        }

        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        // Normalize if Apache adds "/backend"
        $requestUri = preg_replace('#^/backend#', '', $requestUri) ?? $requestUri;

        if (isset($this->routes[$method][$requestUri])) {
            $handler = $this->routes[$method][$requestUri];

            if (is_callable($handler)) {
                $handler();
                return;
            }

            [$class, $func] = $handler;
            (new $class())->$func();
            return;
        }

        http_response_code(404);
        echo json_encode(["error" => "Endpoint not found"]);
    }
}
