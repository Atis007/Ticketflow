<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Models\UserRole;
use App\Services\AuthSessionService;

final class AuthMiddleware
{
    /**
     * @param UserRole[] $requiredRoles
     */
    public static function handle(Request $request, array $requiredRoles = []): void
    {
        $payload = self::authenticate($request);

        if ($requiredRoles !== []) {
            self::assertRole($payload, $requiredRoles);
        }
    }

    /**
     * Returns middleware for authenticated-only routes.
     */
    public static function auth(): callable
    {
        return static function (Request $request): void {
            self::handle($request);
        };
    }

    /**
     * Returns middleware for admin-only routes.
     */
    public static function admin(): callable
    {
        return static function (Request $request): void {
            self::handle($request, [UserRole::ADMIN]);
        };
    }

    /**
     * Returns middleware for authenticated and verified-user routes.
     */
    public static function verified(): callable
    {
        return static function (Request $request): void {
            $payload = self::authenticate($request);

            if (($payload['is_verified'] ?? false) !== true) {
                Logger::warning('Verified account required for this endpoint.');
                Json::error('Email verification required', 403);
            }
        };
    }

    /**
     * Returns the authenticated payload for the current bearer token.
     *
     * @return array{id: int, email: string, role: UserRole, is_verified: bool}
     */
    public static function authenticatedPayload(Request $request): array
    {
        return self::authenticate($request);
    }

    /**
     * Returns the authenticated user id from the current bearer token.
     */
    public static function authenticatedUserId(Request $request): int
    {
        $payload = self::authenticate($request);

        return (int) $payload['id'];
    }

    /**
     * @param array{id: int, email: string, role: UserRole, is_verified: bool} $payload
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

    /**
     * Resolves and validates the current authenticated token payload.
     *
     * @return array{id: int, email: string, role: UserRole, is_verified: bool}
     */
    private static function authenticate(Request $request): array
    {
        $token = $request->bearerToken();

        if ($token === null) {
            Logger::warning('Missing or invalid Authorization header');
            Json::error('Unauthorized', 401);
        }

        $pdo = Database::getConnection();
        $payload = (new AuthSessionService())->authenticateToken($pdo, $token);

        if ($payload === null) {
            Logger::warning('Invalid, expired, or revoked token');
            Json::error('Unauthorized', 401);
        }

        return $payload;
    }

}
