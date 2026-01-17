export default function EventDetailsHero({ event }) {
  return (
    <div className="rounded-2xl overflow-hidden mb-8 relative group border border-white/5 bg-surface-dark">
      <div
        className="flex min-h-[480px] flex-col gap-6 bg-cover bg-center bg-no-repeat items-start justify-end px-6 pb-10 md:px-10 md:pb-12 transition-transform duration-700"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(var(--color-background-rgb),0) 0%, rgba(var(--color-background-rgb),0.6) 50%, rgba(var(--color-background-rgb),1) 100%), url(${event.heroImage})`,
        }}
      >
        <div className="flex flex-col gap-3 text-left max-w-3xl z-10">
          <div className="flex gap-3 mb-2 flex-wrap">
            {event.categoryBadges.map((badge) => (
              <span
                key={badge.label}
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm border ${
                  badge.tone === "primary"
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-white/10 text-white border-white/10"
                }`}
              >
                {badge.label}
              </span>
            ))}
          </div>

          <h1 className="text-white text-4xl md:text-5xl lg:text-7xl font-black leading-tight tracking-tight drop-shadow-lg">
            {event.title}
          </h1>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-white/90 text-base md:text-lg font-medium mt-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">calendar_month</span>
              <span>{event.dateTime}</span>
            </div>
            <div className="hidden sm:block text-white/30">•</div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">location_on</span>
              <span>{event.venue}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
