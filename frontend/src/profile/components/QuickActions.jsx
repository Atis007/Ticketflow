import { Link } from "react-router-dom";

const actions = [
  {
    label: "Browse Events",
    icon: "event",
    to: "/events/music-festival",
  },
  {
    label: "Saved Favorites",
    icon: "favorite",
    to: "/profile",
  },
  {
    label: "Account Settings",
    icon: "settings",
    to: "/profile",
  },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.label}
          to={action.to}
          className="inline-flex items-center justify-between rounded-xl border border-white/10 bg-background-dark/40 px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-primary/40 hover:text-primary"
        >
          <span className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">{action.icon}</span>
            {action.label}
          </span>
          <span className="material-symbols-outlined text-base">chevron_right</span>
        </Link>
      ))}
    </div>
  );
}
