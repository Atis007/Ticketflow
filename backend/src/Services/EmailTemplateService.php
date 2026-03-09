<?php

declare(strict_types=1);

namespace App\Services;

final class EmailTemplateService
{
    /**
     * Builds the verification email subject and body payload.
     *
     * @return array{subject: string, html: string, text: string}
     */
    public function verificationEmail(string $fullName, string $verifyUrl, string $expiresInLabel = '12 hours'): array
    {
        $safeName = htmlspecialchars($fullName, ENT_QUOTES, 'UTF-8');
        $safeUrl = htmlspecialchars($verifyUrl, ENT_QUOTES, 'UTF-8');

        $subject = 'Verify your Ticketflow email';
        $html = <<<HTML
<h2>Hello {$safeName},</h2>
<p>Thanks for signing up to Ticketflow.</p>
<p>Please verify your email address by clicking the button below:</p>
<p><a href="{$safeUrl}" style="display:inline-block;padding:10px 16px;background:#0b63f6;color:#ffffff;text-decoration:none;border-radius:6px;">Verify Email</a></p>
<p>If the button does not work, copy this link into your browser:</p>
<p>{$safeUrl}</p>
<p>This link expires in {$expiresInLabel}.</p>
HTML;

        $text = "Hello {$fullName},\n\n"
            . "Thanks for signing up to Ticketflow.\n"
            . "Verify your email: {$verifyUrl}\n\n"
            . "This link expires in {$expiresInLabel}.";

        return [
            'subject' => $subject,
            'html' => $html,
            'text' => $text,
        ];
    }

    /**
     * Builds the password reset email subject and body payload.
     *
     * @return array{subject: string, html: string, text: string}
     */
    public function passwordResetEmail(string $fullName, string $resetUrl, string $expiresInLabel = '30 minutes'): array
    {
        $safeName = htmlspecialchars($fullName, ENT_QUOTES, 'UTF-8');
        $safeUrl = htmlspecialchars($resetUrl, ENT_QUOTES, 'UTF-8');

        $subject = 'Reset your Ticketflow password';
        $html = <<<HTML
<h2>Hello {$safeName},</h2>
<p>We received a request to reset your Ticketflow password.</p>
<p><a href="{$safeUrl}" style="display:inline-block;padding:10px 16px;background:#0b63f6;color:#ffffff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
<p>If the button does not work, copy this link into your browser:</p>
<p>{$safeUrl}</p>
<p>This link expires in {$expiresInLabel} and can be used only once.</p>
HTML;

        $text = "Hello {$fullName},\n\n"
            . "We received a request to reset your Ticketflow password.\n"
            . "Reset your password: {$resetUrl}\n\n"
            . "This link expires in {$expiresInLabel} and can be used only once.";

        return [
            'subject' => $subject,
            'html' => $html,
            'text' => $text,
        ];
    }

    /**
     * Builds the ticket delivery email subject and body payload.
     *
     * @return array{subject: string, html: string, text: string}
     */
    public function ticketDeliveryEmail(
        string $fullName,
        string $eventTitle,
        string $startsAtLabel,
        string $venue,
        string $qrCodeValue,
        string $ipsQrPayload = ''
    ): array {
        $safeName = htmlspecialchars($fullName, ENT_QUOTES, 'UTF-8');
        $safeEventTitle = htmlspecialchars($eventTitle, ENT_QUOTES, 'UTF-8');
        $safeStarsAt = htmlspecialchars($startsAtLabel, ENT_QUOTES, 'UTF-8');
        $safeVenue = htmlspecialchars($venue, ENT_QUOTES, 'UTF-8');
        $safeQr = htmlspecialchars($qrCodeValue, ENT_QUOTES, 'UTF-8');

        $ipsBlock = '';
        if ($ipsQrPayload !== '') {
            $safeIps = htmlspecialchars($ipsQrPayload, ENT_QUOTES, 'UTF-8');
            $ipsBlock = "<p><strong>IPS QR (payment reference):</strong><br><code style=\"font-size:11px;word-break:break-all;\">{$safeIps}</code></p>";
        }

        $subject = 'Your Ticketflow ticket: ' . $eventTitle;
        $html = <<<HTML
<h2>Hello {$safeName},</h2>
<p>Your purchase was successful. Here are your ticket details.</p>
<p><strong>Event:</strong> {$safeEventTitle}</p>
<p><strong>Date:</strong> {$safeStarsAt}</p>
<p><strong>Venue:</strong> {$safeVenue}</p>
<p><strong>Ticket QR code:</strong><br><code style="font-size:11px;word-break:break-all;">{$safeQr}</code></p>
{$ipsBlock}
<p>Please present your ticket QR code at the venue entrance for check-in.</p>
HTML;

        $ipsText = $ipsQrPayload !== ''
            ? "IPS QR (payment reference): {$ipsQrPayload}\n"
            : '';

        $text = "Hello {$fullName},\n\n"
            . "Your purchase was successful. Here are your ticket details.\n"
            . "Event: {$eventTitle}\n"
            . "Date: {$startsAtLabel}\n"
            . "Venue: {$venue}\n"
            . "Ticket QR code: {$qrCodeValue}\n"
            . $ipsText
            . "Please present your ticket QR code at the venue entrance for check-in.\n";

        return [
            'subject' => $subject,
            'html' => $html,
            'text' => $text,
        ];
    }

