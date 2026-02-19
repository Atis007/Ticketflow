export function AdminInput({ label, error, helperText, icon, className = "", ...props }) {
  return (
    <div className="w-full">
      {label ? <label className="mb-2 block text-[var(--admin-text-small)] font-medium text-[var(--admin-text-secondary)]">{label}</label> : null}
      <div className="relative">
        {icon ? <div className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--admin-text-muted)]">{icon}</div> : null}
        <input
          className={`admin-focus-ring w-full rounded-[var(--admin-radius-md)] border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-2 text-[var(--admin-text-small)] text-[var(--admin-text-primary)] transition-all duration-[var(--admin-transition-fast)] placeholder:text-[var(--admin-text-disabled)] hover:border-[var(--admin-border-focus)] disabled:cursor-not-allowed disabled:opacity-50 ${icon ? "pl-10" : ""} ${error ? "border-[var(--admin-status-error)] focus:border-[var(--admin-status-error)]" : ""} ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-[var(--admin-text-caption)] text-[var(--admin-status-error)]">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </p>
      ) : null}
      {helperText && !error ? <p className="mt-1.5 text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{helperText}</p> : null}
    </div>
  );
}

export function AdminTextarea({ label, error, helperText, className = "", ...props }) {
  return (
    <div className="w-full">
      {label ? <label className="mb-2 block text-[var(--admin-text-small)] font-medium text-[var(--admin-text-secondary)]">{label}</label> : null}
      <textarea
        className={`admin-focus-ring admin-scrollbar w-full resize-none rounded-[var(--admin-radius-md)] border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-2 text-[var(--admin-text-small)] text-[var(--admin-text-primary)] transition-all duration-[var(--admin-transition-fast)] placeholder:text-[var(--admin-text-disabled)] hover:border-[var(--admin-border-focus)] disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-[var(--admin-status-error)] focus:border-[var(--admin-status-error)]" : ""} ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-[var(--admin-text-caption)] text-[var(--admin-status-error)]">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </p>
      ) : null}
      {helperText && !error ? <p className="mt-1.5 text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{helperText}</p> : null}
    </div>
  );
}

export function AdminSelect({ label, error, helperText, children, className = "", ...props }) {
  return (
    <div className="w-full">
      {label ? <label className="mb-2 block text-[var(--admin-text-small)] font-medium text-[var(--admin-text-secondary)]">{label}</label> : null}
      <div className="relative">
        <select
          className={`admin-focus-ring w-full cursor-pointer appearance-none rounded-[var(--admin-radius-md)] border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-2 pr-10 text-[var(--admin-text-small)] text-[var(--admin-text-primary)] transition-all duration-[var(--admin-transition-fast)] hover:border-[var(--admin-border-focus)] disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-[var(--admin-status-error)] focus:border-[var(--admin-status-error)]" : ""} ${className}`}
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[var(--admin-text-muted)] material-symbols-outlined">expand_more</span>
      </div>
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-[var(--admin-text-caption)] text-[var(--admin-status-error)]">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </p>
      ) : null}
      {helperText && !error ? <p className="mt-1.5 text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{helperText}</p> : null}
    </div>
  );
}
