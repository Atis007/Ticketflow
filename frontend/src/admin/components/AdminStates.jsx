import { AdminButton } from "./AdminButton";

export function EmptyState({ icon = "inbox", title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      <div className="mb-6 rounded-full bg-[var(--admin-surface-input)] p-6">
        <span className="material-symbols-outlined text-6xl text-[var(--admin-text-disabled)]">{icon}</span>
      </div>
      <h3 className="mb-2 text-[var(--admin-text-heading)] font-semibold text-[var(--admin-text-primary)]">{title}</h3>
      {description ? <p className="mb-6 max-w-md text-center text-[var(--admin-text-body)] text-[var(--admin-text-muted)]">{description}</p> : null}
      {action ? (
        <AdminButton variant="primary" onClick={action.onClick}>
          {action.label}
        </AdminButton>
      ) : null}
    </div>
  );
}

export function LoadingState({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <span className="material-symbols-outlined mb-4 animate-spin text-5xl text-[var(--admin-interactive-primary)]">progress_activity</span>
      <p className="text-[var(--admin-text-body)] text-[var(--admin-text-muted)]">{message}</p>
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      <div className="mb-6 rounded-full border border-[var(--admin-status-error-border)] bg-[var(--admin-status-error-bg)] p-6">
        <span className="material-symbols-outlined text-6xl text-[var(--admin-status-error)]">error</span>
      </div>
      <h3 className="mb-2 text-[var(--admin-text-heading)] font-semibold text-[var(--admin-text-primary)]">{title}</h3>
      <p className="mb-6 max-w-md text-center text-[var(--admin-text-body)] text-[var(--admin-text-muted)]">{message}</p>
      {onRetry ? (
        <AdminButton variant="secondary" onClick={onRetry} icon={<span className="material-symbols-outlined text-base">refresh</span>} iconPosition="left">
          Try Again
        </AdminButton>
      ) : null}
    </div>
  );
}
