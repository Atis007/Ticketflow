<?php

declare(strict_types=1);

use App\Config\Env;

return [
    'app' => [
        'name' => 'Ticketflow',
        'base_url' => Env::require('APP_BASE_URL'),
        'timezone' => Env::require('TIMEZONE'),
    ],

    'database' => [
        'host' => Env::require('DB_HOST'),
        'port' => Env::require('DB_PORT'),
        'user' => Env::require('DB_USER'),
        'pass' => Env::require('DB_PASS'),
        'name' => Env::require('DB_NAME'),
        'sslmode' => Env::require('DB_SSLMODE'),
    ],
    'mail' => [
        'host' => Env::require('MAIL_HOST'),
        'port' => (int) Env::require('MAIL_PORT'),
        'user' => Env::require('MAIL_USER'),
        'pass' => Env::require('MAIL_PASS'),
        'encryption' => Env::require('MAIL_ENCRYPTION'),
        'from_address' => Env::require('MAIL_FROM_ADDRESS'),
        'from_name' => Env::require('MAIL_FROM_NAME'),
    ],

    'auth' => [
        'password_reset_url' => Env::require('PASSWORD_RESET_URL'),
        'reset_token_ttl_seconds' => (int) Env::require('RESET_TOKEN_TTL_SECONDS'),
    ],
];
