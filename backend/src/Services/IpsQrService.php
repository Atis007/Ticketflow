<?php

declare(strict_types=1);

namespace App\Services;

final class IpsQrService
{
    /**
     * Builds an NBS IPS QR pipe-delimited payload string.
     *
     * Format: K:PR|V:01|C:1|R:{account}|N:{name}|I:{currency}{amount}|SF:289|S:{desc35}|RO:00{paymentId}
     */
    public function buildPayload(
        int $paymentId,
        float $amount,
        string $currency,
        string $eventTitle,
        string $merchantAccount,
        string $merchantName
    ): string {
        $amountFormatted = number_format($amount, 2, '.', '');
        $description = mb_substr($eventTitle, 0, 35);
        $reference = '00' . $paymentId;

        return implode('|', [
            'K:PR',
            'V:01',
            'C:1',
            'R:' . $merchantAccount,
            'N:' . $merchantName,
            'I:' . $currency . $amountFormatted,
            'SF:289',
            'S:' . $description,
            'RO:' . $reference,
        ]);
    }
}
