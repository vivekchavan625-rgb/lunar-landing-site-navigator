import type { ApiError, CalcEvent, CalcRun, CalculationInput, Sample, Site } from "../types/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`/api/v1${path}`, { credentials: "include", headers: { "content-type": "application/json" }, ...init });
  if (!r.ok) { const e = (await r.json().catch(() => null)) as ApiError | null; throw new Error(e?.error?.message ?? `HTTP ${r.status}`); }
  return r.status === 204 ? (undefined as T) : r.json();
}
export const api = {
  sites: () => req<{ items: Site[] }>("/sites"),
  calculate: (b: CalculationInput) => req<{ id: string; status: string; cached: boolean }>("/calculations", { method: "POST", body: JSON.stringify(b) }),
  run: (id: string) => req<CalcRun>(`/calculations/${id}`),
  series: (id: string) => req<{ items: Sample[] }>(`/calculations/${id}/timeseries?pageSize=5000`),
  events: (id: string) => req<{ items: CalcEvent[] }>(`/calculations/${id}/events`),
  kernels: () => req<unknown>("/data-sources/kernels"),
};
