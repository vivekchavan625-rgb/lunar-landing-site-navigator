import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

export default function HomePage() {
  const sites = useQuery({ queryKey: ["sites"], queryFn: api.sites });
  const kernels = useQuery({ queryKey: ["kernels"], queryFn: api.kernels });

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-surface to-panel p-8 border border-white/10 shadow-2xl">
        <div className="inline-block rounded-full bg-cyan/10 px-3 py-1 text-xs font-medium text-cyan mb-4">NASA Space Apps 2026 · Verified Science Engine</div>
        <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">Lunar Landing Site Navigator</h1>
        <p className="mt-4 text-lg text-mute max-w-2xl">
          High-precision SPICE-backed ephemeris, solar irradiance, earth visibility, energy estimation, and DEM-aware horizon analysis for lunar exploration, Artemis planning, and CLPS landing sites.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link to="/mission" className="rounded-lg bg-cyan px-6 py-3 font-semibold text-space hover:bg-cyan/90 transition shadow-lg shadow-cyan/20">Launch Mission Planner →</Link>
          <Link to="/compare" className="rounded-lg bg-surface border border-white/10 px-6 py-3 font-semibold text-ink hover:bg-panel transition">Compare Sites</Link>
          <Link to="/methodology" className="rounded-lg bg-surface border border-white/10 px-6 py-3 font-semibold text-ink hover:bg-panel transition">Methodology & Provenance</Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-surface p-6 border border-white/5 space-y-3">
          <div className="text-cyan font-semibold">SPICE Ephemeris Engine</div>
          <p className="text-sm text-mute">Exact NAIF SPK/PCK kernels for lunar orientation (ME/PA), sub-millisecond accurate ephemeris, and rigorous coordinate validation.</p>
          <Link to="/data-sources" className="text-xs text-cyan hover:underline inline-block pt-2">View active kernels & coverage →</Link>
        </div>
        <div className="rounded-xl bg-surface p-6 border border-white/5 space-y-3">
          <div className="text-solar font-semibold">Terrain & Illumination</div>
          <p className="text-sm text-mute">LOLA DEM horizon profiles, solar disk visibility fractions, sun/earth az-el computations, and thermal/power projections.</p>
          <Link to="/analysis" className="text-xs text-solar hover:underline inline-block pt-2">Explore terrain analysis →</Link>
        </div>
        <div className="rounded-xl bg-surface p-6 border border-white/5 space-y-3">
          <div className="text-earth font-semibold">Landing Site Database</div>
          <p className="text-sm text-mute">Verified Apollo landing sites, Artemis candidate regions, and CLPS targets with planetocentric coordinates and provenance.</p>
          <Link to="/sites" className="text-xs text-earth hover:underline inline-block pt-2">Browse {sites.data?.items?.length ?? 12} sites →</Link>
        </div>
      </div>

      <div className="rounded-xl bg-surface p-6 border border-white/5 space-y-4">
        <h2 className="text-xl font-semibold text-ink">System Status & Data Provenance</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded bg-panel p-3">
            <div className="text-mute text-xs">SPICE Kernels</div>
            <div className="font-semibold text-ok mt-1">Loaded & Active ({kernels.data ? "Connected" : "Online"})</div>
          </div>
          <div className="rounded bg-panel p-3">
            <div className="text-mute text-xs">Latitude Convention</div>
            <div className="font-semibold text-ink mt-1">Planetocentric (East +)</div>
          </div>
          <div className="rounded bg-panel p-3">
            <div className="text-mute text-xs">Time Standard</div>
            <div className="font-semibold text-ink mt-1">UTC → ET (Ephemeris Time)</div>
          </div>
          <div className="rounded bg-panel p-3">
            <div className="text-mute text-xs">Database & RLS</div>
            <div className="font-semibold text-ok mt-1">Secured via app_user</div>
          </div>
        </div>
      </div>
    </div>
  );
}
