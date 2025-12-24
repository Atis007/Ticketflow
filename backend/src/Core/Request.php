<?php

declare(strict_types=1);

namespace App\Core;

use App\Helpers\Json;
use JsonException;

/**
 * Immutable HTTP request wrapper built around PHP 8.2+ readonly classes.
 */
final readonly class Request
{
	public function __construct(
		public string $method,
		public string $uri,
		public string $path,
		public array $headers,
		public array $body,
		public array $query
	) {
	}

	public static function fromGlobals(): self
	{
		$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
		$uri = $_SERVER['REQUEST_URI'] ?? '/';
		$path = self::normalizePath($uri);
		$headers = self::normalizeHeaders(function_exists('getallheaders') ? getallheaders() : []);
		$body = self::decodeJson(file_get_contents('php://input') ?: '');
		$query = $_GET ?? [];

		return new self($method, $uri, $path, $headers, $body, $query);
	}

	/**
	 * Returns the parsed JSON body (empty array when the body is empty).
	 */
	public function jsonBody(): array
	{
		return $this->body;
	}

	/**
	 * Fetches a specific JSON field with an optional fallback.
	 */
	public function input(string $key, mixed $default = null): mixed
	{
		return $this->body[$key] ?? $default;
	}

	public function header(string $name): ?string
	{
		$normalized = strtolower($name);

		return $this->headers[$normalized] ?? null;
	}

	public function bearerToken(): ?string
	{
		$authHeader = $this->header('authorization');
		if ($authHeader === null || !str_starts_with($authHeader, 'Bearer ')) {
			return null;
		}

		$token = trim(substr($authHeader, 7));
		return $token === '' ? null : $token;
	}

	private static function normalizePath(string $uri): string
	{
		$path = parse_url($uri, PHP_URL_PATH) ?? '/';

		$scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
		$path = preg_replace('#^' . preg_quote($scriptDir, '#') . '#', '', $path) ?? $path;

		$path = rtrim($path, '/');
		return $path === '' ? '/' : $path;
	}

	/**
	 * Normalizes headers to a lowercase-keyed array for case-insensitive lookups.
	 */
	private static function normalizeHeaders(?array $headers): array
	{
		if ($headers === null) {
			return [];
		}

		$normalized = [];
		foreach ($headers as $key => $value) {
			$normalized[strtolower((string) $key)] = is_array($value) ? implode(',', $value) : (string) $value;
		}

		return $normalized;
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function decodeJson(string $payload): array
	{
		if ($payload === '') {
			return [];
		}

		try {
			$decoded = json_decode($payload, true, flags: JSON_THROW_ON_ERROR);
		} catch (JsonException) {
			Logger::warning('Malformed JSON payload received.');
			Json::error('Invalid JSON payload', 400);
		}

		if (!is_array($decoded)) {
			Json::error('Invalid JSON payload', 400);
		}

		return $decoded;
	}
}
