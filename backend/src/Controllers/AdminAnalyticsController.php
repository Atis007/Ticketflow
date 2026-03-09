<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Logger;
use App\Core\Request;
use App\Helpers\Json;
use Exception;
use PDO;

final class AdminAnalyticsController
{
    /**
     * Sales analytics for the admin dashboard.
     * GET /api/admin/analytics/sales?days=30
     */
    public function sales(Request $request, array $params = []): void
    {
        $days = max(1, min(365, (int) ($request->query['days'] ?? 30)));

        try {
            $pdo = Database::getConnection();

            // Total revenue
            $revenueStmt = $pdo->prepare(
                "SELECT
                    COALESCE(SUM(amount), 0) AS total_revenue,
                    COUNT(*) AS total_payments,
                    COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paid_count,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_count,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_count
                 FROM payments
                 WHERE created_at >= NOW() - INTERVAL ':days days'"
            );
            // Interval doesn't support parameterized days directly; use string interpolation safely
            $revenueStmt = $pdo->prepare(
                "SELECT
                    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS total_revenue,
                    COUNT(*) AS total_payments,
                    COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paid_count,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_count,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_count
                 FROM payments
                 WHERE created_at >= NOW() - make_interval(days => :days)"
            );
            $revenueStmt->bindValue(':days', $days, PDO::PARAM_INT);
            $revenueStmt->execute();
            $revenue = $revenueStmt->fetch(PDO::FETCH_ASSOC);

            // Tickets sold
            $ticketStmt = $pdo->prepare(
                'SELECT COUNT(*) AS tickets_sold
                 FROM tickets
                 WHERE created_at >= NOW() - make_interval(days => :days)'
            );
            $ticketStmt->bindValue(':days', $days, PDO::PARAM_INT);
            $ticketStmt->execute();
            $tickets = $ticketStmt->fetch(PDO::FETCH_ASSOC);

            // Top events by revenue
            $topStmt = $pdo->prepare(
                "SELECT
                    e.id,
                    e.title,
                    COALESCE(SUM(p.amount), 0) AS revenue,
                    COUNT(p.id) AS payment_count
                 FROM payments p
                 INNER JOIN events e ON e.id = p.event_id
                 WHERE p.status = 'paid'
                   AND p.created_at >= NOW() - make_interval(days => :days)
                 GROUP BY e.id, e.title
                 ORDER BY revenue DESC
                 LIMIT 10"
            );
            $topStmt->bindValue(':days', $days, PDO::PARAM_INT);
            $topStmt->execute();
            $topEvents = $topStmt->fetchAll(PDO::FETCH_ASSOC);

            // Daily revenue for chart
            $dailyStmt = $pdo->prepare(
                "SELECT
                    TO_CHAR(paid_at, 'YYYY-MM-DD') AS date,
                    COALESCE(SUM(amount), 0) AS revenue,
                    COUNT(*) AS payments
                 FROM payments
                 WHERE status = 'paid'
                   AND paid_at >= NOW() - make_interval(days => :days)
                 GROUP BY TO_CHAR(paid_at, 'YYYY-MM-DD')
                 ORDER BY date ASC"
            );
            $dailyStmt->bindValue(':days', $days, PDO::PARAM_INT);
            $dailyStmt->execute();
            $dailyRevenue = $dailyStmt->fetchAll(PDO::FETCH_ASSOC);

            Json::success([
                'period' => ['days' => $days],
                'summary' => [
                    'totalRevenue' => (float) ($revenue['total_revenue'] ?? 0),
                    'totalPayments' => (int) ($revenue['total_payments'] ?? 0),
                    'paidCount' => (int) ($revenue['paid_count'] ?? 0),
                    'failedCount' => (int) ($revenue['failed_count'] ?? 0),
                    'cancelledCount' => (int) ($revenue['cancelled_count'] ?? 0),
                    'ticketsSold' => (int) ($tickets['tickets_sold'] ?? 0),
                ],
                'topEvents' => $topEvents,
                'dailyRevenue' => $dailyRevenue,
            ]);
        } catch (Exception $e) {
            Logger::error('Analytics sales failed: ' . $e->getMessage());
            Json::error('Internal server error', 500);
        }
    }
}
