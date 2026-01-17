const TABS = [
  { id: "overview", label: "Overview" },
  { id: "lineup", label: "Lineup" },
  { id: "venue", label: "Venue" },
  { id: "reviews", label: "Reviews" },
];

export default function EventTabs() {
  return (
    <div className="sticky top-[72px] z-30 bg-background-dark/95 backdrop-blur-md border-b border-surface-dark -mx-4 px-4 lg:mx-0 lg:px-0 lg:rounded-t-lg">
      <nav className="flex gap-8 overflow-x-auto no-scrollbar">
        {TABS.map((tab, index) => (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 px-2 min-w-fit text-sm font-bold leading-normal tracking-[0.015em] transition-colors ${
              index === 0
                ? "border-b-primary text-white"
                : "border-b-transparent text-text-muted hover:text-white"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
