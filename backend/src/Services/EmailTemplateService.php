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
        bool $isPaid,
        bool $hasReceiptAttachment
    ): array {
        $safeName = htmlspecialchars($fullName, ENT_QUOTES, 'UTF-8');
        $safeEventTitle = htmlspecialchars($eventTitle, ENT_QUOTES, 'UTF-8');

        $attachmentLine = $isPaid
            ? '<p>Your ticket PDF and receipt PDF are attached in this email.</p>'
            : '<p>Your ticket PDF is attached in this email.</p>';

        if ($isPaid && !$hasReceiptAttachment) {
            $attachmentLine = '<p>Your ticket PDF is attached in this email.</p>';
        }

        $safeStarsAt = htmlspecialchars($startsAtLabel, ENT_QUOTES, 'UTF-8');
        $safeVenue = htmlspecialchars($venue, ENT_QUOTES, 'UTF-8');
        $safeQr = htmlspecialchars($qrCodeValue, ENT_QUOTES, 'UTF-8');

        $subject = 'Your Ticketflow ticket: ' . $eventTitle;
        $html = <<<HTML
<h2>Hello {$safeName},</h2>
<p>Your ticket documents are ready.</p>
<p><strong>Event:</strong> {$safeEventTitle}</p>
<p><strong>Date:</strong> {$safeStarsAt}</p>
<p><strong>Venue:</strong> {$safeVenue}</p>
<p><strong>Ticket QR:</strong> {$safeQr}</p>
{$attachmentLine}
<p>Please use the attached files at check-in.</p>
HTML;

        $text = "Hello {$fullName},\n\n"
            . "Your ticket documents are ready.\n"
            . "Event: {$eventTitle}\n"
            . "Date: {$startsAtLabel}\n"
            . "Venue: {$venue}\n"
            . "Ticket QR: {$qrCodeValue}\n"
            . ($isPaid
                ? ($hasReceiptAttachment
                    ? "Your ticket PDF and receipt PDF are attached in this email.\n"
                    : "Your ticket PDF is attached in this email.\n")
                : "Your ticket PDF is attached in this email.\n")
            . "Please use the attached files at check-in.\n";

        return [
            'subject' => $subject,
            'html' => $html,
            'text' => $text,
        ];
    }
}
