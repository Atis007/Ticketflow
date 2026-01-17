export default function EventOrganizerCard() {
  return (
    <div className="bg-surface-dark/30 rounded-xl p-4 flex items-center gap-3">
      <div className="size-10 rounded-full bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center font-bold text-white text-xs">
        NC
      </div>
      <div className="flex-1">
        <p className="text-text-muted text-xs uppercase font-bold tracking-wider">Organizer</p>
        <p className="text-white text-sm font-bold">NightCity Events</p>
      </div>
      <button className="size-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors" aria-label="Contact organizer">
        <span className="material-symbols-outlined text-sm">mail</span>
      </button>
    </div>
  );
}
