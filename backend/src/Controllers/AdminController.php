<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Models\UserRole;
use App\Validation\UserValidator;
use PDO;
use Exception;

final class AdminController
{
    public function registerAdmin(Request $request, array $params = []): void
    {
        Logger::warning("Attempt to call register endpoint in AdminController");
        Json::error("Call to register in AdminController is not allowed", 405);
    }

    public function loginAdmin(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();

        $data = $request->jsonBody();

        $validator = new UserValidator();
        [$email, $password] = $validator->validateLogin($data);

        $sql = "SELECT email, password, fullname FROM users WHERE email = :email AND role = :role LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':email', $email);
        $stmt->bindValue(':role', UserRole::ADMIN->value);
        try {
            $stmt->execute();
            $loginCredentials = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$loginCredentials || !password_verify($password, $loginCredentials['password'])) {
                Logger::warning("Invalid login attempt for email: {$email}");
                Json::error("Invalid email or password", 401);
            }

            Json::success([
                "message" => "Login for Admin is successful.",
                "user" => [
                    "email" => $email,
                    "fullName" => $loginCredentials['fullname'],
                    "role" => UserRole::ADMIN->value,
                ]
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
    public function index(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();

        try {
            $stmt = $pdo->query(
                "SELECT id, fullname, email, role, created_at 
                 FROM users 
                 ORDER BY id DESC"
            );

            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Json::success($users);
        } catch (Exception $e) {
            Logger::error("AdminController index() DB error: " . $e->getMessage());
            Json::error("Failed to fetch users", 500);
        }
    }


    // GET /api/admin/users/{id}
    public function show(Request $request, array $params): void
    {
        $id = (int)$params['id'];

        if ($id <= 0) {
            Json::error("Invalid user ID", 400);
        }

        $pdo = Database::getConnection();

        try {
            $stmt = $pdo->prepare(
                "SELECT id, fullname, email, role, created_at 
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
    public function store(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();
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
                 VALUES (:fullname, :email, :password, :role)"
            );

            $stmt->execute([
                ':fullname' => $fullname,
                ':email' => $email,
                ':password' => $hashed,
                ':role' => $role->value
            ]);

            Json::success(["message" => "User created"], 201);
        } catch (Exception $e) {
            Logger::error("AdminController store() DB error: " . $e->getMessage());
            Json::error("Failed to create user", 500);
        }
    }


    // PUT /api/admin/users/{id}
    public function update(Request $request, array $params): void
    {
        $id = (int)$params['id'];

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

            Json::success(["message" => "User updated"]);
        } catch (Exception $e) {
            Logger::error("AdminController update() DB error: " . $e->getMessage());
            Json::error("Failed to update user", 500);
        }
    }


    // DELETE /api/admin/users/{id}
    public function destroy(Request $request, array $params): void
    {
        $id = (int)$params['id'];

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

            Json::success(["message" => "User deleted"]);
        } catch (Exception $e) {
            Logger::error("AdminController destroy() DB error: " . $e->getMessage());
            Json::error("Failed to delete user", 500);
        }
    }
}
