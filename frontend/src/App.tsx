import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
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

export default function App() {
  const routes = [
    { path: "/", name: "Home", element: <HomePage /> },
    { path: "/mission", name: "Mission", element: <MissionPage /> },
    { path: "/sites", name: "Sites", element: <SitesPage /> },
    { path: "/compare", name: "Compare", element: <ComparePage /> },
    { path: "/analysis", name: "Analysis", element: <AnalysisPage /> },
    { path: "/timeline", name: "Timeline", element: <TimelinePage /> },
    { path: "/data-sources", name: "Data Sources", element: <DataSourcesPage /> },
    { path: "/saved-scenarios", name: "Scenarios", element: <SavedScenariosPage /> },
    { path: "/methodology", name: "Methodology", element: <MethodologyPage /> },
    { path: "/about", name: "About", element: <AboutPage /> },
  ];

  return (
    <BrowserRouter>
      <nav className="flex flex-wrap items-center justify-between border-b border-white/5 bg-surface px-6 py-3 text-sm shadow-md">
        <div className="flex items-center gap-2 font-bold text-cyan">
          <span className="inline-block h-3 w-3 rounded-full bg-cyan animate-pulse"></span>
          <span>Lunar Navigator</span>
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-4">
          {routes.map((r) => (
            <Link key={r.path} to={r.path} className="rounded px-2.5 py-1 text-mute hover:bg-panel hover:text-cyan transition">
              {r.name}
            </Link>
          ))}
        </div>
      </nav>
      <Routes>
        {routes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Routes>
    </BrowserRouter>
  );
}

