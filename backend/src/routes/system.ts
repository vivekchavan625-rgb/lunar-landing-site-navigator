import { Router } from "express";
import { pool, withUser } from "../database/pool.js";
import { env } from "../config/env.js";
export const system = Router();
export const dataSources = Router();

system.get("/health", (_req, res) => res.json({ status: "ok" }));
system.get("/version", (_req, res) => res.json({ name: "lunar-backend", version: "0.1.0" }));
system.get("/ready", async (_req, res) => {
  const out: any = { database: false, scienceEngine: false, kernels: false };
  try { await pool.query("SELECT 1"); out.database = true; } catch {}
  try { const r = await fetch(`${env.SCIENCE_ENGINE_URL}/ready`, { signal: AbortSignal.timeout(3000) });
    out.scienceEngine = true; out.kernels = r.ok; if (!r.ok) out.kernelProblems = (await r.json() as any).problems; } catch {}
  res.status(out.database && out.scienceEngine ? 200 : 503).json(out);
});

dataSources.get("/kernels", async (req, res, next) => {
  try {
    const db = await withUser(req.userId, (c) => c.query("SELECT kernel_name AS name,kernel_type AS type,version,source_url AS \"sourceUrl\",checksum_sha256 AS sha256,coverage_start AS \"coverageStart\",coverage_end AS \"coverageEnd\",active FROM spice_kernels ORDER BY kernel_type,kernel_name"));
    let live: any = null;
    try { const r = await fetch(`${env.SCIENCE_ENGINE_URL}/v1/kernels`, { signal: AbortSignal.timeout(5000) }); live = r.ok ? await r.json() : { error: "engine reports kernels unavailable" }; } catch { live = { error: "science engine unreachable" }; }
    res.json({ catalog: db.rows, engine: live });
  } catch (e) { next(e); }
});
dataSources.get("/terrain", async (req, res, next) => {
  try { const r = await withUser(req.userId, (c) => c.query("SELECT * FROM terrain_datasets ORDER BY dataset_name"));
    res.json({ items: r.rows, note: r.rows.length ? undefined : "No terrain datasets registered: terrain-aware outputs are unavailable (GEOMETRIC mode only)." });
  } catch (e) { next(e); }
});
dataSources.get("/status", async (_req, res) => {
  const s: any = {}; try { s.engine = (await fetch(`${env.SCIENCE_ENGINE_URL}/ready`, { signal: AbortSignal.timeout(3000) })).ok; } catch { s.engine = false; }
  res.json(s);
});
dataSources.get("/", (_req, res) => res.json({ references: [
  { name: "NASA/JPL NAIF SPICE", url: "https://naif.jpl.nasa.gov/naif/" }, { name: "JPL Horizons API", url: "https://ssd-api.jpl.nasa.gov/doc/horizons.html" },
  { name: "LRO LOLA (PDS)", url: "https://pds.nasa.gov/" }, { name: "NASA SVS south-pole illumination", url: "https://svs.gsfc.nasa.gov/5027/" }] }));
