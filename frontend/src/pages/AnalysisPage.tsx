import { useState, lazy, Suspense } from "react";
import { Lunar3DViewerProps } from "../components/Lunar3DViewer";

const Lunar3DViewer = lazy(() => import("../components/Lunar3DViewer"));

export default function AnalysisPage() {
  const [method, setMethod] = useState("DEM");
  const [az, setAz] = useState(90);
  const [el, setEl] = useState(15);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Terrain & Illumination Analysis</h1>
        <p className="text-sm text-mute">Interactive 3D lunar sphere, LOLA DEM horizon profiles, and irradiance modelling.</p>
      </div>

      <div className="rounded-xl bg-surface p-6 border border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-ink">Interactive 3D Sphere & Solar Direction</h3>
          <div className="flex gap-4 text-xs text-mute">
            <label className="flex items-center gap-1.5">Sun Azimuth: <input type="range" min="0" max="360" value={az} onChange={(e) => setAz(+e.target.value)} className="w-24 accent-cyan" /><span className="text-ink font-mono">{az}°</span></label>
            <label className="flex items-center gap-1.5">Sun Elevation: <input type="range" min="-10" max="90" value={el} onChange={(e) => setEl(+e.target.value)} className="w-24 accent-solar" /><span className="text-ink font-mono">{el}°</span></label>
          </div>
        </div>
        
        <Suspense fallback={<div className="h-[460px] rounded-xl bg-surface flex items-center justify-center text-cyan">Loading 3D Globe...</div>}>
          <Lunar3DViewer solarAzimuthDeg={az} solarElevationDeg={el} earthAzimuthDeg={180} earthElevationDeg={42} />
        </Suspense>
      </div>

      <div className="rounded-xl bg-surface p-6 border border-white/5 space-y-4">
        <h3 className="font-semibold text-ink">Calculation Fidelity Modes</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className={`p-4 rounded-lg border cursor-pointer ${method === "GEOMETRIC" ? "border-cyan bg-cyan/10" : "border-white/5 bg-panel"}`} onClick={() => setMethod("GEOMETRIC")}>
            <div className="font-semibold text-cyan">Level 1: Geometric</div>
            <p className="text-xs text-mute mt-1">Pure sphere assumption, no terrain shadowing. Fast global overview.</p>
          </div>
          <div className={`p-4 rounded-lg border cursor-pointer ${method === "TERRAIN_APPROX" ? "border-cyan bg-cyan/10" : "border-white/5 bg-panel"}`} onClick={() => setMethod("TERRAIN_APPROX")}>
            <div className="font-semibold text-cyan">Level 2: Terrain Approx</div>
            <p className="text-xs text-mute mt-1">Simplified sector horizon profile and regional slope shadowing.</p>
          </div>
          <div className={`p-4 rounded-lg border cursor-pointer ${method === "DEM" ? "border-cyan bg-cyan/10" : "border-white/5 bg-panel"}`} onClick={() => setMethod("DEM")}>
            <div className="font-semibold text-cyan">Level 3: DEM Horizon</div>
            <p className="text-xs text-mute mt-1">Full LOLA LDEM raster window horizon profile for true crater rim blockage.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
