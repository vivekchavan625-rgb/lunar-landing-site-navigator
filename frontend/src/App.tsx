import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MissionPage from "./pages/MissionPage";
import SitesPage from "./pages/SitesPage";
import ComparePage from "./pages/ComparePage";
import AnalysisPage from "./pages/AnalysisPage";
import TimelinePage from "./pages/TimelinePage";
import DataSourcesPage from "./pages/DataSourcesPage";
import SavedScenariosPage from "./pages/SavedScenariosPage";
import MethodologyPage from "./pages/MethodologyPage";
import AboutPage from "./pages/AboutPage";

function Navigation() {
  const location = useLocation();
  const routes = [
    { path: "/", name: "Home" },
    { path: "/mission", name: "Mission" },
    { path: "/sites", name: "Sites" },
    { path: "/compare", name: "Compare" },
    { path: "/analysis", name: "Analysis" },
    { path: "/timeline", name: "Timeline" },
    { path: "/data-sources", name: "Data Sources" },
    { path: "/saved-scenarios", name: "Scenarios" },
    { path: "/methodology", name: "Methodology" },
    { path: "/about", name: "About" },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-nav px-6 py-3.5 flex flex-wrap items-center justify-between shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/30 glow-cyan">
          <span className="absolute w-2.5 h-2.5 rounded-full bg-cyan animate-ping opacity-75"></span>
          <span className="w-2 h-2 rounded-full bg-cyan animate-pulse shadow-[0_0_10px_#55D6FF]"></span>
        </div>
        <div>
          <span className="font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan via-white to-solar text-base">
            Lunar Navigator
          </span>
          <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan/10 text-cyan border border-cyan/25">
            Live
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 sm:gap-2 items-center mt-2 sm:mt-0">
        {routes.map((r) => {
          const active = location.pathname === r.path;
          return (
            <Link
              key={r.path}
              to={r.path}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                active
                  ? "bg-cyan/15 text-cyan border border-cyan/40 shadow-[0_0_15px_rgba(85,214,255,0.2)]"
                  : "text-mute hover:bg-surface/80 hover:text-ink hover:border hover:border-white/10 border border-transparent"
              }`}
            >
              {r.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-surface/50 backdrop-blur-md py-8 px-6 text-mute text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-solar shadow-[0_0_8px_#FFBF69]"></div>
          <span className="font-semibold text-ink tracking-wide">NASA Space Apps Challenge 2026</span>
          <span className="text-white/20">|</span>
          <span className="text-cyan font-mono">Built by Team Lunar Atlas</span>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-mute">
          <Link to="/methodology" className="hover:text-cyan transition">Scientific Provenance</Link>
          <Link to="/data-sources" className="hover:text-cyan transition">SPICE Kernels & DEM</Link>
          <Link to="/about" className="hover:text-cyan transition">System Architecture</Link>
          <a href="https://naif.jpl.nasa.gov/" target="_blank" rel="noreferrer" className="hover:text-cyan transition">NAIF SPICE ↗</a>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const routes = [
    { path: "/", element: <HomePage /> },
    { path: "/mission", element: <MissionPage /> },
    { path: "/sites", element: <SitesPage /> },
    { path: "/compare", element: <ComparePage /> },
    { path: "/analysis", element: <AnalysisPage /> },
    { path: "/timeline", element: <TimelinePage /> },
    { path: "/data-sources", element: <DataSourcesPage /> },
    { path: "/saved-scenarios", element: <SavedScenariosPage /> },
    { path: "/methodology", element: <MethodologyPage /> },
    { path: "/about", element: <AboutPage /> },
  ];

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-space text-ink selection:bg-cyan selection:text-space">
        <Navigation />
        <main className="flex-grow">
          <Routes>
            {routes.map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}


