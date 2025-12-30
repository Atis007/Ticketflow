export default function SidebarMenu({ open, onClose }) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-background-dark/80 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-80 bg-surface-dark border-r border-white/10
        transform transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface-dark/95 backdrop-blur border-b border-white/10 p-5 flex items-center justify-between">
          <span className="font-display font-bold text-lg text-white">
            Categories
          </span>
          <button
            onClick={onClose}
            className="cursor-pointer p-2 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2 overflow-y-auto">
          <details className="group">
            <summary className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer select-none text-gray-300 hover:text-white transition-colors">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-accent-cyan">
                  music_note
                </span>
                <span className="font-medium">Music</span>
              </div>
              <span className="material-symbols-outlined text-gray-500 group-open:rotate-180 transition-transform">
                expand_more
              </span>
            </summary>

            <div className="pl-12 pr-2 py-2 space-y-1">
              <a className="block py-1.5 px-3 rounded-lg text-sm text-gray-400 hover:text-primary hover:bg-white/5 transition-colors">
                Concerts
              </a>
              <a className="block py-1.5 px-3 rounded-lg text-sm text-gray-400 hover:text-primary hover:bg-white/5 transition-colors">
                Festivals
              </a>
              <a className="block py-1.5 px-3 rounded-lg text-sm text-gray-400 hover:text-primary hover:bg-white/5 transition-colors">
                Live Music
              </a>
            </div>
          </details>

          {/* Ide más category-k ugyanígy */}
        </div>
      </aside>
    </>
  );
}
