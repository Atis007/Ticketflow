import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/context/AuthContext";

import SidebarMenu from "@/components/SidebarMenu";

function MainNavigation() {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { isAuthenticated, logout } = useAuth();

  function toggleExpand() {
    setIsExpanded(!isExpanded);
  }

  function logoutHandler() {
    logout();
    navigate("/");
  }

  return (
    <>
      <SidebarMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <header className="relative z-30 w-full border-b border-white/5 bg-background-dark/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center gap-6">
          <div className="-ml-20 flex items-center gap-4">
            <button
              onClick={() => setMenuOpen(true)}
              className="cursor-pointer p-2 rounded-lg transition-colors text-white"
            >
              <span className="material-symbols-outlined text-3xl">menu</span>
            </button>
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
          </div>

          <div className="ml-auto flex items-center gap-4">
            {isAuthenticated && (
              <>
                <div
                  className={`w-40 max-w-2xl overflow-hidden transition-all duration-500 ease-in-out ${
                    isExpanded ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <form
                    className="group relative flex items-center w-full h-16 rounded-full bg-surface-dark border border-white/10 shadow-xl focus-within:border-accent-purple/50 focus-within:ring-2 focus-within:ring-accent-purple/20 transition-all overflow-hidden"
                    aria-label="Search for events"
                  >
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
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    search
                  </span>
                </button>

                <button
                  onClick={logoutHandler}
                  className="cursor-pointer hidden sm:flex h-10 px-6 items-center justify-center rounded-full border transition-all border-white/20 text-gray-300 hover:border-[#7c3bed]/50 hover:text-[#7c3bed] hover:bg-white/5"
                >
                  Logout
                </button>
              </>
            )}

            {!isAuthenticated && (
              <>
                <NavLink
                  to="/login"
                  className={({
                    isActive,
                  }) => `hidden sm:flex h-10 px-6 items-center justify-center rounded-full border transition-all
            ${
              isActive
                ? " border-[#7c3bed] text-[#7c3bed] bg-[#7c3bed]/10"
                : " border-white/20 text-gray-300 hover:border-[#7c3bed]/50 hover:text-[#7c3bed] hover:bg-white/5"
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
                ? "bg-[#7c3bed] font-bold text-white/90 shadow-[0_0_30px_rgba(124,59,237,0.6)]"
                : "bg-[#7c3bed]/90 text-white/90 hover:bg-[#7c3bed] hover:shadow-[0_0_30px_rgba(124,59,237,0.55),0_0_60px_rgba(34,211,238,0.35)]"
            }`}
                >
                  Register
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

export default MainNavigation;
