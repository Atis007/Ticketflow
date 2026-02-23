<?php

declare(strict_types=1);

namespace App\Services;

use Detection\MobileDetect;

final class DeviceDetectionService
{
    /**
     * @return array{device_type:string,device_name:?string,is_bot:bool}
     */
    public function detect(?string $userAgent): array
    {
        $ua = trim((string) $userAgent);
        if ($ua === '') {
            return [
                'device_type' => 'unknown',
                'device_name' => null,
                'is_bot' => false,
            ];
        }

        if (!class_exists(MobileDetect::class)) {
            return [
                'device_type' => 'unknown',
                'device_name' => null,
                'is_bot' => false,
            ];
        }

        $detect = new MobileDetect(config: ['autoInitOfHttpHeaders' => false]);
        $detect->setUserAgent($ua);

        $isBot = $detect->is('bot') || $detect->is('crawl') || $detect->is('spider');
        $deviceType = 'desktop';

        if ($isBot) {
            $deviceType = 'bot';
        } elseif ($detect->isTablet()) {
            $deviceType = 'tablet';
        } elseif ($detect->isMobile()) {
            $deviceType = 'mobile';
        }

        return [
            'device_type' => $deviceType,
            'device_name' => $this->extractDeviceName($ua),
            'is_bot' => $isBot,
        ];
    }

    private function extractDeviceName(string $userAgent): ?string
    {
        if (str_contains($userAgent, 'iPhone')) {
            return 'iPhone';
        }

        if (str_contains($userAgent, 'iPad')) {
            return 'iPad';
        }

        if (str_contains($userAgent, 'Android')) {
            return 'Android';
        }

        if (str_contains($userAgent, 'Windows')) {
            return 'Windows';
        }

        if (str_contains($userAgent, 'Macintosh')) {
            return 'Mac';
        }

        if (str_contains($userAgent, 'Linux')) {
            return 'Linux';
        }

        return null;
    }
}
