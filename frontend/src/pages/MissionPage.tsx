import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../services/api";
import { Metric, ModeBadge } from "../components";
import type { CalculationInput } from "../types/api";

export default function MissionPage() {
  const [lat, setLat] = useState(-89.5); const [lon, setLon] = useState(0);
  const [utc, setUtc] = useState("2026-11-15T00:00:00Z"); const [hours, setHours] = useState(720); const [step, setStep] = useState(60);
  const [runId, setRunId] = useState<string | null>(null);

  const sites = useQuery({ queryKey: ["sites"], queryFn: api.sites });
  const run = useMutation({ mutationFn: (b: CalculationInput) => api.calculate(b), onSuccess: (r) => setRunId(r.id) });
  const meta = useQuery({ queryKey: ["run", runId], queryFn: () => api.run(runId!), enabled: !!runId });
  const series = useQuery({ queryKey: ["series", runId], queryFn: () => api.series(runId!), enabled: meta.data?.status === "COMPLETED" });
  const events = useQuery({ queryKey: ["events", runId], queryFn: () => api.events(runId!), enabled: meta.data?.status === "COMPLETED" });

  const submit = () => run.mutate({ site: { latitude: lat, longitude: lon, coordinateType: "PLANETOCENTRIC" }, time: { utc },
    analysis: { durationHours: hours, samplingMinutes: step, terrainAnalysis: true } });
  const s0 = series.data?.items[0]; const prov = meta.data?.provenance;
  const data = (series.data?.items ?? []).map((s) => ({ t: new Date(s.timestampUTC).getTime(), sun: s.solarElevationDeg, earth: s.earthElevationDeg }));

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Mission Planner</h1>
      <div className="grid gap-3 md:grid-cols-6 rounded-xl bg-surface p-4">
        <label className="text-xs text-mute md:col-span-2">Site
          <select className="mt-1 w-full rounded bg-panel p-2 text-ink" onChange={(e) => { const s = sites.data?.items.find((x) => x.id === e.target.value); if (s) { setLat(s.latitude); setLon(s.longitude); } }}>
            <option value="">Custom…</option>
            {sites.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}{s.verified ? "" : " (unverified)"}</option>)}
          </select></label>
        <label className="text-xs text-mute">Lat (planetocentric °)<input type="number" step="any" min={-90} max={90} value={lat} onChange={(e) => setLat(+e.target.value)} className="mt-1 w-full rounded bg-panel p-2 text-ink" /></label>
        <label className="text-xs text-mute">Lon (east +°)<input type="number" step="any" min={-180} max={180} value={lon} onChange={(e) => setLon(+e.target.value)} className="mt-1 w-full rounded bg-panel p-2 text-ink" /></label>
        <label className="text-xs text-mute">Start (UTC ISO)<input value={utc} onChange={(e) => setUtc(e.target.value)} className="mt-1 w-full rounded bg-panel p-2 text-ink" /></label>
        <label className="text-xs text-mute">Hours / step (min)<div className="flex gap-1"><input type="number" value={hours} onChange={(e) => setHours(+e.target.value)} className="mt-1 w-1/2 rounded bg-panel p-2 text-ink" /><input type="number" value={step} onChange={(e) => setStep(+e.target.value)} className="mt-1 w-1/2 rounded bg-panel p-2 text-ink" /></div></label>
        <button onClick={submit} disabled={run.isPending} className="md:col-span-6 rounded bg-cyan px-4 py-2 font-medium text-space disabled:opacity-50">{run.isPending ? "Calculating…" : "Run calculation"}</button>
      </div>

      {run.isError && <div role="alert" className="rounded bg-danger/20 p-3 text-danger">{(run.error as Error).message}</div>}
      {meta.data?.status === "FAILED" && <div role="alert" className="rounded bg-danger/20 p-3 text-danger">{meta.data.error_code}: {meta.data.error_message}</div>}

      {prov && s0 && (<>
        <div className="flex flex-wrap items-center gap-2"><ModeBadge mode={prov.calculationMethod} /><span className="text-xs text-mute">frame {prov.referenceFrame} · {prov.shapeModel}</span></div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Metric label="Solar elevation (geometric)" value={s0.solarElevationDeg.toFixed(2)} unit="°" tone="text-solar" />
          <Metric label="Earth centre elevation" value={s0.earthElevationDeg.toFixed(2)} unit="°" tone="text-earth" />
          <Metric label="Solar irradiance (at Moon)" value={s0.solarIrradianceWm2.toFixed(1)} unit="W/m²" note="theoretical, normal to Sun" />
          <Metric label="Terrain illumination" value={s0.solarVisibilityFraction == null ? "N/A" : (s0.solarVisibilityFraction * 100).toFixed(0)} unit={s0.solarVisibilityFraction == null ? "" : "%"} note={s0.solarVisibilityFraction == null ? "terrain not evaluated" : undefined} />
        </div>
        {prov.warnings.length > 0 && <ul className="rounded bg-warn/10 p-3 text-sm text-warn list-disc pl-6">{prov.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
        <div className="h-72 rounded-xl bg-surface p-3">
          <ResponsiveContainer><LineChart data={data}>
            <CartesianGrid stroke="#ffffff10" /><XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => new Date(v).toISOString().slice(5, 10)} stroke="#A6B3C5" />
            <YAxis stroke="#A6B3C5" unit="°" /><Tooltip labelFormatter={(v) => new Date(Number(v)).toISOString()} /><Legend />
            <ReferenceLine y={0} stroke="#ffffff40" />
            <Line dataKey="sun" name="Sun elevation" stroke="#FFBF69" dot={false} /><Line dataKey="earth" name="Earth elevation" stroke="#4C91FF" dot={false} />
          </LineChart></ResponsiveContainer>
        </div>
        <div className="rounded-xl bg-surface p-3 text-sm"><div className="mb-1 text-mute">Events (upper limb, geometric horizon)</div>
          {events.data?.items.length ? events.data.items.map((e) => <div key={e.type + e.timeUTC}>{e.type} · {e.timeUTC} · ±{e.refinementToleranceSeconds}s (refinement tolerance)</div>) : "No events in window."}</div>
        <div className="text-xs text-mute">Kernels: {prov.kernels.join(", ")}</div>
      </>)}
    </div>
  );
}
