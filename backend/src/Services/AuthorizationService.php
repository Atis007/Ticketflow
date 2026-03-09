<?php

declare(strict_types=1);

namespace App\Services;

use App\Helpers\Json;
use App\Models\UserRole;

final class AuthorizationService
{
    /**
     * Asserts that the actor is either the resource owner or an admin.
     * Responds with 403 and exits if neither condition is met.
     */
    public function assertOwnerOrAdmin(int $actorId, mixed $actorRole, int $ownerId): void
    {
        $isAdmin = $actorRole instanceof UserRole && $actorRole === UserRole::ADMIN;
        $isOwner = $actorId === $ownerId;

        if (!$isAdmin && !$isOwner) {
            Json::error('Forbidden', 403);
        }
    }

    /**
     * Asserts that the user account is active and not disabled.
     * Responds with 403 and exits if the account is disabled or inactive.
     */
    public function assertAccountActive(\PDO $pdo, int $userId): void
    {
        $stmt = $pdo->prepare(
            'SELECT is_active, is_disabled FROM users WHERE id = :id LIMIT 1'
        );
        $stmt->bindValue(':id', $userId, \PDO::PARAM_INT);
        $stmt->execute();
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!is_array($user)) {
            Json::error('User not found', 404);
        }

        if (isset($user['is_disabled']) && (bool) $user['is_disabled'] === true) {
            Json::error('Account is disabled', 403);
        }

        if (isset($user['is_active']) && (bool) $user['is_active'] === false) {
            Json::error('Account is inactive', 403);
        }
    }
}
