const variantStyles = {
  primary:
    "border-transparent bg-[var(--admin-interactive-primary)] text-white shadow-[var(--admin-glow-primary)] hover:bg-[var(--admin-interactive-primary-hover)] active:bg-[var(--admin-interactive-primary-active)]",
  secondary:
    "border-[var(--admin-border)] bg-transparent text-[var(--admin-text-secondary)] hover:border-[var(--admin-border-focus)] hover:bg-[var(--admin-bg-card)] hover:text-[var(--admin-text-primary)]",
  ghost:
    "border-transparent bg-transparent text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-card)] hover:text-[var(--admin-text-primary)]",
  danger: "border-transparent bg-[var(--admin-status-error)] text-white hover:bg-[#dc2626] active:bg-[#b91c1c]",
};

const sizeStyles = {
  sm: "gap-1.5 px-3 py-1.5 text-[var(--admin-text-caption)]",
  md: "gap-2 px-4 py-2 text-[var(--admin-text-small)]",
  lg: "gap-2.5 px-5 py-2.5 text-[var(--admin-text-body)]",
};

export function AdminButton({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`admin-focus-ring inline-flex items-center justify-center rounded-[var(--admin-radius-md)] border font-medium transition-all duration-[var(--admin-transition-fast)] ${variantStyles[variant]} ${sizeStyles[size]} ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className}`}
      {...props}
    >
      {loading ? <span className="material-symbols-outlined animate-spin text-current">progress_activity</span> : null}
      {!loading && icon && iconPosition === "left" ? icon : null}
      {children}
      {!loading && icon && iconPosition === "right" ? icon : null}
    </button>
  );
}
