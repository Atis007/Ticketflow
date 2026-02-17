<?php

declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;
use RuntimeException;
use App\Helpers\Json;

final class Database
{
    private static ?PDO $instance = null;

    /**
     * Returns connection.
     */
    public static function getConnection(): PDO
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        self::loadEnv();

        $params = self::loadParams();

        if (!extension_loaded('pdo_pgsql')) {
            Logger::error('Missing required PHP extension: pdo_pgsql');
            Json::error('Server is not configured for PostgreSQL connections', 500);
        }

        try {
            $dsn = sprintf(
                'pgsql:host=%s;port=%s;dbname=%s;sslmode=%s',
                $params['HOST'],
                $params['PORT'],
                $params['DB'],
                $params['SSLMODE']
            );

            $pdoOptions = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ];

            self::$instance = new PDO($dsn, $params['USER'], $params['PASSWORD'], $pdoOptions);
            self::$instance->exec('SET TIME ZONE ' . self::$instance->quote($params['TIMEZONE']));

            return self::$instance;
        } catch (PDOException $e) {
            Logger::exception($e);
            Json::error("Internal server error", 500);
        }

        throw new RuntimeException("Database connection could not be established.");
    }

    /** 
     * Loads the env variables into an associative array once
     */
    private static function loadEnv(): void
    {
        static $loaded = false;

        if (!$loaded) {
            $dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
            $dotenv->load();
            $loaded = true;

            $timezone = $_ENV['TIMEZONE'] ?? 'Europe/Belgrade';
            date_default_timezone_set($timezone);
        }
    }

    /**
     * Handles load params.
     */
    private static function loadParams(): array
    {
        $PARAMS = [
            "HOST" => $_ENV['DB_HOST'] ?? '',
            "PORT" => $_ENV['DB_PORT'] ?? '',
            "USER" => $_ENV['DB_USER'] ?? '',
            "PASSWORD" => $_ENV['DB_PASS'] ?? '',
            "DB" => $_ENV['DB_NAME'] ?? '',
            "SSLMODE" => $_ENV['DB_SSLMODE'] ?? '',
            "TIMEZONE" => $_ENV['TIMEZONE'] ?? '',
        ];

        foreach ($PARAMS as $key => $value) {
            if ($value === '') {
                if ($key === 'PASSWORD') {
                    // PASSWORD can be empty
                    continue;
                }
                Logger::error("Missing env variable: $key");
                Json::error("Internal server error", 500);
            }
        }

        return $PARAMS;
    }
}
