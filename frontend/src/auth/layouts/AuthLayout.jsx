import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <main className="mx-auto w-full max-w-6xl">
      <div className="relative isolate">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(circle_at_center,_rgba(var(--color-primary-rgb),0.22),_rgba(var(--color-surface-dark-rgb),0.1),_transparent_70%)] blur-3xl"></div>
        <Outlet />
      </div>
    </main>
  );
}
