import { useState } from "react";
import { NavLink } from "react-router-dom";

function MainNavigation() {
  const [isExpanded, setIsExpanded] = useState(false);

  function toggleExpand() {
    setIsExpanded(!isExpanded);
    console.log("Search button clicked. Expanded:", !isExpanded);
  }

  return (
    <header className="relative z-50 w-full border-b border-white/5 bg-background-dark/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <NavLink to="/">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-accent-purple to-accent-cyan flex items-center justify-center shadow-lg shadow-accent-purple/20">
              <span className="material-symbols-outlined text-white text-2xl">
                local_activity
              </span>
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white">
              Ticketflow
            </span>
          </div>
        </NavLink>

        {/* will be a hamburger menu in the left side of the header */}
        <nav className="hidden md:flex items-center gap-8">
          {["Concerts", "Festivals", "Parties", "Venues"].map((item) => (
            <NavLink
              key={item}
              className={({ isActive }) =>
                isActive
                  ? "text-sm font-medium text-primary"
                  : "text-sm font-medium text-gray-300 hover:text-primary transition-colors"
              }
              to={`/events/${item.toLowerCase()}`}
            >
              {item}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div
            className={`w-40 max-w-2xl overflow-hidden transition-all duration-500 ease-in-out ${
              isExpanded ? "opacity-100" : "opacity-0"
            }`}
          >
            <form className="group relative flex items-center w-full h-16 rounded-full bg-surface-dark border border-white/10 shadow-xl focus-within:border-accent-purple/50 focus-within:ring-2 focus-within:ring-accent-purple/20 transition-all overflow-hidden">
              <input
                type="search"
                className="flex-1 bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 px-4 text-base"
                placeholder="Search for events..."
                aria-label="Search for events"
              />
            </form>
          </div>

          <button
            type="button"
            className="cursor-pointer hidden sm:flex items-center justify-center w-10 h-10 rounded-full text-gray-300 hover:bg-white/10 transition-all"
            aria-label="Search"
            onClick={toggleExpand}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
          </button>

          <NavLink
            to="/login"
            className={({
              isActive,
            }) => ` hidden sm:flex h-10 px-6 items-center justify-center rounded-full border transition-all
            ${
              isActive
                ? "border-primary text-primary bg-primary/10"
                : "border-white/20 text-gray-300 hover:border-primary/50 hover:text-primary hover:bg-white/5"
            }`}
          >
            Log In
          </NavLink>

          <NavLink
            to="/register"
            className={({
              isActive,
            }) => `h-10 px-6 flex items-center justify-center rounded-full font-semibold transition-all shadow
            ${
              isActive
                ? "bg-primary text-white/90 shadow-[0_0_25px_rgba(43,238,121,0.6)]"
                : "bg-primary/90 text-white/90 hover:bg-primary hover:shadow-[0_0_35px_rgba(43,238,121,0.7)]"
            }`}
          >
            Register
          </NavLink>
        </div>
      </div>
    </header>
  );
}

export default MainNavigation;
