<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Router;
use App\Core\CORS;
use App\Core\ErrorHandler;

header('Content-Type: application/json');

// REGISTER GLOBAL ERROR HANDLER
ErrorHandler::register();

CORS::handle();

$router = new Router();
$router->run();
