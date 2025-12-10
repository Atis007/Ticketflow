<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Helpers\Json;

final class AuthController
{
    public function register(): void
    {
        Json::success(["message" => "Register endpoint OK"]);
    }

    public function login(): void
    {
        Json::success(["message" => "Login endpoint OK"]);
    }
}
