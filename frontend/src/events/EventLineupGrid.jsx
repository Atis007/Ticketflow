function getInitials(name) {
  const normalized = String(name || "").trim();
  if (!normalized) {
    return "?";
  }

  return normalized
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function EventLineupGrid({ lineup }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
      {lineup.map((artist) => (
        <div key={artist.name} className="flex flex-col items-center gap-3 group">
          <div className="relative w-full aspect-square rounded-full overflow-hidden border border-border bg-gradient-to-br from-primary/25 via-surface-ink to-accent-cyan/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(var(--color-accent-cyan-rgb),0.2),_transparent_55%)]" />
            <div className="absolute inset-0 flex items-center justify-center text-white/80 font-bold text-lg">
              {getInitials(artist.name)}
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-white font-bold group-hover:text-primary transition-colors">{artist.name}</h3>
            <p className="text-text-muted text-xs">{artist.role}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
