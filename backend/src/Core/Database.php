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

    public static function getConnection(): PDO
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        self::loadEnv();

        $params = self::loadParams();

        try {
            $dsn = sprintf("mysql:host=%s;dbname=%s;charset=%s", $params['HOST'], $params['DB'], $params['CHARSET']);

            $pdoOptions = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ];

            self::$instance = new PDO($dsn, $params['USER'], $params['PASSWORD'], $pdoOptions);

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

    private static function loadParams(): array
    {
        $PARAMS = [
            "HOST" => $_ENV['DB_HOST'] ?? '',
            "USER" => $_ENV['DB_USER'] ?? '',
            "PASSWORD" => $_ENV['DB_PASS'] ?? '',
            "DB" => $_ENV['DB_NAME'] ?? '',
            "CHARSET" => $_ENV['DB_CHARSET'] ?? 'utf8mb4'
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
