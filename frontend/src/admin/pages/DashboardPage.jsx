import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/auth/context/AuthContext";
import { adminQueryKeys, getHealthSummary, getSyncChanges } from "../api";
import { AdminCard, AdminPage, ErrorState, KPICard, LoadingState, PageContent, PageHeader, StatusBadge } from "../components";
import { formatAdminDateTime } from "../utils/dateTime";

const SYNC_INTERVAL_MS = 20000;

function toEpochMs(rawTimestamp) {
  if (typeof rawTimestamp !== "string" || rawTimestamp.trim() === "") {
    return 0;
  }

  const direct = Date.parse(rawTimestamp);
  if (!Number.isNaN(direct)) {
    return direct;
  }

  const fixed = Date.parse(rawTimestamp.replace(" ", "T"));
  return Number.isNaN(fixed) ? 0 : fixed;
}

function pickTimestamp(item) {
  return item.updated_at || item.changed_at || item.created_at || null;
}

function statusForCollection(collectionName) {
  if (collectionName === "securityIncidents" || collectionName === "securityBlocks") {
    return "warning";
  }

  if (collectionName === "adminLogs" || collectionName === "eventChanges") {
    return "info";
  }

  return "success";
}

function labelForCollection(collectionName, item) {
  switch (collectionName) {
    case "users":
      return `User: ${item.fullname || item.email || item.id}`;
    case "events":
      return `Event: ${item.title || item.slug || item.id}`;
    case "categories":
      return `Category: ${item.name || item.slug || item.id}`;
    case "subcategories":
      return `Subcategory: ${item.name || item.slug || item.id}`;
    case "adminLogs":
      return `Admin action: ${item.action || item.id}`;
    case "deviceLogs":
      return `Device log: ${item.action || item.id}`;
    case "eventChanges":
      return `Event change: ${item.field || item.id}`;
    case "securityIncidents":
      return `Incident: ${item.incident_type || item.id}`;
    case "securityBlocks":
      return `Block: ${item.block_type || item.id}`;
    default:
      return `${collectionName}: ${item.id}`;
  }
}

function flattenChanges(changesPayload) {
  if (!changesPayload || typeof changesPayload !== "object") {
    return [];
  }

  const items = [];

  Object.entries(changesPayload).forEach(([collectionName, rows]) => {
    if (!Array.isArray(rows)) {
      return;
    }

    rows.forEach((row, index) => {
      const timestamp = pickTimestamp(row);

      items.push({
        id: `${collectionName}-${row.id ?? index}`,
        title: labelForCollection(collectionName, row),
        source: collectionName,
        time: timestamp ?? "n/a",
        status: statusForCollection(collectionName),
        timestampMs: toEpochMs(timestamp),
      });
    });
  });

  return items.sort((a, b) => b.timestampMs - a.timestampMs).slice(0, 15);
}

