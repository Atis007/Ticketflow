export function AdminCard({ children, title, subtitle, action, className = "", noPadding = false }) {
  return (
    <div className={`admin-card-elevated ${className}`}>
      {title || subtitle || action ? (
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-6 py-4">
          <div>
            {title ? (
              <h3 className="font-[var(--admin-font-display)] text-[var(--admin-text-subheading)] font-semibold text-[var(--admin-text-primary)]">
                {title}
              </h3>
            ) : null}
            {subtitle ? <p className="mt-0.5 text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{subtitle}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
      <div className={noPadding ? "" : "p-6"}>{children}</div>
    </div>
  );
}

export function KPICard({ title, value, icon, trend, color = "var(--admin-interactive-primary)" }) {
  return (
    <div className="admin-card-elevated p-6">
      <div className="mb-4 flex items-start justify-between">
        <div
          className="rounded-[var(--admin-radius-lg)] p-3"
          style={{
            background: `color-mix(in srgb, ${color} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
          }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        {trend ? (
          <div className={`flex items-center gap-1 text-[var(--admin-text-caption)] font-medium ${trend.isPositive ? "text-[var(--admin-status-success)]" : "text-[var(--admin-status-error)]"}`}>
            <span className="material-symbols-outlined text-base">{trend.isPositive ? "trending_up" : "trending_down"}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        ) : null}
      </div>
      <div>
        <p className="mb-1 text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{title}</p>
        <p className="font-[var(--admin-font-display)] text-[var(--admin-text-display)] font-bold text-[var(--admin-text-primary)]">{value}</p>
      </div>
    </div>
  );
}
