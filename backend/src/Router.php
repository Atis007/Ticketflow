<?php

namespace App;

use App\Middleware\AuthMiddleware;

class Router
{
    private array $routes = [];

    public function __construct()
    {
        // ------- ROUTE DEFINITIONS -------
        $this->register("GET", "/backend", function(){
            echo json_encode(["message" => "Welcome to the API"]);
        });
        $this->register("GET", "/events", function () {
            echo json_encode(["message" => "List of events"]);
        });
        // Public route (no auth)
        $this->register("GET", "/api/ping", function () {
            echo json_encode(["status" => "ok", "message" => "pong"]);
        });

        // Protected example
        $this->register("GET", "/api/profile", function () {
            echo json_encode(["user" => "example_user"]);
        }, [AuthMiddleware::class]);

        // Another example (admin role)
        $this->register("DELETE", "/api/admin/delete", function () {
            echo json_encode(["success" => true]);
        }, [AuthMiddleware::class => ["admin"]]);
    }

    public function register(string $method, string $path, callable $callback, array $middleware = [])
    {
        $this->routes[] = [
            "method" => $method,
            "path" => $path,
            "callback" => $callback,
            "middleware" => $middleware
        ];
    }

    public function handle(string $reqUri, string $reqMethod)
    {
        $uri = parse_url($reqUri, PHP_URL_PATH);
        $uri = rtrim($uri, '/') ?: '/'; // normalize trailing slashes

        foreach ($this->routes as $route) {
            $routePath = rtrim($route["path"], '/') ?: '/';
            if ($route["method"] === $reqMethod && $routePath === $uri) {

                // ----- MIDDLEWARE -----
                if (!empty($route["middleware"])) {
                    foreach ($route["middleware"] as $mw => $roles) {

                        // If no roles provided (numeric key), use class only
                        if (is_int($mw)) {
                            $mw::handle();
                        } else {
                            $mw::handle($roles); // roles passed
                        }
                    }
                }

                // ----- RUN CONTROLLER/CALLBACK -----
                call_user_func($route["callback"]);
                return;
            }
        }

        // ----- IF NO ROUTE MATCH -----
        http_response_code(404);
        echo json_encode(["error" => "Endpoint not found"]);
    }
}
