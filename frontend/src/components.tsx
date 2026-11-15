import type { Mode } from "./types/api";
export const Metric = ({ label, value, unit, tone = "text-ink", note }: { label: string; value: string; unit?: string; tone?: string; note?: string }) => (
  <div className="rounded-xl bg-panel p-4 border border-white/5">
    <div className="text-xs uppercase tracking-wide text-mute">{label}</div>
    <div className={`mt-1 text-2xl font-semibold ${tone}`}>{value}<span className="ml-1 text-sm text-mute">{unit}</span></div>
    {note && <div className="mt-1 text-xs text-mute">{note}</div>}
  </div>
);
const LABEL: Record<Mode, string> = { GEOMETRIC: "Level 1 · Geometric (no terrain)", TERRAIN_APPROX: "Level 2 · Terrain approx.", DEM: "Level 3 · DEM-based", DEM_HIGHRES: "Level 4 · High-res DEM" };
export const ModeBadge = ({ mode }: { mode: Mode }) => (
  <span className={`rounded-full px-3 py-1 text-xs ${mode === "GEOMETRIC" ? "bg-warn/20 text-warn" : "bg-ok/20 text-ok"}`}>{LABEL[mode]}</span>
);
