import { useState } from "react";
export default function TimelinePage() {
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Mission Timeline Scrubber</h1>
        <p className="text-sm text-mute">Playback solar and earth angles, illumination fraction, and event markers across the calculated series.</p>
      </div>
      <div className="rounded-xl bg-surface p-6 border border-white/5 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={() => setPlaying(!playing)} className="rounded bg-cyan px-4 py-2 text-space font-semibold">{playing ? "Pause" : "Play"}</button>
            <select value={speed} onChange={(e) => setSpeed(+e.target.value)} className="rounded bg-panel px-3 py-2 text-ink text-sm">
              <option value={1}>1x Speed</option>
              <option value={5}>5x Speed</option>
              <option value={10}>10x Speed</option>
            </select>
          </div>
          <div className="text-xs text-mute font-mono">Current Time: 2026-11-15T00:00:00Z</div>
        </div>
        <input type="range" min={0} max={100} defaultValue={0} className="w-full accent-cyan" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-panel p-3 rounded"><div className="text-mute text-xs">Solar Elevation</div><div className="text-solar font-semibold text-lg">12.45°</div></div>
          <div className="bg-panel p-3 rounded"><div className="text-mute text-xs">Earth Elevation</div><div className="text-earth font-semibold text-lg">58.12°</div></div>
          <div className="bg-panel p-3 rounded"><div className="text-mute text-xs">Irradiance</div><div className="text-ink font-semibold text-lg">1320.4 W/m²</div></div>
          <div className="bg-panel p-3 rounded"><div className="text-mute text-xs">Terrain Visibility</div><div className="text-cyan font-semibold text-lg">85%</div></div>
        </div>
      </div>
    </div>
  );
}
