<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\AppConfig;
use App\Core\Logger;
use PHPMailer\PHPMailer\Exception as PHPMailerException;
use PHPMailer\PHPMailer\PHPMailer;
use RuntimeException;

final class MailService
{
    /**
     * @var array<string, mixed>|null
     */
    private static ?array $config = null;

    /**
     * @param array<int, array{name: string, content: string, mime: string}> $attachments
     */
    public function send(string $to, string $subject, string $html, string $text = '', array $attachments = []): void
    {
        $mailer = $this->buildMailer();
        $fromAddress = $this->requireMailConfig('from_address');
        $fromName = $this->requireMailConfig('from_name');

        try {
            $mailer->setFrom($fromAddress, $fromName);
            $mailer->addAddress($to);
            $mailer->Subject = $subject;
            $mailer->isHTML(true);
            $mailer->Body = $html;
            $mailer->AltBody = $text !== '' ? $text : strip_tags($html);

            foreach ($attachments as $attachment) {
                $name = $attachment['name'] ?? null;
                $content = $attachment['content'] ?? null;
                $mime = $attachment['mime'] ?? 'application/octet-stream';

                if (!is_string($name) || !is_string($content)) {
                    continue;
                }

                $mailer->addStringAttachment($content, $name, PHPMailer::ENCODING_BASE64, $mime);
            }

            $mailer->send();
        } catch (PHPMailerException $e) {
            Logger::error('Mail send failed: ' . $e->getMessage());
            throw new RuntimeException('Failed to send email');
        }
    }

    /**
     * Builds and configures PHPMailer SMTP transport.
     */
    private function buildMailer(): PHPMailer
    {
        $mailer = new PHPMailer(true);
        $mailer->isSMTP();
        $mailer->Host = $this->requireMailConfig('host');
        $mailer->Port = (int) $this->requireMailConfig('port');
        $mailer->SMTPAuth = true;
        $mailer->Username = $this->requireMailConfig('user');
        $mailer->Password = $this->requireMailConfig('pass');

        $encryption = strtolower(trim($this->requireMailConfig('encryption')));
        $mailer->SMTPSecure = $encryption === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;

        $mailer->CharSet = 'UTF-8';

        return $mailer;
    }

    /**
     * Returns a required mail configuration value.
     */
    private function requireMailConfig(string $key): string
    {
        $config = $this->config();
        $mail = $config['mail'] ?? null;

        if (!is_array($mail) || !array_key_exists($key, $mail)) {
            Logger::error('Missing mail configuration key: ' . $key);
            throw new RuntimeException('Mail configuration is missing');
        }

        $value = trim((string) $mail[$key]);
        if ($value === '') {
            Logger::error('Empty mail configuration value: ' . $key);
            throw new RuntimeException('Mail configuration is missing');
        }

        return $value;
    }

    /**
     * Loads application config once and caches it.
     *
     * @return array<string, mixed>
     */
    private function config(): array
    {
        if (self::$config !== null) {
            return self::$config;
        }

        self::$config = AppConfig::all();

        return self::$config;
    }
}
