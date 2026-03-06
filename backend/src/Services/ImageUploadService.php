<?php

declare(strict_types=1);

namespace App\Services;

use App\Helpers\Json;

final class ImageUploadService
{
    private const MAX_SIZE_BYTES = 5242880;

    /**
     * @var array<int, string>
     */
    private const ALLOWED_TYPES = [
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_PNG => 'png',
    ];

    /**
     * Stores a validated uploaded image and returns the public path.
     *
     * @param array<string, mixed> $file
     */
    public function store(array $file, string $directory, string $prefix = 'image'): string
    {
        if (!isset($file['error']) || (int) $file['error'] === UPLOAD_ERR_NO_FILE) {
            Json::error('Image file is required', 400);
        }

        if ((int) $file['error'] !== UPLOAD_ERR_OK) {
            Json::error('Image upload failed', 400);
        }

        $tmpPath = (string) ($file['tmp_name'] ?? '');
        if ($tmpPath === '' || !is_file($tmpPath)) {
            Json::error('Image upload failed', 400);
        }

        $size = (int) ($file['size'] ?? 0);
        if ($size <= 0) {
            Json::error('Image upload failed', 400);
        }

        if ($size > self::MAX_SIZE_BYTES) {
            Json::error('Image too large. Max size is 5 MB.', 400);
        }

        if (!function_exists('exif_imagetype')) {
            Json::error('Image validation unavailable', 500);
        }

        $imageType = @exif_imagetype($tmpPath);
        if (!$imageType || !isset(self::ALLOWED_TYPES[$imageType])) {
            Json::error('Unsupported image format. Use JPG or PNG.', 400);
        }

        $extension = self::ALLOWED_TYPES[$imageType];
        $timestamp = gmdate('Ymd_His');
        $hash = bin2hex(random_bytes(16));
        $safePrefix = preg_replace('/[^a-z0-9_-]/i', '', $prefix) ?: 'image';
        $filename = $safePrefix . '_' . $timestamp . '_' . $hash . '.' . $extension;
        $publicDir = dirname(__DIR__, 2) . '/public/uploads/' . $directory;

        if (!is_dir($publicDir)) {
            if (!mkdir($publicDir, 0755, true) && !is_dir($publicDir)) {
                Json::error('Failed to create upload directory', 500);
            }
        }

        $destination = $publicDir . '/' . $filename;
        if (!move_uploaded_file($tmpPath, $destination)) {
            Json::error('Failed to save image', 500);
        }

        return '/uploads/' . $directory . '/' . $filename;
    }
}
