<?php

declare(strict_types=1);

namespace App\Validation;

use App\Helpers\Json;
use App\Core\Logger;

final class UserValidator
{
    private function validateFullName(string $fullName): string
    {
        // One space between names, trim extra spaces
        $fullName = preg_replace('/\s+/', ' ', $fullName);

        // Check length
        if (mb_strlen($fullName) < 7) {
            Json::error("Full name must be at least 7 characters long.", 400);
        }

        // Regex – one space between first and last name, only letters (including accented)
        if (!preg_match('/^[A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű]+ [A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű]+$/u', $fullName)) {
            Json::error("Full name must contain only letters and a single space between first and last name.", 400);
        }

        return $fullName;
    }

    private function validatePassword(
        string $email,
        #[\SensitiveParameter] string $password,
        #[\SensitiveParameter] string $confirmPassword
    ): string
    {
        // Check password length
        if (strlen($password) < 8) {
            Logger::warning("Password too short in user registration for email: {$email}");
            Json::error("Password must be at least 8 characters long.", 400);
        }

        $lowercaseRegex = '/[a-z]/';
        if(!preg_match($lowercaseRegex, $password)){
            Logger::warning("Password missing lowercase letter in user registration for email: {$email}");
            Json::error("Password must contain at least one lowercase letter.", 400);
        }

        $uppercaseRegex = '/[A-Z]/';
        if(!preg_match($uppercaseRegex, $password)){
            Logger::warning("Password missing uppercase letter in user registration for email: {$email}");
            Json::error("Password must contain at least one uppercase letter.", 400);
        }

        $digitRegex = '/[0-9]/';
        if(!preg_match($digitRegex, $password)){
            Logger::warning("Password missing digit in user registration for email: {$email}");
            Json::error("Password must contain at least one digit.", 400);
        }

        $specialCharRegex = '/[!@#$%^&*()_\-+={}[\]|:;"\'<>,.?\/~`]/';
        if(!preg_match($specialCharRegex, $password)){
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

    public function validateRegister(array $data): array
    {
        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');
        $confirmPassword = trim($data['confirm_password'] ?? '');
        $fullName = trim($data['full_name'] ?? '');

        if ($email === '' || $password === '' || $fullName === '') {
            Logger::warning("Registration attempt with missing fields in user registration");
            Json::error("Missing required fields.", 400);
        }

        $validFullName = $this->validateFullName($fullName);
        $validPassword = $this->validatePassword($email, $password, $confirmPassword);
        $validEmail = $this->validateEmail($email);

        // All validations passed, can return the valid inputs
        return [$validEmail, $validPassword, $validFullName];
    }

    public function validateLogin(array $data): array
    {
        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');

        if ($email === '' || $password === '') {
            Logger::warning("Login attempt with missing fields in user registration");
            Json::error("Missing required fields.", 400);
        }

        $validEmail = $this->validateEmail($email);
        // All validations passed, can return the valid inputs
        return [$validEmail, $password];
    }

    public function validateUpdate(array $data): string
    {
        $fullName = trim($data['fullname'] ?? '');

        $validFullName = $this->validateFullName($fullName);
        return $validFullName;
    }
}
