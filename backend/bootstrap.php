<?php

declare(strict_types=1);

use App\Core\ErrorHandler;
use Dotenv\Dotenv;

use App\Core\Logger;

if (!defined('APP_ROOT')) {
    define('APP_ROOT', __DIR__);
}

require_once APP_ROOT . '/vendor/autoload.php';

if (class_exists(Dotenv::class)) {
    $dotenv = Dotenv::createImmutable(APP_ROOT);
    $dotenv->safeLoad();
}

if (!empty($_ENV['TIMEZONE'])) {
    date_default_timezone_set($_ENV['TIMEZONE']);
}

// Load configuration file if it exists
$configPath = APP_ROOT . '/config/config.php';
if (file_exists($configPath)) {
    require_once $configPath;
}

// Disable error display in production
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Register global error handler
ErrorHandler::register();
