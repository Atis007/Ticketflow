export default function EventRelatedGrid({ events }) {
  return (
    <div className="flex flex-col gap-6 mb-20">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-white text-2xl font-bold leading-tight">Similar Vibes</h2>
        <a className="text-primary font-bold text-sm hover:underline" href="#">
          View All
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {events.map((item) => (
          <div
            key={item.title}
            className="group bg-surface-dark/20 rounded-2xl overflow-hidden hover:bg-surface-dark/40 transition-colors border border-transparent hover:border-white/10"
          >
            <div className="aspect-video w-full overflow-hidden relative">
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-md z-10">
                {item.date}
              </div>
              <div className="h-full w-full bg-gradient-to-br from-primary/25 via-surface-ink to-accent-cyan/20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(var(--color-accent-cyan-rgb),0.22),_transparent_55%)]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80">
                  <span className="material-symbols-outlined text-4xl">local_activity</span>
                  <span className="mt-2 text-sm font-semibold">{item.title}</span>
                </div>
              </div>
            </div>
            <div className="p-5 flex flex-col gap-2">
              <h3 className="text-white font-bold text-lg group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <p className="text-text-muted text-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">location_on</span>
                {item.location}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-white text-sm font-bold">From $25</span>
                <button className="text-primary text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                  Get Tickets
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
