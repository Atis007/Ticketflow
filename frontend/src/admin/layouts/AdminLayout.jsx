import { useMemo } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/context/AuthContext";

const navigation = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", path: "/admin/dashboard", icon: "dashboard" }],
  },
  {
    title: "Management",
    items: [
      { label: "Users", path: "/admin/users", icon: "group" },
      { label: "Events", path: "/admin/events", icon: "event" },
      { label: "Categories", path: "/admin/categories", icon: "category" },
    ],
  },
  {
    title: "Logs",
    items: [
      { label: "Device Logs", path: "/admin/logs/device", icon: "devices" },
      { label: "Admin Logs", path: "/admin/logs/admin", icon: "admin_panel_settings" },
      { label: "Event Changes", path: "/admin/logs/event-changes", icon: "history" },
    ],
  },
  {
    title: "Security",
    items: [
      { label: "Incidents", path: "/admin/security/incidents", icon: "warning" },
      { label: "IP Blocks", path: "/admin/security/blocks", icon: "block" },
    ],
  },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const title = useMemo(() => {
    for (const group of navigation) {
      const match = group.items.find((item) => location.pathname === item.path);
      if (match) {
        return match.label;
      }
    }
    return "Admin";
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--admin-bg-base)]">
      <aside className="fixed top-20 left-0 z-[var(--admin-z-sidebar)] h-[calc(100dvh-5rem)] w-[var(--admin-sidebar-width)] min-w-[var(--admin-sidebar-width)] border-r border-[var(--admin-border)] bg-[var(--admin-bg-sidebar)]">
        <div className="flex h-full flex-col overflow-y-auto admin-scrollbar">
          <nav className="space-y-6 p-4">
            {navigation.map((group) => (
              <div key={group.title}>
                <h3 className="mb-2 px-3 text-[var(--admin-text-micro)] font-semibold tracking-wider text-[var(--admin-text-disabled)] uppercase">{group.title}</h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`admin-focus-ring relative flex items-center gap-3 rounded-[var(--admin-radius-md)] px-3 py-2.5 text-[var(--admin-text-small)] font-medium transition-all duration-[var(--admin-transition-fast)] ${isActive ? "bg-[var(--admin-interactive-primary)] text-white shadow-[var(--admin-glow-primary)]" : "text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-card)] hover:text-[var(--admin-text-primary)]"}`}
                      >
                        {isActive ? <div className="absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-r-full bg-white" /> : null}
                        <span className="material-symbols-outlined text-xl">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto border-t border-[var(--admin-border)] p-4">
            <button
              type="button"
              onClick={() => {
                handleLogout().catch(() => {
                  // ignore logout API failures; local sign-out still occurs
                });
              }}
              className="admin-focus-ring flex items-center gap-3 rounded-[var(--admin-radius-md)] px-3 py-2.5 text-[var(--admin-text-small)] font-medium text-[var(--admin-text-secondary)] transition-colors hover:bg-[var(--admin-bg-card)] hover:text-[var(--admin-status-error)]"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-[var(--admin-sidebar-width)] w-[calc(100%-var(--admin-sidebar-width))] min-w-0">
        <div className="sticky top-20 z-[var(--admin-z-sticky)] border-b border-[var(--admin-border)] bg-[var(--admin-bg-base)] px-4 py-4 lg:px-6 2xl:px-8">
          <p className="font-[var(--admin-font-display)] text-[var(--admin-text-subheading)] text-[var(--admin-text-primary)]">{title}</p>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
