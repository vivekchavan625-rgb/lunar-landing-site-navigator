import { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

const Lunar3DViewer = lazy(() => import("../components/Lunar3DViewer"));

const FALLBACK_SITES = [
  { id: "apollo-11", name: "Apollo 11 (Tranquility Base)", latitude: 0.6741, longitude: 23.4730, elevationM: -1800, missionCategory: "APOLLO", verified: true, locationStatus: "EXACT_LANDING_SITE", sourceName: "NASA LROC", sourceUrl: "https://www.lroc.asu.edu/" },
  { id: "apollo-15", name: "Apollo 15 (Hadley-Apennine)", latitude: 26.1322, longitude: 3.6339, elevationM: -1500, missionCategory: "APOLLO", verified: true, locationStatus: "EXACT_LANDING_SITE", sourceName: "NASA LROC", sourceUrl: "https://www.lroc.asu.edu/" },
  { id: "apollo-17", name: "Apollo 17 (Taurus-Littrow)", latitude: 20.1908, longitude: 30.7717, elevationM: -2500, missionCategory: "APOLLO", verified: true, locationStatus: "EXACT_LANDING_SITE", sourceName: "NASA LROC", sourceUrl: "https://www.lroc.asu.edu/" },
  { id: "artemis-shackleton", name: "Artemis III Candidate (Shackleton Connecting Ridge)", latitude: -89.9000, longitude: 0.0000, elevationM: 4200, missionCategory: "ARTEMIS_CANDIDATE", verified: false, locationStatus: "PLANNED_TARGET_REGION", sourceName: "NASA SVS", sourceUrl: "https://svs.gsfc.nasa.gov/" },
  { id: "clps-im1", name: "IM-1 Odysseus (Malapert A)", latitude: -80.1300, longitude: 35.9500, elevationM: -1200, missionCategory: "CLPS", verified: true, locationStatus: "EXACT_LANDING_SITE", sourceName: "Intuitive Machines", sourceUrl: "https://www.intuitivemachines.com/" },
];

export default function SitesPage() {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string>("apollo-17");
  const sitesQuery = useQuery({ queryKey: ["sites"], queryFn: api.sites, retry: 1 });

  const allSites = sitesQuery.data?.items?.length ? sitesQuery.data.items : FALLBACK_SITES;

  const filtered = allSites.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.missionCategory.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "ALL" || s.missionCategory === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Lunar Landing Sites & Regions</h1>
          <p className="text-sm text-mute">Exploration sites, Apollo historical locations, Artemis candidate regions, and CLPS targets.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input type="text" placeholder="Search sites..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded bg-surface px-3 py-2 text-sm border border-white/10 text-ink w-full sm:w-64" />
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="rounded bg-surface px-3 py-2 text-sm border border-white/10 text-ink">
            <option value="ALL">All Categories</option>
            <option value="APOLLO">Apollo</option>
            <option value="ARTEMIS_CANDIDATE">Artemis Candidate</option>
            <option value="CLPS">CLPS</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-cyan">Interactive 3D Moon & Landing Sites</h3>
        <Suspense fallback={<div className="h-[460px] rounded-xl bg-surface flex items-center justify-center text-cyan">Loading 3D Lunar Globe...</div>}>
          <Lunar3DViewer sites={filtered} selectedSiteId={selectedId} onSelectSite={(s) => setSelectedId(s.id)} />
        </Suspense>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <div key={s.id} onClick={() => setSelectedId(s.id)} className={`cursor-pointer rounded-xl bg-surface p-5 border space-y-3 flex flex-col justify-between transition ${selectedId === s.id ? "border-cyan" : "border-white/5 hover:border-cyan/30"}`}>
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-ink text-lg">{s.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${s.verified ? "bg-ok/20 text-ok" : "bg-warn/20 text-warn"}`}>{s.verified ? "Verified" : "Candidate"}</span>
              </div>
              <div className="text-xs text-cyan font-mono">Category: {s.missionCategory}</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-mute bg-panel p-2.5 rounded">
                <div>Lat: <span className="text-ink font-mono">{s.latitude.toFixed(4)}°</span></div>
                <div>Lon: <span className="text-ink font-mono">{s.longitude.toFixed(4)}°</span></div>
              </div>
            </div>
            <div className="pt-2 border-t border-white/5 flex justify-between items-center text-xs">
              <span className="text-mute">{s.locationStatus}</span>
              <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="text-cyan hover:underline">{s.sourceName} ↗</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
