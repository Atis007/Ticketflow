<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

use App\Core\Router;
use App\Core\CORS;
use App\Core\ErrorHandler;
use App\Controllers\AdminController;
use App\Controllers\CategoryController;
use App\Controllers\UserController;
use App\Middleware\AuthMiddleware;

header('Content-Type: application/json');

// REGISTER GLOBAL ERROR HANDLER
ErrorHandler::register();

CORS::handle();

$router = new Router();

$admin = new AdminController();
$user = new UserController();
$category = new CategoryController();

$router->post("/api/auth/admin/login", [$admin, "loginAdmin"]);
$router->post("/api/auth/admin/register", [$admin, "registerAdmin"]); // disabled, but route exists
$router->post("/api/auth/user/login", [$user, "loginUser"]);
$router->post("/api/auth/user/register", [$user, "registerUser"]);

// Public category route, no authentication required
$router->get("/api/categories", [$category, "index"]);
// Admin category routes, authentication and admin role required
$router->resource("/api/admin/categories", $category, [AuthMiddleware::auth(), AuthMiddleware::admin()]);

// All type of resource routes, commented out for now. With the resource method, you can create all CRUD routes for a resource in one line.
$router->resource("/api/admin/users", $admin, [AuthMiddleware::auth(), AuthMiddleware::admin()]);
/*$router->resource("/api/events", EventController::class);
$router->resource("/api/categories", CategoryController::class);
$router->resource("/api/tickets", TicketController::class);
$router->resource("/api/payments", PaymentController::class);
$router->resource("/api/reservations", ReservationController::class);
$router->resource("/api/seats", EventSeatController::class);*/


$router->run();
