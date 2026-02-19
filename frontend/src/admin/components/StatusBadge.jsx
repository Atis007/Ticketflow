const variantStyles = {
  success: "border-[var(--admin-status-success-border)] bg-[var(--admin-status-success-bg)] text-[var(--admin-status-success)]",
  warning: "border-[var(--admin-status-warning-border)] bg-[var(--admin-status-warning-bg)] text-[var(--admin-status-warning)]",
  error: "border-[var(--admin-status-error-border)] bg-[var(--admin-status-error-bg)] text-[var(--admin-status-error)]",
  info: "border-[var(--admin-status-info-border)] bg-[var(--admin-status-info-bg)] text-[var(--admin-status-info)]",
  neutral: "border-[var(--admin-status-neutral-border)] bg-[var(--admin-status-neutral-bg)] text-[var(--admin-status-neutral)]",
};

const dotColors = {
  success: "bg-[var(--admin-status-success)]",
  warning: "bg-[var(--admin-status-warning)]",
  error: "bg-[var(--admin-status-error)]",
  info: "bg-[var(--admin-status-info)]",
  neutral: "bg-[var(--admin-status-neutral)]",
};

export function StatusBadge({ variant, children, size = "md", dot = false }) {
  const sizeClasses = size === "sm" ? "gap-1 px-2 py-0.5 text-[var(--admin-text-micro)]" : "gap-1.5 px-2.5 py-1 text-[var(--admin-text-caption)]";

  return (
    <span className={`inline-flex items-center rounded-[var(--admin-radius-sm)] border font-medium ${variantStyles[variant]} ${sizeClasses}`}>
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} /> : null}
      {children}
    </span>
  );
}
