import { env } from "../config/env.js";

export class ScienceError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

/** Calls the private science engine. The browser never talks to it directly. */
export async function calculate(body: unknown, requestId: string) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), env.SCIENCE_TIMEOUT_MS);
  try {
    // strip backend-only fields
    const { time, ...rest } = body as any;
    const payload = { ...rest, time: { utc: time.utc } };
    const r = await fetch(`${env.SCIENCE_ENGINE_URL}/v1/calculate`, {
      method: "POST", headers: { "content-type": "application/json", "x-request-id": requestId },
      body: JSON.stringify(payload), signal: ctl.signal });
    const json: any = await r.json().catch(() => ({}));
    if (!r.ok) throw new ScienceError(r.status === 422 ? 422 : 502, json?.error?.code ?? "SCIENCE_ERROR",
      json?.error?.message ?? (json?.detail ? JSON.stringify(json.detail) : "science engine error"));
    return json;
  } catch (e: any) {
    if (e instanceof ScienceError) throw e;
    if (e?.name === "AbortError") throw new ScienceError(504, "SCIENCE_TIMEOUT", "science engine timed out");
    throw new ScienceError(502, "SCIENCE_UNREACHABLE", "science engine unreachable");
  } finally { clearTimeout(t); }
}
