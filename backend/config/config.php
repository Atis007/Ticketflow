<?php

declare(strict_types=1);

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
        'timezone' => $_ENV['TIMEZONE'] ?? 'Europe/Belgrade',
    ],

    'database' => [
        'host' => require_env('DB_HOST'),
        'user' => require_env('DB_USER'),
        'pass' => require_env('DB_PASS'),
        'name' => require_env('DB_NAME'),
        'charset' => require_env('DB_CHARSET'),
    ],

    // Note: Uncomment and configure these sections as needed, and when they are needed.
    /*'security' => [
        'jwt_secret' => $_ENV['JWT_SECRET'] ?? '',
    ],*/

    /*'mail' => [
        'host' => $_ENV['MAIL_HOST'] ?? 'smtp.mailtrap.io',
        'user' => $_ENV['MAIL_USER'] ?? '',
        'pass' => $_ENV['MAIL_PASS'] ?? '',
        'port' => $_ENV['MAIL_PORT'] ?? 2525,
    ]*/
];
