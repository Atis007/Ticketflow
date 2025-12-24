<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Models\UserRole;

final class AuthMiddleware
{
    /**
     * @param UserRole[] $requiredRoles
     */
    public static function handle(Request $request, array $requiredRoles = []): void
    {
        $token = $request->bearerToken();

        if ($token === null) {
            Logger::warning('Missing or invalid Authorization header');
            Json::error('Unauthorized', 401);
        }

        // TODO: Replace with a proper JWT verification service
        $payload = self::mockPayload($token);

        if ($requiredRoles !== []) {
            self::assertRole($payload, $requiredRoles);
        }
    }

    public static function auth(): callable
    {
        return static function (Request $request): void {
            self::handle($request);
        };
    }

    public static function admin(): callable
    {
        return static function (Request $request): void {
            self::handle($request, [UserRole::ADMIN]);
        };
    }

    /**
     * @param array{id: int, email: string, role: UserRole} $payload
     * @param UserRole[] $requiredRoles
     */
    private static function assertRole(array $payload, array $requiredRoles): void
    {
        $userRole = $payload['role'] ?? null;

        if (!$userRole instanceof UserRole) {
            Logger::error('Token payload is missing a valid role.');
            Json::error('Unauthorized', 401);
        }

        if (!in_array($userRole, $requiredRoles, true)) {
            Logger::warning(
                'Forbidden access attempt. Required roles: ' . implode(',', array_map(fn (UserRole $role): string => $role->value, $requiredRoles))
            );
            Json::error('Forbidden', 403);
        }
    }

    private static function mockPayload(string $token): array
    {
        // Keep the mock deterministic for now to simplify local testing
        return [
            'id' => 1,
            'email' => 'user@test.com',
            'role' => str_contains($token, 'admin') ? UserRole::ADMIN : UserRole::USER
        ];
    }
}
