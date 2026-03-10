<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

use App\Core\Router;
use App\Core\CORS;
use App\Core\ErrorHandler;
use App\Controllers\AdminAiController;
use App\Controllers\AdminAnalyticsController;
use App\Controllers\AdminController;
use App\Controllers\AdminCategoryController;
use App\Controllers\AdminDashboardController;
use App\Controllers\AdminEventController;
use App\Controllers\AdminLogController;
use App\Controllers\AdminSecurityController;
use App\Controllers\CategoryController;
use App\Controllers\EventController;
use App\Controllers\EventSeatController;
use App\Controllers\NotificationController;
use App\Controllers\PaymentController;
use App\Controllers\PurchaseController;
use App\Controllers\ProfileController;
use App\Controllers\TicketController;
use App\Controllers\UserController;
use App\Controllers\VerificationController;
use App\Middleware\AuthMiddleware;

header('Content-Type: application/json');

// REGISTER GLOBAL ERROR HANDLER
ErrorHandler::register();

CORS::handle();

$router = new Router();

$admin = new AdminController();
$adminCategory = new AdminCategoryController();
$adminDashboard = new AdminDashboardController();
$adminEvent = new AdminEventController();
$adminLog = new AdminLogController();
$adminSecurity = new AdminSecurityController();
$user = new UserController();
$category = new CategoryController();
$event = new EventController();
$purchase = new PurchaseController();
$profile = new ProfileController();
$verification = new VerificationController();

$router->post("/api/auth/admin/login", [$admin, "loginAdmin"]);
$router->post("/api/auth/admin/register", [$admin, "registerAdmin"]); // disabled, but route exists
$router->post("/api/auth/user/login", [$user, "loginUser"]);
$router->post("/api/auth/user/register", [$user, "registerUser"]);
$router->post("/api/auth/forgot-password", [$user, "forgotPassword"]);
$router->post("/api/auth/reset-password", [$user, "resetPassword"]);
$router->post("/api/auth/logout", [$user, "logout"], [AuthMiddleware::auth()]);
$router->get("/api/auth/me", [$user, "currentUser"], [AuthMiddleware::auth()]);
$router->post('/api/profile/avatar', [$user, 'uploadAvatar'], [AuthMiddleware::auth()]);
$router->post("/api/auth/verify-email/send", [$verification, "sendVerification"]);
$router->post("/api/auth/verify-email/resend", [$verification, "resendVerification"]);
$router->post("/api/auth/verify-email/confirm", [$verification, "confirmVerification"]);

// Public category route, no authentication required
$router->get("/api/categories", [$category, "index"]);
$router->get('/api/events', [$event, 'index']);
$router->get('/api/events/{id:\d+}', [$event, 'show']);
$router->post('/api/events', [$event, 'store'], [AuthMiddleware::auth()]);
$router->put('/api/events/{id:\d+}', [$event, 'update'], [AuthMiddleware::auth()]);
$router->patch('/api/events/{id:\d+}', [$event, 'update'], [AuthMiddleware::auth()]);
$router->get('/api/events/{category_slug}', [$event, 'indexBySubcategory']);
$router->get('/api/events/{category_slug}/{event_slug}', [$event, 'showBySubcategoryAndSlug']);
$eventSeat = new EventSeatController();
$router->get('/api/events/{id:\d+}/seats', [$eventSeat, 'index']);
$router->post('/api/events/{id:\d+}/seats/reserve', [$eventSeat, 'reserve'], [AuthMiddleware::auth()]);
$router->post('/api/purchases/simulate', [$purchase, 'simulate'], [AuthMiddleware::auth()]);

$payment = new PaymentController();
$router->post('/api/payments/{id:\d+}/confirm', [$payment, 'confirm'], [AuthMiddleware::auth()]);

$ticket = new TicketController();
$router->post('/api/tickets/scan', [$ticket, 'scan'], [AuthMiddleware::auth()]);
$router->get('/api/profile/purchases', [$profile, 'purchases'], [AuthMiddleware::verified()]);
$router->get('/api/profile/favorites', [$profile, 'favorites'], [AuthMiddleware::verified()]);

$notification = new NotificationController();
$router->get('/api/notifications', [$notification, 'index'], [AuthMiddleware::auth()]);
$router->patch('/api/notifications/{id:\d+}/read', [$notification, 'markRead'], [AuthMiddleware::auth()]);
$router->post('/api/notifications/read-all', [$notification, 'markAllRead'], [AuthMiddleware::auth()]);
$router->delete('/api/notifications/{id:\d+}', [$notification, 'destroy'], [AuthMiddleware::auth()]);
// All type of resource routes, commented out for now. With the resource method, you can create all CRUD routes for a resource in one line.
$router->resource("/api/admin/users", $admin, [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->patch('/api/admin/users/{id}/disable', [$admin, 'disableUser'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->patch('/api/admin/users/{id}/enable', [$admin, 'enableUser'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->patch('/api/admin/users/bulk-disable', [$admin, 'bulkDisable'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->patch('/api/admin/users/bulk-enable', [$admin, 'bulkEnable'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);

$router->get('/api/admin/events', [$adminEvent, 'index'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->patch('/api/admin/events/{id}/toggle-active', [$adminEvent, 'toggleActive'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);

$router->get('/api/admin/categories', [$adminCategory, 'index'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->post('/api/admin/categories', [$adminCategory, 'store'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->put('/api/admin/categories/{id}', [$adminCategory, 'update'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->delete('/api/admin/categories/{id}', [$adminCategory, 'destroy'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->post('/api/admin/subcategories', [$adminCategory, 'storeSubcategory'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->put('/api/admin/subcategories/{id}', [$adminCategory, 'updateSubcategory'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->delete('/api/admin/subcategories/{id}', [$adminCategory, 'destroySubcategory'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);

$router->get('/api/admin/logs/device', [$adminLog, 'deviceLogs'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->get('/api/admin/logs/admin', [$adminLog, 'adminLogs'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->get('/api/admin/logs/event-changes', [$adminLog, 'eventChanges'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);

$router->get('/api/admin/security/incidents', [$adminSecurity, 'incidents'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->get('/api/admin/security/blocks', [$adminSecurity, 'blocks'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->post('/api/admin/security/blocks/ip', [$adminSecurity, 'createIpBlock'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->post('/api/admin/security/blocks/{id}/lift', [$adminSecurity, 'liftBlock'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->post('/api/admin/security/incidents/{id}/escalate', [$adminSecurity, 'escalateIncident'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->post('/api/admin/security/incidents/{id}/resolve', [$adminSecurity, 'resolveIncident'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);

$router->get('/api/admin/health/summary', [$adminDashboard, 'healthSummary'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->get('/api/admin/sync/changes', [$adminDashboard, 'syncChanges'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);

$router->post('/api/admin/events/{id:\d+}/generate-layout', [$adminEvent, 'generateLayout'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);

$adminAnalytics = new AdminAnalyticsController();
$router->get('/api/admin/analytics/sales', [$adminAnalytics, 'sales'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);

$adminAi = new AdminAiController();
$router->post('/api/admin/ai/chat', [$adminAi, 'chat'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
$router->get('/api/admin/ai/history', [$adminAi, 'history'], [AuthMiddleware::auth(), AuthMiddleware::admin()]);
/*$router->resource("/api/events", EventController::class);
$router->resource("/api/categories", CategoryController::class);
$router->resource("/api/tickets", TicketController::class);
$router->resource("/api/payments", PaymentController::class);
$router->resource("/api/reservations", ReservationController::class);
$router->resource("/api/seats", EventSeatController::class);*/


$router->run();
