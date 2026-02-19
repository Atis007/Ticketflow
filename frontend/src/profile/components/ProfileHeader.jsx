function getDisplayName(user) {
  if (!user) {
    return "User";
  }

  return user.fullName || user.fullname || user.name || "User";
}

function getInitials(name) {
  const normalized = String(name || "").trim();
  if (!normalized) {
    return "U";
  }

  return normalized
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function ProfileHeader({ user, onLogout }) {
  const [imageFailed, setImageFailed] = useState(false);
  const displayName = getDisplayName(user);
  const email = user?.email || "";
  const role = (user?.role || "user").toUpperCase();
  const avatarUrl = user?.avatarUrl || "";
  const showImage = Boolean(avatarUrl) && !imageFailed;

  return (
    <section className="rounded-2xl border border-white/10 bg-surface-dark/70 p-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="relative h-18 w-18 overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-accent-purple/30 to-accent-cyan/30">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  setImageFailed(true);
                }}
              />
            ) : null}
            {!showImage ? <div className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold text-white">{getInitials(displayName)}</div> : null}
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-white">{displayName}</h1>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-primary">{role}</span>
            </div>
            <p className="mt-1 text-sm text-text-soft">{email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-text-soft transition-colors hover:border-danger hover:text-danger"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          Logout
        </button>
      </div>
    </section>
  );
}
import { useState } from "react";
