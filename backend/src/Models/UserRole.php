<?php

declare(strict_types=1);

namespace App\Models;

/**
 * Central list of application roles, leveraging backed enums.
 */
enum UserRole: string
{
    case ADMIN = 'admin';
    case USER = 'user';

    public static function fromString(?string $value): self
    {
        if ($value === null) {
            return self::USER;
        }

        $normalized = strtolower(trim($value));
        return self::tryFrom($normalized) ?? self::USER;
    }
}
