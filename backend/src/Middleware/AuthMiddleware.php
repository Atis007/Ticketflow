<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Helpers\Json;
use App\Core\Logger;

final class AuthMiddleware
{
    /**
     * @param string[] $requiredRoles
     */
    public static function handle(array $requiredRoles = []): void
    {
        $headers = getallheaders();
        if (!is_array($headers)) {
            Logger::error("Unable to read request headers");
            Json::error("Unauthorized", 401);
        }

        $auth = $headers["Authorization"] ?? "";

        if (!is_string($auth) || !str_starts_with($auth, "Bearer ")) {
            Logger::warning("Missing or invalid Authorization header");
            Json::error("Unauthorized", 401);
        }

        $token = trim(substr($auth, 7));
        if ($token === "") {
            Logger::warning("Empty bearer token provuded");
            Json::error("Unauthorized", 401);
        }

        // ----- TODO: Verify JWT -----
        // $payload = JwtService::verify($token);
        // if (!$payload) {
        //     Json::error("Invalid or expired token", 401);
        // }

        // TEMPORARY MOCK PAYLOAD (remove when JWT is ready)
        $payload = [
            "id" => 1,
            "email" => "user@test.com",
            "role" => "admin"   // change to "user", "organizer"...
        ];

        // ----- ROLE CHECK -----
        if ($requiredRoles !== []) {
            $userRole = $payload["role"] ?? null;

            if (!is_string($userRole)) {
                Logger::error("Token payload missing valid role field");
                Json::error("Unauthorized", 401);
            }

            if (!in_array($userRole, $requiredRoles, true)) {
                Logger::warning(
                    "Forbidden access attempt. Required roles: " . implode(",", $requiredRoles)
                );
                Json::error("Forbidden", 403);
            }
        }
    }
}
