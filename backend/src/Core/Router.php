<?php
declare(strict_types=1);

namespace App\Core;

use App\Helpers\Json;

final class Router
{
    /**
     * @var array<string, array<int, array{path: string, handler: callable, middleware: callable[]}>>
     */
    private array $routes = [];

    public function get(string $path, callable $handler, array $middleware = []): void
    {
        $this->addRoute('GET', $path, $handler, $middleware);
    }

    public function post(string $path, callable $handler, array $middleware = []): void
    {
        $this->addRoute('POST', $path, $handler, $middleware);
    }

    public function put(string $path, callable $handler, array $middleware = []): void
    {
        $this->addRoute('PUT', $path, $handler, $middleware);
    }

    public function delete(string $path, callable $handler, array $middleware = []): void
    {
        $this->addRoute('DELETE', $path, $handler, $middleware);
    }

    private function addRoute(string $method, string $path, callable $handler, array $middleware): void
    {
        $this->routes[$method][] = [
            'path' => $path,
            'handler' => $handler,
            'middleware' => $middleware
        ];
    }

    public function run(): void
    {
        $request = Request::fromGlobals();
        $method = $request->method;
        $uri = $request->path;

        foreach (($this->routes[$method] ?? []) as $route) {

            $params = [];
            $match = $this->matchRoute($route['path'], $uri, $params);

            if ($match) {
                foreach ($route['middleware'] as $mw) {
                    $mw($request);
                }

                $route['handler']($request, $params);
                return;
            }
        }

        // If path exists for other methods, respond with 405
        $allowedMethods = $this->findAllowedMethods($uri, $method);
        if ($allowedMethods !== []) {
            header('Allow: ' . implode(', ', $allowedMethods));
            Json::error('Method not allowed', 405);
        }

        Json::error("Endpoint not found", 404);
    }

    /**
     * @return string[]
     */
    private function findAllowedMethods(string $uri, string $currentMethod): array
    {
        $allowed = [];

        foreach ($this->routes as $method => $routes) {
            if ($method === $currentMethod) {
                continue;
            }

            foreach ($routes as $route) {
                $params = [];
                if ($this->matchRoute($route['path'], $uri, $params)) {
                    $allowed[] = $method;
                    break;
                }
            }
        }

        return $allowed;
    }

    private function matchRoute(string $routePath, string $uri, array &$params): bool
    {
        // Escape slashes
        $pattern = preg_replace('#\{(\w+)\}#', '([^/]+)', $routePath);
        $pattern = "#^" . $pattern . "$#";

        if (preg_match($pattern, $uri, $matches)) {

            array_shift($matches);

            preg_match_all('#\{(\w+)\}#', $routePath, $paramNames);
            $paramNames = $paramNames[1];

            foreach ($paramNames as $index => $name) {
                $params[$name] = $matches[$index];
            }

            return true;
        }

        return false;
    }

    public function resource(string $base, string $controller, array $middleware = []): void
    {
        // Remove trailing slash if present
        $base = rtrim($base, '/');

        $instance = new $controller();

        // Index - Get /resource
        $this->get($base, [$instance, 'index'], $middleware);

        // Show – GET /resource/{id}
        $this->get($base . '/{id}', [$instance, 'show'], $middleware);

        // Create – POST /resource
        $this->post($base, [$instance, 'store'], $middleware);

        // Update – PUT /resource/{id}
        $this->put($base . '/{id}', [$instance, 'update'], $middleware);

        // Delete – DELETE /resource/{id}
        $this->delete($base . '/{id}', [$instance, 'destroy'], $middleware);
    }
}
