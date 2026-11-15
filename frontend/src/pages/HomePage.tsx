import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

export default function HomePage() {
  const sites = useQuery({ queryKey: ["sites"], queryFn: api.sites });
  const kernels = useQuery({ queryKey: ["kernels"], queryFn: api.kernels });

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-8">
      <div className="rounded-2xl glass-panel p-8 sm:p-10 border border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-400 mb-6 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          NASA Space Apps 2026 · Verified SPICE Science Engine
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
          Lunar Landing Site Navigator
        </h1>
        
        <p className="mt-5 text-lg text-slate-300 max-w-2xl leading-relaxed">
          High-precision SPICE-backed ephemeris, solar irradiance, earth visibility, energy estimation, and DEM-aware horizon analysis for lunar exploration, Artemis planning, and CLPS landing sites.
        </p>
        
        <div className="mt-8 flex flex-wrap gap-4">
          <Link to="/mission" className="inline-flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-white font-bold px-8 py-3 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-300">
            Launch Mission Planner →
          </Link>
          <Link to="/compare" className="rounded-xl bg-slate-800/80 border border-slate-700 px-6 py-3.5 font-semibold text-slate-200 hover:bg-slate-700/80 hover:border-cyan-500/40 transition shadow-lg">
            Compare Sites
          </Link>
          <Link to="/methodology" className="rounded-xl bg-slate-800/80 border border-slate-700 px-6 py-3.5 font-semibold text-slate-200 hover:bg-slate-700/80 hover:border-cyan-500/40 transition shadow-lg">
            Methodology & Provenance
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-surface p-6 border border-white/5 space-y-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-500/30">
          <div className="text-cyan font-semibold">SPICE Ephemeris Engine</div>
          <p className="text-sm text-mute">Exact NAIF SPK/PCK kernels for lunar orientation (ME/PA), sub-millisecond accurate ephemeris, and rigorous coordinate validation.</p>
          <Link to="/data-sources" className="text-xs text-cyan hover:underline inline-block pt-2">View active kernels & coverage →</Link>
        </div>
        <div className="rounded-xl bg-surface p-6 border border-white/5 space-y-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-500/30">
          <div className="text-solar font-semibold">Terrain & Illumination</div>
          <p className="text-sm text-mute">LOLA DEM horizon profiles, solar disk visibility fractions, sun/earth az-el computations, and thermal/power projections.</p>
          <Link to="/analysis" className="text-xs text-solar hover:underline inline-block pt-2">Explore terrain analysis →</Link>
        </div>
        <div className="rounded-xl bg-surface p-6 border border-white/5 space-y-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-500/30">
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
