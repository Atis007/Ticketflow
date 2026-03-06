<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Core\RequestContext;
use App\Helpers\Json;
use App\Middleware\AuthMiddleware;
use App\Models\UserRole;
use App\Services\AuthSessionService;
use App\Services\ClientIpResolver;
use App\Services\DeviceLogService;
use App\Services\PasswordResetService;
use App\Services\SecurityService;
use App\Services\VerificationService;
use App\Services\ImageUploadService;
use App\Validation\UserValidator;
use PDO;
use Exception;

final class UserController
{
    /**
     * Registers a regular user account and triggers verification email delivery.
     */
    public function registerUser(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();
        $deviceLogService = new DeviceLogService();

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
        $sql = "INSERT INTO users (email, password, fullname, role) VALUES (:email, :password, :full_name, :role) RETURNING id";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':password', $hashedPassword);
        $stmt->bindParam(':full_name', $fullName);
        $stmt->bindValue(':role', UserRole::USER->value);

        try {
            $stmt->execute();
            $userId = (int) $stmt->fetchColumn();

            try {
                $verificationService = new VerificationService();
                $verificationService->sendForUser($pdo, $userId, $email, $fullName);
            } catch (Exception $mailException) {
                Logger::error('Verification email send failed after registration: ' . $mailException->getMessage());
            }

            $deviceLogService->logAuthEvent($pdo, $request, 'auth.user.register.success', 'success', $userId, null);

            Json::success([
                "message" => "Registration successful. Please verify your email.",
                "userId" => $userId,
            ], 201);
        } catch (Exception $e) {
            Logger::error("Database error in user registration: " . $e->getMessage());
            Json::error("Internal server error", 500);
        }
    }

    /**
     * Authenticates a regular user and returns session token payload.
     */
    public function loginUser(Request $request, array $params = []): void
    {
        $pdo = Database::getConnection();

        $data = $request->jsonBody();

        $validator = new UserValidator();
        [$email, $password] = $validator->validateLogin($data);

        $ipResolver = new ClientIpResolver();
        $ip = $ipResolver->resolve($request) ?? '127.0.0.1';
        $deviceLogService = new DeviceLogService();
        $security = new SecurityService();
        if ($security->isIpBlocked($pdo, $ip)) {
            $deviceLogService->logAuthEvent($pdo, $request, 'auth.user.login.blocked', 'blocked', null, null);
            Json::error('Too many attempts. Try again later.', 429);
        }

        $sql = "SELECT id, email, password, fullname, is_active, is_disabled, disabled_until, avatar_url
                FROM users
                WHERE email = :email AND role = :role
                LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':email', $email);
        $stmt->bindValue(':role', UserRole::USER->value);
        try {
            $stmt->execute();
            $loginCredentials = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$loginCredentials || !password_verify($password, $loginCredentials['password'])) {
                $security->trackFailedLogin($pdo, $ip, $email, $this->securityContext());
                $deviceLogService->logAuthEvent($pdo, $request, 'auth.user.login.failed', 'failed', null, null);
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
                $ip,
                $request->header('x-client-platform') ?? 'web',
                $request->header('x-device-name')
            );

            $deviceLogService->logAuthEvent(
                $pdo,
                $request,
                'auth.user.login.success',
                'success',
                (int) $loginCredentials['id'],
                (int) ($session['session_id'] ?? 0)
            );

            Json::success([
                "message" => "Login successful",
                "user" => [
                    "email" => $email,
                    "fullName" => $loginCredentials['fullname'],
                    "role" => UserRole::USER->value,
                    "isVerified" => (bool) $loginCredentials['is_active'],
                    "isDisabled" => (bool) ($loginCredentials['is_disabled'] ?? false),
                    "avatarUrl" => $loginCredentials['avatar_url'] ?? null,
                ],
                "token" => $session['token'],
                "expiresAt" => $session['expires_at']
            ]);
        } catch (Exception $e) {
            Logger::error("Database error in user login: " . $e->getMessage());
            Json::error("Internal server error", 500);
        }
    }

    /**
     * Revokes the current bearer-token session.
     */
    public function logout(Request $request, array $params = []): void
    {
        $token = $request->bearerToken();
        if ($token === null) {
            Json::error('Unauthorized', 401);
        }

        try {
            $pdo = Database::getConnection();
            $sessionService = new AuthSessionService();
            $sessionService->revokeByToken($pdo, $token);

            Json::success([
                'message' => 'Logout successful'
            ]);
        } catch (Exception $e) {
            Logger::error('Database error in logout: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Returns the currently authenticated user profile from bearer token session.
     */
    public function currentUser(Request $request, array $params = []): void
    {
        $payload = AuthMiddleware::authenticatedPayload($request);
        $userId = (int) ($payload['id'] ?? 0);

        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare(
                'SELECT id, email, fullname, role, is_active, is_disabled, avatar_url
                 FROM users
                 WHERE id = :id
                 LIMIT 1'
            );
            $stmt->execute([':id' => $userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($user)) {
                Json::error('Unauthorized', 401);
            }

            $role = UserRole::tryFrom((string) ($user['role'] ?? ''));
            if ($role === null) {
                Json::error('Unauthorized', 401);
            }

            Json::success([
                'user' => [
                    'id' => (int) $user['id'],
                    'email' => (string) $user['email'],
                    'fullName' => (string) $user['fullname'],
                    'role' => $role->value,
                    'isVerified' => (bool) ($user['is_active'] ?? false),
                    'isDisabled' => (bool) ($user['is_disabled'] ?? false),
                    'avatarUrl' => $user['avatar_url'] ?? null,
                ],
            ]);
        } catch (Exception $e) {
            Logger::error('Current user fetch failed: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Uploads a profile avatar image for the authenticated user.
     */
    public function uploadAvatar(Request $request, array $params = []): void
    {
        $payload = AuthMiddleware::authenticatedPayload($request);
        $userId = (int) ($payload['id'] ?? 0);

        if ($userId <= 0) {
            Json::error('Unauthorized', 401);
        }

        $file = $_FILES['avatar'] ?? $_FILES['image'] ?? null;
        if (!is_array($file)) {
            Json::error('Image file is required', 400);
        }

        $avatarPath = (new ImageUploadService())->store($file, 'avatars', 'avatar');

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare('UPDATE users SET avatar_url = :avatar_url WHERE id = :id');
            $stmt->execute([
                ':avatar_url' => $avatarPath,
                ':id' => $userId,
            ]);

            Json::success([
                'message' => 'Profile image updated',
                'avatarUrl' => $avatarPath,
            ]);
        } catch (Exception $e) {
            Logger::error('Failed to update avatar: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * Accepts forgot-password requests with anti-enumeration response behavior.
     */
    public function forgotPassword(Request $request, array $params = []): void
    {
        $data = $request->jsonBody();
        $validator = new UserValidator();
        [$email] = $validator->validateForgotPassword($data);

        try {
            $pdo = Database::getConnection();
            $ip = (new ClientIpResolver())->resolve($request) ?? '127.0.0.1';
            $security = new SecurityService();

            if ($security->isIpBlocked($pdo, $ip)) {
                Json::success([
                    'message' => 'If this email exists in our system, check your email for the reset link.'
                ]);
            }

            $security->trackForgotPasswordRequest($pdo, $ip, $email, $this->securityContext());

            $service = new PasswordResetService();
            $service->requestReset($pdo, $email);

            Json::success([
                'message' => 'If this email exists in our system, check your email for the reset link.'
            ]);
        } catch (Exception $e) {
            Logger::error('Forgot password flow failed: ' . $e->getMessage());
            Json::success([
                'message' => 'If this email exists in our system, check your email for the reset link.'
            ]);
        }
    }

    /**
     * Resets user password from a valid reset token.
     */
    public function resetPassword(Request $request, array $params = []): void
    {
        $data = $request->jsonBody();
        $validator = new UserValidator();
        [$token, $newPassword] = $validator->validateResetPassword($data);

        try {
            $pdo = Database::getConnection();
            $service = new PasswordResetService();
            $service->resetPassword($pdo, $token, $newPassword);

            Json::success([
                'message' => 'Password reset successful. Please log in with your new password.'
            ]);
        } catch (\RuntimeException $e) {
            Logger::warning('Reset password rejected: ' . $e->getMessage());
            Json::error($e->getMessage(), 400);
        } catch (Exception $e) {
            Logger::error('Reset password flow failed: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function securityContext(): array
    {
        $context = RequestContext::current();

        return [
            'request_id' => $context?->requestId,
            'request_path' => $context?->path,
            'request_method' => $context?->method,
            'platform' => $context?->platform,
            'source' => 'backend',
            'outcome' => 'failed',
            'app_env' => (string) ($_ENV['APP_ENV'] ?? 'unknown'),
            'app_region' => (string) ($_ENV['APP_REGION'] ?? 'unknown'),
            'app_version' => (string) ($_ENV['APP_VERSION'] ?? 'unknown'),
            'app_commit_hash' => (string) ($_ENV['APP_COMMIT_HASH'] ?? 'unknown'),
        ];
    }
}