export default function DashboardPage() {
  const { token } = useAuth();
  const syncCursorRef = useRef("");

  useEffect(() => {
    syncCursorRef.current = "";
  }, [token]);

  const summaryQuery = useQuery({
    queryKey: adminQueryKeys.dashboard.summary(),
    enabled: Boolean(token),
    queryFn: ({ signal }) => getHealthSummary({ token, signal }),
    placeholderData: (previous) => previous,
  });

  const syncQuery = useQuery({
    queryKey: adminQueryKeys.dashboard.sync("polling"),
    enabled: Boolean(token),
    queryFn: ({ signal }) =>
      getSyncChanges({
        token,
        since: syncCursorRef.current || undefined,
        signal,
      }),
    placeholderData: (previous) => previous,
    retry: 0,
    refetchInterval: SYNC_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (typeof syncQuery.data?.nextCursor === "string" && syncQuery.data.nextCursor.length > 0) {
      syncCursorRef.current = syncQuery.data.nextCursor;
    }
  }, [syncQuery.data?.nextCursor]);

  const summary = summaryQuery.data;
  const recentChanges = useMemo(() => flattenChanges(syncQuery.data?.changes), [syncQuery.data?.changes]);
  const syncWarning = syncQuery.error?.message || null;

  const kpis = useMemo(
    () => [
      {
        title: "Total Users",
        value: summary?.users ?? 0,
        icon: <span className="material-symbols-outlined text-3xl">group</span>,
        color: "var(--admin-interactive-primary)",
      },
      {
        title: "Verified Users",
        value: summary?.verifiedUsers ?? 0,
        icon: <span className="material-symbols-outlined text-3xl">verified_user</span>,
        color: "var(--admin-interactive-secondary)",
      },
      {
        title: "Disabled Users",
        value: summary?.disabledUsers ?? 0,
        icon: <span className="material-symbols-outlined text-3xl">block</span>,
        color: "var(--admin-status-warning)",
      },
      {
        title: "Upcoming Events",
        value: summary?.upcomingEvents ?? 0,
        icon: <span className="material-symbols-outlined text-3xl">event_upcoming</span>,
        color: "var(--admin-status-info)",
      },
      {
        title: "Failed Payments",
        value: summary?.failedPayments ?? 0,
        icon: <span className="material-symbols-outlined text-3xl">payments</span>,
        color: "var(--admin-status-error)",
      },
      {
        title: "Open Incidents",
        value: summary?.openIncidents ?? 0,
        icon: <span className="material-symbols-outlined text-3xl">warning</span>,
        color: "var(--admin-status-warning)",
      },
      {
        title: "Active Blocks",
        value: summary?.activeBlocks ?? 0,
        icon: <span className="material-symbols-outlined text-3xl">gpp_bad</span>,
        color: "var(--admin-status-error)",
      },
    ],
    [summary],
  );

  return (
    <AdminPage>
      <PageHeader title="Dashboard" subtitle="Overview of your Ticketflow platform" />

      <PageContent>
        {summaryQuery.isPending && !summary ? <LoadingState message="Loading dashboard summary..." /> : null}

        {summaryQuery.error ? (
          <ErrorState
            title="Failed to load dashboard"
            message={summaryQuery.error.message || "Could not load summary metrics."}
            onRetry={() => summaryQuery.refetch()}
          />
        ) : null}

        {!summaryQuery.error && summary ? (
          <>
            <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4 xl:gap-6">
              {kpis.map((kpi) => (
                <KPICard key={kpi.title} {...kpi} />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
              <AdminCard title="Recent Changes" noPadding>
                {syncWarning ? (
                  <div className="border-b border-[var(--admin-border)] px-6 py-3 text-[var(--admin-text-caption)] text-[var(--admin-status-warning)]">{syncWarning}</div>
                ) : null}

                {recentChanges.length === 0 ? (
                  <div className="px-6 py-8 text-[var(--admin-text-small)] text-[var(--admin-text-muted)]">No incremental changes yet.</div>
                ) : (
                  <div className="divide-y divide-[var(--admin-border)]">
                    {recentChanges.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-6 py-4">
                        <div>
                          <p className="text-[var(--admin-text-small)] text-[var(--admin-text-primary)]">{item.title}</p>
                          <p className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">
                            {item.source} • {formatAdminDateTime(item.time)}
                          </p>
                        </div>
                        <StatusBadge variant={item.status} size="sm">
                          {item.status}
                        </StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </AdminCard>

              <AdminCard title="Open Incidents">
                <div className="space-y-4">
                  <p className="text-[var(--admin-text-small)] text-[var(--admin-text-secondary)]">This panel will be connected in the next phase.</p>
                  <StatusBadge variant="warning" dot>
                    Pending deeper integration
                  </StatusBadge>
                </div>
              </AdminCard>

              <AdminCard title="Admin Activity">
                <p className="text-[var(--admin-text-small)] text-[var(--admin-text-secondary)]">Action feed will be connected with admin logs in the next phase.</p>
              </AdminCard>
            </div>
          </>
        ) : null}
      </PageContent>
    </AdminPage>
  );
}
