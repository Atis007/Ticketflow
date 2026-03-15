import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/auth/context/AuthContext";
import { adminQueryKeys, getAnalyticsSales } from "../api";
import { AdminCard, AdminPage, ErrorState, KPICard, LoadingState, PageContent, PageHeader } from "../components";

const DAY_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "365 days", value: 365 },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value ?? 0);
}

function RevenueBarChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-[var(--admin-text-small)] text-[var(--admin-text-muted)]">No data for this period.</p>;
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const CHART_HEIGHT = 160;
  const BAR_GAP = 2;
  const barWidth = Math.max(4, Math.min(24, Math.floor((100 / data.length) * 0.7)));

  const svgWidth = data.length * (barWidth + BAR_GAP);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgWidth} ${CHART_HEIGHT + 24}`}
        height={CHART_HEIGHT + 24}
        style={{ width: "100%", minWidth: Math.min(svgWidth, 300) }}
        aria-label="Daily revenue bar chart"
      >
        {data.map((day, i) => {
          const barHeight = Math.max(2, (day.revenue / maxRevenue) * CHART_HEIGHT);
          const x = i * (barWidth + BAR_GAP);
          const y = CHART_HEIGHT - barHeight;

          return (
            <g key={day.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={2}
                fill="var(--admin-interactive-primary)"
                opacity="0.85"
              >
                <title>{`${day.date}: ${formatCurrency(day.revenue)} (${day.payments} payments)`}</title>
              </rect>
              {data.length <= 31 && i % Math.ceil(data.length / 10) === 0 ? (
                <text
                  x={x + barWidth / 2}
                  y={CHART_HEIGHT + 16}
                  textAnchor="middle"
                  fontSize="8"
                  fill="var(--admin-text-muted)"
                >
                  {day.date.slice(5)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [days, setDays] = useState(30);

  const salesQuery = useQuery({
    queryKey: adminQueryKeys.analytics.sales(days),
    enabled: Boolean(token),
    queryFn: ({ signal }) => getAnalyticsSales({ token, days, signal }),
    placeholderData: (previous) => previous,
  });

  const data = salesQuery.data;
  const summary = data?.summary;
  const topEvents = data?.topEvents ?? [];
  const dailyRevenue = data?.dailyRevenue ?? [];

  const kpis = useMemo(
    () => [
      {
        title: "Total Revenue",
        value: formatCurrency(summary?.totalRevenue),
        icon: <span className="material-symbols-outlined text-3xl">payments</span>,
        color: "var(--admin-interactive-primary)",
      },
      {
        title: "Total Payments",
        value: summary?.totalPayments ?? 0,
        icon: <span className="material-symbols-outlined text-3xl">receipt_long</span>,
        color: "var(--admin-interactive-secondary)",
      },
      {
        title: "Tickets Sold",
        value: summary?.ticketsSold ?? 0,
        icon: <span className="material-symbols-outlined text-3xl">confirmation_number</span>,
        color: "var(--admin-status-success)",
      },
      {
        title: "Failed Payments",
        value: summary?.failedCount ?? 0,
        icon: <span className="material-symbols-outlined text-3xl">money_off</span>,
        color: "var(--admin-status-error)",
      },
      {
        title: "Paid",
        value: summary?.paidCount ?? 0,
        icon: <span className="material-symbols-outlined text-3xl">check_circle</span>,
        color: "var(--admin-status-success)",
      },
      {
        title: "Refunded",
        value: summary?.refundedCount ?? 0,
        icon: <span className="material-symbols-outlined text-3xl">cancel</span>,
        color: "var(--admin-status-warning)",
      },
    ],
    [summary],
  );

  return (
    <AdminPage>
      <PageHeader
        title="Sales Analytics"
        subtitle={`Revenue and payment data for the last ${days} days`}
        action={
          <div className="flex items-center gap-2 rounded-[var(--admin-radius-md)] border border-[var(--admin-border)] bg-[var(--admin-bg-card)] p-1">
            {DAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDays(opt.value)}
                className={`rounded-[var(--admin-radius-sm)] px-3 py-1.5 text-[var(--admin-text-caption)] font-medium transition-[color,background-color,border-color,box-shadow] duration-[var(--admin-transition-fast)] ${
                  days === opt.value
                    ? "bg-[var(--admin-interactive-primary)] text-white shadow-[var(--admin-glow-primary)]"
                    : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      <PageContent>
        {salesQuery.isPending && !data ? <LoadingState message="Loading analytics…" /> : null}

        {salesQuery.error ? (
          <ErrorState
            title="Failed to load analytics"
            message={salesQuery.error.message || "Could not load sales data."}
            onRetry={() => salesQuery.refetch()}
          />
        ) : null}

        {!salesQuery.error && data ? (
          <>
            <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-6 xl:gap-6">
              {kpis.map((kpi) => (
                <KPICard key={kpi.title} {...kpi} />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <AdminCard title="Daily Revenue" subtitle={`${days}-day trend`} noPadding>
                <div className="p-6">
                  <RevenueBarChart data={dailyRevenue} />
                </div>
              </AdminCard>

              <AdminCard title="Top Events" noPadding>
                {topEvents.length === 0 ? (
                  <div className="px-6 py-8 text-center text-[var(--admin-text-small)] text-[var(--admin-text-muted)]">No event data for this period.</div>
                ) : (
                  <div className="divide-y divide-[var(--admin-border)]">
                    <div className="grid grid-cols-12 gap-2 px-6 py-3 text-[var(--admin-text-caption)] font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">
                      <span className="col-span-1">#</span>
                      <span className="col-span-5">Event</span>
                      <span className="col-span-3 text-right">Revenue</span>
                      <span className="col-span-3 text-right">Payments</span>
                    </div>
                    {topEvents.map((event, index) => (
                      <div key={event.id} className="grid grid-cols-12 items-center gap-2 px-6 py-4">
                        <span className="col-span-1 text-[var(--admin-text-caption)] font-bold text-[var(--admin-text-muted)]">{index + 1}</span>
                        <p className="col-span-5 truncate text-[var(--admin-text-small)] text-[var(--admin-text-primary)]">{event.title}</p>
                        <p className="col-span-3 text-right text-[var(--admin-text-small)] font-medium text-[var(--admin-text-primary)]">{formatCurrency(event.revenue)}</p>
                        <p className="col-span-3 text-right text-[var(--admin-text-small)] text-[var(--admin-text-muted)]">{event.payment_count}</p>
                      </div>
                    ))}
                  </div>
                )}
              </AdminCard>
            </div>
          </>
        ) : null}
      </PageContent>
    </AdminPage>
  );
}
