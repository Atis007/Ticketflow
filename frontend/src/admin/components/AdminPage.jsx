import { Link } from "react-router-dom";

export function AdminPage({ children }) {
  return <div className="min-h-screen bg-[var(--admin-bg-base)]">{children}</div>;
}

export function PageHeader({ title, subtitle, action, breadcrumbs }) {
  return (
    <div className="sticky top-0 z-[var(--admin-z-sticky)] border-b border-[var(--admin-border)] bg-[var(--admin-bg-base)]">
      <div className="mx-auto max-w-[var(--admin-content-max-width)] px-4 py-5 lg:px-6 lg:py-6 2xl:px-8">
        {breadcrumbs?.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">
            {breadcrumbs.map((crumb, index) => (
              <div key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                {index > 0 && <span className="material-symbols-outlined text-sm">chevron_right</span>}
                {crumb.path ? (
                  <Link to={crumb.path} className="transition-colors hover:text-[var(--admin-text-primary)]">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4 xl:flex-nowrap">
          <div className="min-w-0 flex-1">
            <h1 className="font-[var(--admin-font-display)] text-[var(--admin-text-display)] font-bold text-[var(--admin-text-primary)]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-[var(--admin-text-body)] text-[var(--admin-text-muted)]">{subtitle}</p>
            ) : null}
          </div>
          {action ? <div className="w-full xl:w-auto">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function PageContent({ children, maxWidth = true }) {
  return <div className={`${maxWidth ? "mx-auto max-w-[var(--admin-content-max-width)]" : ""} px-4 py-5 lg:px-6 lg:py-6 2xl:px-8`}>{children}</div>;
}

export function ToolbarRow({ children }) {
  return <div className="mb-6 flex flex-wrap items-center gap-4">{children}</div>;
}
