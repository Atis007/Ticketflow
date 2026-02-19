export default function ProfileSection({ title, action, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-surface-dark/60 p-5 backdrop-blur-sm">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-white">{title}</h2>
        {action ? <div>{action}</div> : null}
      </header>
      {children}
    </section>
  );
}
