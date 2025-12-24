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

final class UserController
{
    public function registerUser(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();

        $data = $request->jsonBody();

        $validator = new UserValidator();
        [$email, $password, $fullName] = $validator->validateRegister($data);

        $sql = "SELECT id FROM users WHERE email = :email LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':email', $email);
        $stmt->execute();

        if ($stmt->fetch(PDO::FETCH_ASSOC)) {
            Logger::warning("Registration attempt with existing email: {$email}");
            Json::error("Email already registered. Forgot your password?", 409);
        }

        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        // FORCE ROLE TO 'user' TO PREVENT PRIVILEGE ESCALATION, IGNORE ANY ROLE PROVIDED IN PAYLOAD
        $sql = "INSERT INTO users (email, password, fullname, role) VALUES (:email, :password, :full_name, :role)";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':password', $hashedPassword);
        $stmt->bindParam(':full_name', $fullName);
        $stmt->bindValue(':role', UserRole::USER->value);

        try {
            $stmt->execute();
            Json::success(["message" => "Registration successful"], 201);
        } catch (Exception $e) {
            Logger::error("Database error in user registration: " . $e->getMessage());
            Json::error("Internal server error", 500);
        }
    }

    public function loginUser(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();

        $data = $request->jsonBody();

        $validator = new UserValidator();
        [$email, $password] = $validator->validateLogin($data);

        $sql = "SELECT email, password FROM users WHERE email = :email AND role = :role LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':email', $email);
        $stmt->bindValue(':role', UserRole::USER->value);
        try {
            $stmt->execute();
            $loginCredentials = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$loginCredentials || !password_verify($password, $loginCredentials['password'])) {
                Logger::warning("Invalid login attempt for email: {$email}");
                Json::error("Invalid email or password", 401);
            }

            Json::success(["message" => "Login successful"]);
        } catch (Exception $e) {
            Logger::error("Database error in user login: " . $e->getMessage());
            Json::error("Internal server error", 500);
        }
    }
}
