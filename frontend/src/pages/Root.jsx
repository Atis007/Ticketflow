import { Outlet, useNavigation } from "react-router-dom";
import MainNavigation from "../components/MainNavigation.jsx";

export default function RootLayout() {
  const navigation = useNavigation();

  return (
    <div className="bg-background-dark text-white overflow-x-hidden font-body selection:bg-accent-purple selection:text-white min-h-screen">
      <div className="relative min-h-screen">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-accent-purple rounded-full blur-[120px] opacity-20 animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-accent-cyan rounded-full blur-[100px] opacity-15"></div>
          <div className="absolute top-[40%] right-[20%] w-[20vw] h-[20vw] bg-primary rounded-full blur-[150px] opacity-5"></div>
          <div className="absolute inset-0 circuit-pattern"></div>
        </div>
        <MainNavigation />
        <main className="relative z-10 px-6 py-12 lg:py-20">
          {navigation.state === "loading" && (
            <div className="absolute top-8 right-8 flex items-center gap-2 rounded-full border border-white/10 bg-background-dark/80 px-3 py-1 text-xs text-gray-300">
              <span
                className="w-2 h-2 rounded-full bg-primary animate-pulse"
                aria-hidden="true"
              ></span>
              Syncing events...
            </div>
          )}
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
