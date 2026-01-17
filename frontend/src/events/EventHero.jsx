export default function EventHero({ feature }) {
  return (
    <section className="relative mb-10 w-full overflow-hidden rounded-[2rem] bg-surface-dark group border border-white/5">
      <div className="absolute inset-0 z-0">
        <img
          src={feature.image}
          alt={feature.title}
          className="h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-linear-to-r from-background-dark via-background-dark/80 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col justify-center p-8 md:p-12 lg:w-2/3 gap-4">
        <span className="mb-2 inline-flex w-fit items-center rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary backdrop-blur">
          {feature.badge}
        </span>
        <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
          {feature.title}
          <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent-cyan">
            {feature.highlight}
          </span>
        </h1>
        <p className="max-w-xl text-lg text-gray-300">{feature.description}</p>
        <div className="flex flex-wrap gap-4 pt-2">
          <button className="flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-bold text-background-dark shadow-[0_0_30px_rgba(43,238,121,0.35)] transition-all hover:bg-primary-dark">
            {feature.ctaPrimary}
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
          <button className="flex items-center gap-2 rounded-full border border-white/15 bg-surface-dark/60 px-7 py-3 text-sm font-bold text-white backdrop-blur transition-all hover:border-primary/40 hover:text-primary">
            {feature.ctaSecondary}
          </button>
        </div>
      </div>
    </section>
  );
}