    /**
     * Builds a ticket delivery email containing multiple QR codes.
     *
     * @param string[] $qrCodes
     * @return array{subject: string, html: string, text: string}
     */
    public function multiTicketDeliveryEmail(
        string $fullName,
        string $eventTitle,
        string $startsAtLabel,
        string $venue,
        array $qrCodes,
        string $ipsQrPayload = ''
    ): array {
        if (count($qrCodes) <= 1) {
            return $this->ticketDeliveryEmail(
                $fullName,
                $eventTitle,
                $startsAtLabel,
                $venue,
                $qrCodes[0] ?? '',
                $ipsQrPayload
            );
        }

        $safeName = htmlspecialchars($fullName, ENT_QUOTES, 'UTF-8');
        $safeEventTitle = htmlspecialchars($eventTitle, ENT_QUOTES, 'UTF-8');
        $safeStartsAt = htmlspecialchars($startsAtLabel, ENT_QUOTES, 'UTF-8');
        $safeVenue = htmlspecialchars($venue, ENT_QUOTES, 'UTF-8');
        $ticketCount = count($qrCodes);

        $qrHtmlParts = [];
        $qrTextParts = [];
        foreach ($qrCodes as $i => $qr) {
            $num = $i + 1;
            $safeQr = htmlspecialchars($qr, ENT_QUOTES, 'UTF-8');
            $qrHtmlParts[] = "<p><strong>Ticket #{$num}:</strong><br><code style=\"font-size:11px;word-break:break-all;\">{$safeQr}</code></p>";
            $qrTextParts[] = "Ticket #{$num}: {$qr}";
        }
        $qrHtml = implode("\n", $qrHtmlParts);
        $qrText = implode("\n", $qrTextParts);

        $ipsBlock = '';
        $ipsText = '';
        if ($ipsQrPayload !== '') {
            $safeIps = htmlspecialchars($ipsQrPayload, ENT_QUOTES, 'UTF-8');
            $ipsBlock = "<p><strong>IPS QR (payment reference):</strong><br><code style=\"font-size:11px;word-break:break-all;\">{$safeIps}</code></p>";
            $ipsText = "IPS QR (payment reference): {$ipsQrPayload}\n";
        }

        $subject = 'Your Ticketflow tickets (' . $ticketCount . '): ' . $eventTitle;
        $html = <<<HTML
<h2>Hello {$safeName},</h2>
<p>Your purchase was successful. You have {$ticketCount} tickets.</p>
<p><strong>Event:</strong> {$safeEventTitle}</p>
<p><strong>Date:</strong> {$safeStartsAt}</p>
<p><strong>Venue:</strong> {$safeVenue}</p>
<h3>Your Tickets</h3>
{$qrHtml}
{$ipsBlock}
<p>Please present the relevant ticket QR code at the venue entrance for check-in.</p>
HTML;

        $text = "Hello {$fullName},\n\n"
            . "Your purchase was successful. You have {$ticketCount} tickets.\n"
            . "Event: {$eventTitle}\n"
            . "Date: {$startsAtLabel}\n"
            . "Venue: {$venue}\n\n"
            . $qrText . "\n"
            . $ipsText
            . "Please present the relevant ticket QR code at the venue entrance for check-in.\n";

        return [
            'subject' => $subject,
            'html' => $html,
            'text' => $text,
        ];
    }
}
