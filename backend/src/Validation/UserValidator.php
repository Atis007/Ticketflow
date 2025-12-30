<?php

declare(strict_types=1);

namespace App\Validation;

use App\Helpers\Json;
use App\Core\Logger;

final class UserValidator
{
    private const LOWERCASE_REGEX = '/[a-z]/';
    private const UPPERCASE_REGEX = '/[A-Z]/';
    private const DIGIT_REGEX = '/[0-9]/';
    private const SPECIAL_CHAR_REGEX = '/[!@#$%^&*()_\-+={}\[\]|:;"\'<>.,?\/~`]/';
    private const NAME_REGEX = '/^\p{L}+(?:-\p{L}+)*(?: \p{L}+(?:-\p{L}+)*)+$/u';

    private function validateFullName(string $fullName): string
    {
        // Check length
        if (mb_strlen($fullName) < 5) {
            Json::error("Full name must be at least 5 characters long.", 400);
        }

        // Regex – one space between first and last name, only letters (including accented)
        if (!preg_match(self::NAME_REGEX, $fullName)) {
            Json::error("Full name must contain at least two names (separated by a single space) and may use '-' only.", 400);
        }

        return $fullName;
    }

    private function validatePassword(
        string $email,
        #[\SensitiveParameter] string $password,
        #[\SensitiveParameter] string $confirmPassword
    ): string {
        // Check password length
        if (strlen($password) < 8) {
            Logger::warning("Password too short in user registration for email: {$email}");
            Json::error("Password must be at least 8 characters long.", 400);
        }

        if (!preg_match(self::LOWERCASE_REGEX, $password)) {
            Logger::warning("Password missing lowercase letter in user registration for email: {$email}");
            Json::error("Password must contain at least one lowercase letter.", 400);
        }

        if (!preg_match(self::UPPERCASE_REGEX, $password)) {
            Logger::warning("Password missing uppercase letter in user registration for email: {$email}");
            Json::error("Password must contain at least one uppercase letter.", 400);
        }

        if (!preg_match(self::DIGIT_REGEX, $password)) {
            Logger::warning("Password missing digit in user registration for email: {$email}");
            Json::error("Password must contain at least one digit.", 400);
        }

        if (!preg_match(self::SPECIAL_CHAR_REGEX, $password)) {
            Logger::warning("Password missing special character in user registration for email: {$email}");
            Json::error("Password must contain at least one special character.", 400);
        }

        // Check if password and confirm password match
        if ($password !== $confirmPassword) {
            Logger::warning("Password and confirm password do not match in user registration for email: {$email}");
            Json::error("Password and confirm password do not match.", 400);
        }

        return $password;
    }

    private function validateEmail(string $email): string
    {
        // Validate email format
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Logger::warning("Invalid email format in user registration: {$email}");
            Json::error("Invalid email format.", 400);
        }

        return $email;
    }

    private function normalizeFullName(string $fullName): string
    {
        return preg_replace('/\s+/', ' ', trim($fullName));
    }

    public function validateRegister(array $data): array
    {
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';
        $confirmPassword = $data['passwordConfirmation'] ?? '';
        $fullName = $data['fullname'] ?? '';
        
        $normalizedFullName = $this->normalizeFullName($fullName);

        if ($email === '' || $password === '' || $normalizedFullName === '' || $confirmPassword === '') {
            Logger::warning("Registration attempt with missing fields in user registration");
            Json::error("Missing required fields.", 400);
        }

        $validFullName = $this->validateFullName($normalizedFullName);
        $validPassword = $this->validatePassword($email, $password, $confirmPassword);
        $validEmail = $this->validateEmail($email);

        // All validations passed, can return the valid inputs
        return [$validEmail, $validPassword, $validFullName];
    }

    public function validateLogin(array $data): array
    {
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';

        if ($email === '' || $password === '') {
            Logger::warning("Login attempt with missing fields in user login");
            Json::error("Missing required fields.", 400);
        }

        $validEmail = $this->validateEmail($email);
        // All validations passed, can return the valid inputs
        return [$validEmail, $password];
    }
}
