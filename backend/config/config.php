<?php

declare(strict_types=1);

/**
 * Returns a required environment variable value.
 */
function require_env(string $key): string
{
    if (isset($_ENV[$key])) {
        return $_ENV[$key];
    }

    throw new RuntimeException("Environment variable '{$key}' is not set.");
}

return [
    'app' => [
        'name' => 'Ticketflow',
        'base_url' => require_env('APP_BASE_URL'),
        'timezone' => require_env('TIMEZONE'),
    ],

    'database' => [
        'host' => require_env('DB_HOST'),
        'port' => require_env('DB_PORT'),
        'user' => require_env('DB_USER'),
        'pass' => require_env('DB_PASS'),
        'name' => require_env('DB_NAME'),
        'sslmode' => require_env('DB_SSLMODE'),
    ],
    'mail' => [
        'host' => require_env('MAIL_HOST'),
        'port' => (int) require_env('MAIL_PORT'),
        'user' => require_env('MAIL_USER'),
        'pass' => require_env('MAIL_PASS'),
        'encryption' => require_env('MAIL_ENCRYPTION'),
        'from_address' => require_env('MAIL_FROM_ADDRESS'),
        'from_name' => require_env('MAIL_FROM_NAME'),
    ],

    'auth' => [
        'password_reset_url' => require_env('PASSWORD_RESET_URL'),
        'reset_token_ttl_seconds' => (int) require_env('RESET_TOKEN_TTL_SECONDS'),
    ],
];
