import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../services/api";
import type { CalculationInput } from "../types/api";

export default function ComparePage() {
  const [site1Id, setSite1Id] = useState("");
  const [site2Id, setSite2Id] = useState("");
  const [utc, setUtc] = useState("2026-11-15T00:00:00Z");
  const [hours, setHours] = useState(168);

  const sites = useQuery({ queryKey: ["sites"], queryFn: api.sites });
  const calc1 = useMutation({ mutationFn: (b: CalculationInput) => api.calculate(b) });
  const calc2 = useMutation({ mutationFn: (b: CalculationInput) => api.calculate(b) });

  const runCompare = () => {
    const s1 = sites.data?.items.find((x) => x.id === site1Id);
    const s2 = sites.data?.items.find((x) => x.id === site2Id);
    if (s1) calc1.mutate({ site: { latitude: s1.latitude, longitude: s1.longitude, coordinateType: "PLANETOCENTRIC" }, time: { utc }, analysis: { durationHours: hours, samplingMinutes: 60, terrainAnalysis: true } });
    if (s2) calc2.mutate({ site: { latitude: s2.latitude, longitude: s2.longitude, coordinateType: "PLANETOCENTRIC" }, time: { utc }, analysis: { durationHours: hours, samplingMinutes: 60, terrainAnalysis: true } });
  };

  const run1Id = calc1.data?.id; const run2Id = calc2.data?.id;
  const series1 = useQuery({ queryKey: ["series", run1Id], queryFn: () => api.series(run1Id!), enabled: !!run1Id });
  const series2 = useQuery({ queryKey: ["series", run2Id], queryFn: () => api.series(run2Id!), enabled: !!run2Id });
  const s1Meta = sites.data?.items.find((x) => x.id === site1Id);
  const s2Meta = sites.data?.items.find((x) => x.id === site2Id);

  const chartData = (series1.data?.items ?? []).map((item, idx) => ({
    t: new Date(item.timestampUTC).getTime(),
    sun1: item.solarElevationDeg,
    sun2: series2.data?.items?.[idx]?.solarElevationDeg ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Multi-Site Comparison</h1>
        <p className="text-sm text-mute">Compare solar illumination and elevation angles across landing sites.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4 rounded-xl bg-surface p-4 border border-white/5">
        <label className="text-xs text-mute">Site 1<select value={site1Id} onChange={(e) => setSite1Id(e.target.value)} className="mt-1 w-full rounded bg-panel p-2 text-ink">
          <option value="">Select site 1…</option>{sites.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></label>
        <label className="text-xs text-mute">Site 2<select value={site2Id} onChange={(e) => setSite2Id(e.target.value)} className="mt-1 w-full rounded bg-panel p-2 text-ink">
          <option value="">Select site 2…</option>{sites.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></label>
        <label className="text-xs text-mute">Start UTC<input value={utc} onChange={(e) => setUtc(e.target.value)} className="mt-1 w-full rounded bg-panel p-2 text-ink" /></label>
        <label className="text-xs text-mute">Duration (Hours)<input type="number" value={hours} onChange={(e) => setHours(+e.target.value)} className="mt-1 w-full rounded bg-panel p-2 text-ink" /></label>
        <button onClick={runCompare} disabled={!site1Id || !site2Id || calc1.isPending || calc2.isPending} className="md:col-span-4 rounded bg-cyan px-4 py-2 font-medium text-space disabled:opacity-50">
          {calc1.isPending || calc2.isPending ? "Computing..." : "Run Comparison"}
        </button>
      </div>
      {chartData.length > 0 && (
        <div className="rounded-xl bg-surface p-4 border border-white/5">
          <h3 className="text-sm font-semibold text-solar mb-2">Solar Elevation Comparison ({s1Meta?.name} vs {s2Meta?.name})</h3>
          <div className="h-72"><ResponsiveContainer><LineChart data={chartData}>
            <CartesianGrid stroke="#ffffff10" /><XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => new Date(v).toISOString().slice(5, 10)} stroke="#A6B3C5" />
            <YAxis stroke="#A6B3C5" unit="°" /><Tooltip labelFormatter={(v) => new Date(Number(v)).toISOString()} />
            <ReferenceLine y={0} stroke="#ffffff40" />
            <Line dataKey="sun1" stroke="#FFBF69" dot={false} name={s1Meta?.name} />
            <Line dataKey="sun2" stroke="#4C91FF" dot={false} name={s2Meta?.name} />
          </LineChart></ResponsiveContainer></div>
        </div>
      )}
    </div>
  );
}
