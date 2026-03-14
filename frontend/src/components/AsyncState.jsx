const stylesByType = {
  info: {
    container: "border-white/10 bg-surface-dark text-gray-400",
    button: "border-white/20 text-white hover:bg-white/10",
    icon: "progress_activity",
    iconClass: "animate-spin text-accent-cyan",
  },
  error: {
    container: "border-danger/30 bg-danger/10 text-danger-soft",
    button: "border-danger/40 text-danger-soft hover:bg-danger/10",
    icon: "error",
    iconClass: "text-danger",
  },
};

export default function AsyncState({
  type = "info",
  message,
  onRetry,
  className = "",
}) {
  const style = stylesByType[type] || stylesByType.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border p-6 text-sm ${style.container} ${className}`.trim()}
    >
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined text-xl shrink-0 ${style.iconClass}`}>
          {style.icon}
        </span>
        <p>{message}</p>
      </div>

      {typeof onRetry === "function" ? (
        <button
          type="button"
          onClick={onRetry}
          className={`mt-3 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors duration-200 ${style.button}`}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
