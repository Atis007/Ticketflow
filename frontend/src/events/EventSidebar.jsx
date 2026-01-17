import { useCategories } from "@/categories/CategoryContext";
import { Link } from "react-router-dom";

export default function EventSidebar() {
  const { categories, loading } = useCategories();

  return (
    <aside className="hidden lg:block w-72 min-w-70 shrink-0">
      <div className="sticky top-6 flex h-[calc(100vh-120px)] flex-col overflow-y-auto rounded-3xl border border-white/5 bg-surface-dark p-4 shadow-lg">
        <div className="mb-4 px-2">
          <h2 className="text-lg font-bold text-white">Discover</h2>
          <p className="text-sm text-gray-400">Browse by type</p>
        </div>

        <div className="space-y-1">
          {loading && (
            <div className="space-y-2 px-2 text-sm text-gray-400">
              <div className="h-3 w-24 rounded-full bg-white/10" />
              <div className="h-3 w-28 rounded-full bg-white/10" />
              <div className="h-3 w-20 rounded-full bg-white/10" />
            </div>
          )}

          {!loading &&
            categories.map((category, index) => (
              <Link
                key={category.id}
                to={`/events/${category.slug}`}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-gray-300 transition-colors hover:bg-white/5 hover:text-white ${
                  index === 0 ? "bg-white/5 text-white" : ""
                }`}
              >
                <span className="material-symbols-outlined text-primary">
                  {category.icon}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{category.name}</span>
                  {category.subcategories?.length ? (
                    <span className="text-xs text-gray-500">
                      {category.subcategories.length} subcategories
                    </span>
                  ) : null}
                </div>
                <span className="ml-auto material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  arrow_forward
                </span>
              </Link>
            ))}
        </div>
      </div>
    </aside>
  );
}
