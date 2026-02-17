<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use App\Models\UserRole;
use App\Services\AdminAuditService;
use App\Services\AuthSessionService;
use App\Services\SecurityService;
use App\Validation\UserValidator;
use PDO;
use Exception;

final class AdminController
{
    /**
     * Handles register admin.
     */
    public function registerAdmin(Request $request, array $params = []): void
    {
        Logger::warning("Attempt to call register endpoint in AdminController");
        Json::error("Call to register in AdminController is not allowed", 405);
    }

    /**
     * Handles login admin.
     */
    public function loginAdmin(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();

        $data = $request->jsonBody();

        $validator = new UserValidator();
        [$email, $password] = $validator->validateLogin($data);

        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $security = new SecurityService();

        if ($security->isIpBlocked($pdo, $ip)) {
            Json::error('Too many attempts. Try again later.', 429);
        }

        $sql = "SELECT id, email, password, fullname, is_active, is_disabled, disabled_until
                FROM users
                WHERE email = :email AND role = :role
                LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':email', $email);
        $stmt->bindValue(':role', UserRole::ADMIN->value);
        try {
            $stmt->execute();
            $loginCredentials = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$loginCredentials || !password_verify($password, $loginCredentials['password'])) {
                $security->trackFailedLogin($pdo, $ip, $email);
                Logger::warning("Invalid login attempt for email: {$email}");
                Json::error("Invalid email or password", 401);
            }

            if ((bool) ($loginCredentials['is_disabled'] ?? false) === true) {
                $disabledUntil = $loginCredentials['disabled_until'] ?? null;
                if ($disabledUntil === null || strtotime((string) $disabledUntil) > time()) {
                    Json::error('Account disabled', 403);
                }
            }

            $sessionService = new AuthSessionService();
            $session = $sessionService->issueSession(
                $pdo,
                (int) $loginCredentials['id'],
                $request->header('user-agent'),
                $_SERVER['REMOTE_ADDR'] ?? null,
                $request->header('x-client-platform') ?? 'admin',
                $request->header('x-device-name')
            );

