<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use App\Services\AuthSessionService;
use App\Services\ClientIpResolver;
use App\Services\VerificationService;
use Exception;

final class VerificationController
{
    /**
     * Initializes class dependencies.
     */
    public function __construct(
        private readonly VerificationService $verificationService = new VerificationService(),
        private readonly AuthSessionService $authSessionService = new AuthSessionService(),
    ) {}

    /**
     * Handles send verification.
     */
    public function sendVerification(Request $request, array $params = []): void
    {
        try {
            $pdo = Database::getConnection();
            $authUser = $this->requireAuthenticatedUser($request, $pdo);

            if ((bool) ($authUser['is_verified'] ?? false) === true) {
                Json::success(['message' => 'Email is already verified']);
            }

            $this->verificationService->sendForUser(
                $pdo,
                (int) $authUser['id'],
                (string) $authUser['email'],
                (string) $authUser['fullname']
            );

            Json::success(['message' => 'Verification email sent']);
        } catch (Exception $e) {
            Logger::error('Verification send failed: ' . $e->getMessage());
            Json::error($e->getMessage(), 400);
        }
    }

    /**
     * Handles resend verification.
     */
    public function resendVerification(Request $request, array $params = []): void
    {
        $this->sendVerification($request, $params);
    }

    /**
     * Handles confirm verification.
     */
    public function confirmVerification(Request $request, array $params = []): void
    {
        $token = trim((string) ($request->input('token') ?? ''));
        if ($token === '') {
            Json::error('Missing verification token', 400);
        }

        try {
            $pdo = Database::getConnection();
            $result = $this->verificationService->confirmToken(
                $pdo,
                $token,
                $request->header('user-agent'),
                (new ClientIpResolver())->resolve($request),
                $request
            );

            Json::success([
                'message' => 'Email verified successfully',
                'user' => $result['user'],
                'token' => $result['token'],
                'expiresAt' => $result['expires_at'],
            ]);
        } catch (Exception $e) {
            Logger::error('Verification confirm failed: ' . $e->getMessage());
            Json::error($e->getMessage(), 400);
        }
    }

    /**
     * Handles require authenticated user.
     */
    private function requireAuthenticatedUser(Request $request, \PDO $pdo): array
    {
        $token = $request->bearerToken();
        if ($token === null) {
            Json::error('Unauthorized', 401);
        }

        $sessionPayload = $this->authSessionService->authenticateToken($pdo, $token);
        if ($sessionPayload === null) {
            Json::error('Unauthorized', 401);
        }

        $stmt = $pdo->prepare(
            'SELECT id, email, fullname, is_active AS is_verified
             FROM users
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute([':id' => (int) $sessionPayload['id']]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!is_array($user)) {
            Json::error('Unauthorized', 401);
        }

        return $user;
    }
}
