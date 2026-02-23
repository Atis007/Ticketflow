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

    /**
     * Returns get.
     */
    public function get(string $path, callable $handler, array $middleware = []): void
    {
        $this->addRoute('GET', $path, $handler, $middleware);
    }

    /**
     * Handles post.
     */
    public function post(string $path, callable $handler, array $middleware = []): void
    {
        $this->addRoute('POST', $path, $handler, $middleware);
    }

    /**
     * Handles put.
     */
    public function put(string $path, callable $handler, array $middleware = []): void
    {
        $this->addRoute('PUT', $path, $handler, $middleware);
    }

    /**
     * Registers a PATCH route.
     */
    public function patch(string $path, callable $handler, array $middleware = []): void
    {
        $this->addRoute('PATCH', $path, $handler, $middleware);
    }

    /**
     * Handles delete.
     */
    public function delete(string $path, callable $handler, array $middleware = []): void
    {
        $this->addRoute('DELETE', $path, $handler, $middleware);
    }

    /**
     * Handles add route.
     */
    private function addRoute(string $method, string $path, callable $handler, array $middleware): void
    {
        $this->routes[$method][] = [
            'path' => $path,
            'handler' => $handler,
            'middleware' => $middleware
        ];
    }

    /**
     * Handles run.
     */
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

    /**
     * Handles match route.
     */
    private function matchRoute(string $routePath, string $uri, array &$params): bool
    {
        [$pattern, $paramNames] = $this->compileRoutePattern($routePath);
        if (!preg_match($pattern, $uri, $matches)) {
            return false;
        }

        foreach ($paramNames as $name) {
            if (isset($matches[$name])) {
                $params[$name] = $matches[$name];
            }
        }

        return true;
    }

    /**
     * Compiles a route definition to a regex pattern.
     *
     * Supports:
     * - {param} default single-segment match
     * - {param:regex} typed match with custom regex
     *
     * @return array{0:string,1:string[]}
     */
    private function compileRoutePattern(string $routePath): array
    {
        $pattern = '#^';
        $paramNames = [];
        $cursor = 0;

        preg_match_all('/\{(\w+)(?::([^}]+))?\}/', $routePath, $placeholderMatches, PREG_OFFSET_CAPTURE);

        $fullMatches = $placeholderMatches[0] ?? [];
        foreach ($fullMatches as $index => $fullMatch) {
            $placeholder = (string) $fullMatch[0];
            $position = (int) $fullMatch[1];

            $literalPart = substr($routePath, $cursor, $position - $cursor);
            $pattern .= preg_quote($literalPart, '#');

            $name = (string) ($placeholderMatches[1][$index][0] ?? '');
            if ($name === '') {
                $cursor = $position + strlen($placeholder);
                continue;
            }

            $regex = (string) ($placeholderMatches[2][$index][0] ?? '');
            $segmentPattern = $regex !== '' ? $regex : '[^/]+';

            $paramNames[] = $name;
            $pattern .= '(?P<' . $name . '>' . $segmentPattern . ')';
            $cursor = $position + strlen($placeholder);
        }

        $pattern .= preg_quote(substr($routePath, $cursor), '#');
        $pattern .= '$#';

        return [$pattern, $paramNames];
    }

    /**
     * Handles resource.
     */
    public function resource(string $base, string|object $controller, array $middleware = []): void
    {
        // Remove trailing slash if present
        $base = rtrim($base, '/');

        $instance = is_string($controller) ? new $controller() : $controller;

        // Index - Get /resource
        if (is_callable([$instance, 'index'])) {
            $this->get($base, [$instance, 'index'], $middleware);
        }

        // Show – GET /resource/{id}
        if (is_callable([$instance, 'show'])) {
            $this->get($base . '/{id}', [$instance, 'show'], $middleware);
        }

        // Create – POST /resource
        if (is_callable([$instance, 'store'])) {
            $this->post($base, [$instance, 'store'], $middleware);
        }

        // Update – PUT /resource/{id}
        if (is_callable([$instance, 'update'])) {
            $this->put($base . '/{id}', [$instance, 'update'], $middleware);
        }

        // Delete – DELETE /resource/{id}
        if (is_callable([$instance, 'destroy'])) {
            $this->delete($base . '/{id}', [$instance, 'destroy'], $middleware);
        }
    }
}