            Json::success([
                "message" => "Login for Admin is successful.",
                "user" => [
                    "email" => $email,
                    "fullName" => $loginCredentials['fullname'],
                    "role" => UserRole::ADMIN->value,
                    "isVerified" => (bool) $loginCredentials['is_active'],
                    "isDisabled" => (bool) ($loginCredentials['is_disabled'] ?? false),
                ],
                "token" => $session['token'],
                "expiresAt" => $session['expires_at']
            ]);
        } catch (Exception $e) {
            Logger::error("Database error in admin login: " . $e->getMessage());
            Json::error("Internal server error", 500);
        }
    }

    /* ------------------------------
       ADMIN CRUD ON USERS
    ------------------------------- */

    // GET /api/admin/users
    /**
     * Handles index.
     */
    public function index(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();
        $page = max(1, (int) ($request->query['page'] ?? 1));
        $pageSize = max(1, min(100, (int) ($request->query['pageSize'] ?? 20)));
        $offset = ($page - 1) * $pageSize;
        $search = trim((string) ($request->query['search'] ?? ''));
        $role = trim((string) ($request->query['role'] ?? ''));
        $isDisabled = $request->query['isDisabled'] ?? null;

        $where = [];
        $bind = [];

        if ($search !== '') {
            $where[] = '(u.fullname ILIKE :search OR u.email ILIKE :search)';
            $bind[':search'] = '%' . $search . '%';
        }
        if ($role !== '') {
            $where[] = 'u.role = :role';
            $bind[':role'] = $role;
        }
        if ($isDisabled !== null && $isDisabled !== '') {
            $where[] = 'u.is_disabled = :is_disabled';
            $bind[':is_disabled'] = filter_var($isDisabled, FILTER_VALIDATE_BOOLEAN);
        }

        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);

        try {
            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM users u {$whereSql}");
            $countStmt->execute($bind);
            $total = (int) $countStmt->fetchColumn();

            $sql = "SELECT
                        u.id,
                        u.fullname,
                        u.email,
                        u.role,
                        u.is_active,
                        u.is_disabled,
                        TO_CHAR(u.created_at, 'YYYY.MM.DD HH24:MI:SS') AS created_at,
                        (SELECT COUNT(*) FROM events e WHERE e.created_by = u.id) AS owned_events_count
                    FROM users u
                    {$whereSql}
                    ORDER BY u.id DESC
                    LIMIT :limit OFFSET :offset";

            $stmt = $pdo->prepare($sql);
            foreach ($bind as $k => $v) {
                $type = is_bool($v) ? PDO::PARAM_BOOL : PDO::PARAM_STR;
                $stmt->bindValue($k, $v, $type);
            }
            $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            Json::success([
                'items' => $stmt->fetchAll(PDO::FETCH_ASSOC),
                'pagination' => [
                    'page' => $page,
                    'pageSize' => $pageSize,
                    'total' => $total,
                    'totalPages' => $pageSize > 0 ? (int) ceil($total / $pageSize) : 1,
                ],
            ]);
        } catch (Exception $e) {
            Logger::error("AdminController index() DB error: " . $e->getMessage());
            Json::error("Failed to fetch users", 500);
        }
    }


    // GET /api/admin/users/{id}
    /**
     * Handles show.
     */
    public function show(Request $request, array $params): void
    {
        $id = (int)$params['id'];

        if ($id <= 0) {
            Json::error("Invalid user ID", 400);
        }

        $pdo = Database::getConnection();

        try {
            $stmt = $pdo->prepare(
                "SELECT id, fullname, email, role, TO_CHAR(created_at, 'YYYY.MM.DD HH24:MI:SS') AS created_at
                 FROM users 
                 WHERE id = :id LIMIT 1"
            );
            $stmt->execute([':id' => $id]);

            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                Json::error("User not found", 404);
            }

            Json::success($user);
        } catch (Exception $e) {
            Logger::error("AdminController show() DB error: " . $e->getMessage());
            Json::error("Failed to fetch user", 500);
        }
    }


    // POST /api/admin/users
    /**
     * Handles store.
     */
    public function store(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();
        $adminId = AuthMiddleware::authenticatedUserId($request);
        $data = $request->jsonBody();

        $validator = new UserValidator();
        [$email, $password, $fullname] = $validator->validateRegister($data);

        $hashed = password_hash($password, PASSWORD_BCRYPT);
        $role = UserRole::fromString($data['role'] ?? null);

        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
        $checkStmt->execute([':email' => $email]);

        if ($checkStmt->fetch(PDO::FETCH_ASSOC)) {
            Logger::warning("Admin attempted to create duplicate email: {$email}");
            Json::error("Email already registered.", 409);
        }

        try {
            $stmt = $pdo->prepare(
                "INSERT INTO users (fullname, email, password, role)
                 VALUES (:fullname, :email, :password, :role)
                 RETURNING id"
            );

            $stmt->execute([
                ':fullname' => $fullname,
                ':email' => $email,
                ':password' => $hashed,
                ':role' => $role->value
            ]);

            $userId = (int) $stmt->fetchColumn();
            (new AdminAuditService())->log($pdo, $adminId, 'user.create', 'user', $userId, ['email' => $email, 'role' => $role->value]);

            Json::success(["message" => "User created"], 201);
        } catch (Exception $e) {
            Logger::error("AdminController store() DB error: " . $e->getMessage());
            Json::error("Failed to create user", 500);
        }
    }


    // PUT /api/admin/users/{id}
    /**
     * Handles update.
     */
    public function update(Request $request, array $params): void
    {
        $id = (int)$params['id'];
        $adminId = AuthMiddleware::authenticatedUserId($request);

        if ($id <= 0) {
            Json::error("Invalid user ID", 400);
        }

        $pdo = Database::getConnection();

        $data = $request->jsonBody();

        $fullname = trim($data['fullname'] ?? '');
        $role = UserRole::fromString($data['role'] ?? null);

        if ($fullname === '') {
            Json::error("Missing required fields", 400);
        }

        try {
            $stmt = $pdo->prepare(
                "UPDATE users 
                 SET fullname = :fullname, role = :role 
                 WHERE id = :id"
            );

            $stmt->execute([
                ':fullname' => $fullname,
                ':role' => $role->value,
                ':id' => $id
            ]);

            if ($stmt->rowCount() === 0) {
                Logger::warning("Admin update miss for id {$id}");
                Json::error("User not found.", 404);
            }

            (new AdminAuditService())->log($pdo, $adminId, 'user.update', 'user', $id, ['role' => $role->value]);

            Json::success(["message" => "User updated"]);
        } catch (Exception $e) {
            Logger::error("AdminController update() DB error: " . $e->getMessage());
            Json::error("Failed to update user", 500);
        }
    }


    // DELETE /api/admin/users/{id}
    /**
     * Handles destroy.
     */
    public function destroy(Request $request, array $params): void
    {
        $id = (int)$params['id'];
        $adminId = AuthMiddleware::authenticatedUserId($request);

        if ($id <= 0) {
            Json::error("Invalid user ID", 400);
        }

        $pdo = Database::getConnection();

        try {
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = :id");
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() === 0) {
                Logger::warning("Admin delete miss for id {$id}");
                Json::error("User not found.", 404);
            }

            (new AdminAuditService())->log($pdo, $adminId, 'user.delete', 'user', $id, null);

            Json::success(["message" => "User deleted"]);
        } catch (Exception $e) {
            Logger::error("AdminController destroy() DB error: " . $e->getMessage());
            Json::error("Failed to delete user", 500);
        }
    }

    /**
     * Disables a user account manually by admin policy.
     */
    public function disableUser(Request $request, array $params = []): void
    {
        $id = (int) ($params['id'] ?? 0);
        $adminId = AuthMiddleware::authenticatedUserId($request);
        if ($id <= 0) {
            Json::error('Invalid user ID', 400);
        }

        $data = $request->jsonBody();
        $reason = trim((string) ($data['reason'] ?? 'Disabled by admin'));
        $disabledUntil = trim((string) ($data['disabledUntil'] ?? ''));

        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare(
                'UPDATE users
                 SET is_disabled = TRUE,
                     disabled_reason = :reason,
                     disabled_at = NOW(),
                     disabled_by = :disabled_by,
                     disabled_until = NULLIF(:disabled_until, \'\')::timestamptz
                 WHERE id = :id'
            );
            $stmt->execute([
                ':reason' => $reason,
                ':disabled_by' => $adminId,
                ':disabled_until' => $disabledUntil,
                ':id' => $id,
            ]);

            if ($stmt->rowCount() === 0) {
                Json::error('User not found', 404);
            }

            (new AdminAuditService())->log($pdo, $adminId, 'user.disable', 'user', $id, ['reason' => $reason, 'disabledUntil' => $disabledUntil]);
            Json::success(['id' => $id]);
        } catch (Exception $e) {
            Logger::error('Disable user failed: ' . $e->getMessage());
            Json::error('Failed to disable user', 500);
        }
    }

    /**
     * Enables a previously disabled user account.
     */
    public function enableUser(Request $request, array $params = []): void
    {
        $id = (int) ($params['id'] ?? 0);
        $adminId = AuthMiddleware::authenticatedUserId($request);
        if ($id <= 0) {
            Json::error('Invalid user ID', 400);
        }

        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare(
                'UPDATE users
                 SET is_disabled = FALSE,
                     disabled_reason = NULL,
                     disabled_at = NULL,
                     disabled_by = NULL,
                     disabled_until = NULL
                 WHERE id = :id'
            );
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() === 0) {
                Json::error('User not found', 404);
            }

            (new AdminAuditService())->log($pdo, $adminId, 'user.enable', 'user', $id, null);
            Json::success(['id' => $id]);
        } catch (Exception $e) {
            Logger::error('Enable user failed: ' . $e->getMessage());
            Json::error('Failed to enable user', 500);
        }
    }

    /**
     * Disables multiple users in one operation.
     */
    public function bulkDisable(Request $request, array $params = []): void
    {
        $adminId = AuthMiddleware::authenticatedUserId($request);
        $data = $request->jsonBody();
        $ids = $data['ids'] ?? [];
        $reason = trim((string) ($data['reason'] ?? 'Disabled by admin'));

        if (!is_array($ids) || $ids === []) {
            Json::error('ids array is required', 400);
        }

        $cleanIds = array_values(array_unique(array_filter(array_map('intval', $ids), fn (int $id): bool => $id > 0)));
        if ($cleanIds === []) {
            Json::error('No valid ids provided', 400);
        }

        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare(
                "UPDATE users
                 SET is_disabled = TRUE,
                     disabled_reason = :reason,
                     disabled_at = NOW(),
                     disabled_by = :disabled_by
                 WHERE id = ANY(string_to_array(:ids, ',')::bigint[])"
            );
            $stmt->execute([
                ':reason' => $reason,
                ':disabled_by' => $adminId,
                ':ids' => implode(',', $cleanIds),
            ]);

            (new AdminAuditService())->log($pdo, $adminId, 'user.bulk_disable', 'user', null, ['ids' => $cleanIds, 'reason' => $reason]);
            Json::success(['affected' => $stmt->rowCount()]);
        } catch (Exception $e) {
            Logger::error('Bulk disable failed: ' . $e->getMessage());
            Json::error('Failed to disable users', 500);
        }
    }

    /**
     * Enables multiple users in one operation.
     */
    public function bulkEnable(Request $request, array $params = []): void
    {
        $adminId = AuthMiddleware::authenticatedUserId($request);
        $data = $request->jsonBody();
        $ids = $data['ids'] ?? [];

        if (!is_array($ids) || $ids === []) {
            Json::error('ids array is required', 400);
        }

        $cleanIds = array_values(array_unique(array_filter(array_map('intval', $ids), fn (int $id): bool => $id > 0)));
        if ($cleanIds === []) {
            Json::error('No valid ids provided', 400);
        }

        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare(
                "UPDATE users
                 SET is_disabled = FALSE,
                     disabled_reason = NULL,
                     disabled_at = NULL,
                     disabled_by = NULL,
                     disabled_until = NULL
                 WHERE id = ANY(string_to_array(:ids, ',')::bigint[])"
            );
            $stmt->execute([
                ':ids' => implode(',', $cleanIds),
            ]);

            (new AdminAuditService())->log($pdo, $adminId, 'user.bulk_enable', 'user', null, ['ids' => $cleanIds]);
            Json::success(['affected' => $stmt->rowCount()]);
        } catch (Exception $e) {
            Logger::error('Bulk enable failed: ' . $e->getMessage());
            Json::error('Failed to enable users', 500);
        }
    }
}
