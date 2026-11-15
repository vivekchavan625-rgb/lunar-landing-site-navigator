import { Router } from "express";
import { CalculationRequest } from "../validators/calculation.js";
import { withUser } from "../database/pool.js";
import { requestHash } from "../services/hash.js";
import { calculate, ScienceError } from "../services/science.js";

export const calculations = Router();

calculations.post("/", async (req, res, next) => {
  const parsed = CalculationRequest.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION", message: "invalid request", details: parsed.error.flatten(), requestId: req.id } });
  const body = parsed.data;
  const hash = requestHash(body);
  try {
    // cache / dedupe (per user because of RLS)
    const existing = await withUser(req.userId, (c) => c.query(
      "SELECT id,status FROM calculation_runs WHERE request_hash=$1 AND status IN ('COMPLETED','RUNNING','QUEUED') LIMIT 1", [hash]));
    if (existing.rows[0]) return res.status(200).json({ id: existing.rows[0].id, status: existing.rows[0].status, cached: true });

    const id = await withUser(req.userId, async (c) => (await c.query(
      `INSERT INTO calculation_runs(user_id,request_hash,status,calculation_model,geometry_method,input_parameters,started_at)
       VALUES ($1,$2,'RUNNING','PENDING','PENDING',$3,now()) RETURNING id`, [req.userId, hash, body])).rows[0].id as string);

    try {
      const out = await calculate(body, String(req.id));
      await withUser(req.userId, async (c) => {
        await c.query(
          `UPDATE calculation_runs SET status='COMPLETED', calculation_model=$2, geometry_method=$3, provenance=$4, quality_metadata=$5,
             result_summary=$6, completed_at=now() WHERE id=$1`,
          [id, out.provenance.calculationMethod, "SPICE spkpos " + out.provenance.aberrationCorrection, out.provenance, out.quality, out.energy]);
        // bulk insert samples
        const S = out.samples as any[];
        for (let i = 0; i < S.length; i += 500) {
          const chunk = S.slice(i, i + 500); const vals: any[] = []; const rows: string[] = [];
          chunk.forEach((s, j) => { const o = j * 12;
            rows.push(`($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6},$${o+7},$${o+8},$${o+9},$${o+10},$${o+11},$${o+12})`);
            vals.push(id, s.timestampUTC, s.ephemerisTimeSeconds, s.solarAzimuthDeg, s.solarGeometricElevationDeg, s.earthAzimuthDeg,
              s.earthCenterElevationDeg, s.solarIrradianceWm2, out.quality.calculationMode === "GEOMETRIC" ? null : s.solarVisibilityFraction, s.earthDiskVisibilityFraction,
              s.estimatedPanelPowerW, out.quality.calculationMode); });
          await c.query(`INSERT INTO environmental_samples(calculation_id,sample_time,spice_et_seconds,solar_azimuth_deg,solar_elevation_deg,
            earth_azimuth_deg,earth_elevation_deg,solar_irradiance_w_m2,terrain_illumination_fraction,earth_disk_visibility_fraction,
            estimated_panel_power_w,calculation_quality) VALUES ${rows.join(",")}`, vals);
        }
        for (const e of out.events as any[])
          await c.query("INSERT INTO calculation_events(calculation_id,event_type,event_time,event_value,event_metadata) VALUES ($1,$2,$3,$4,$5)",
            [id, e.type, e.timeUTC, e.refinementToleranceSeconds, { ephemerisTimeSeconds: e.ephemerisTimeSeconds, definition: e.definition }]);
      });
      return res.status(201).json({ id, status: "COMPLETED", cached: false });
    } catch (e: any) {
      const code = e instanceof ScienceError ? e.code : "INTERNAL";
      await withUser(req.userId, (c) => c.query("UPDATE calculation_runs SET status='FAILED', error_code=$2, error_message=$3, completed_at=now() WHERE id=$1",
        [id, code, e.message])).catch(() => {});
      throw e;
    }
  } catch (e) { next(e); }
});

calculations.get("/:id", async (req, res, next) => {
  try {
    const r = await withUser(req.userId, (c) => c.query("SELECT id,status,calculation_model,input_parameters,result_summary,provenance,quality_metadata,error_code,error_message,created_at,completed_at FROM calculation_runs WHERE id=$1", [req.params.id]));
    if (!r.rows[0]) return res.status(404).json({ error: { code: "NOT_FOUND", message: "calculation not found", requestId: req.id } });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

calculations.get("/:id/status", async (req, res, next) => {
  try {
    const r = await withUser(req.userId, (c) => c.query("SELECT id,status,error_code,error_message FROM calculation_runs WHERE id=$1", [req.params.id]));
    if (!r.rows[0]) return res.status(404).json({ error: { code: "NOT_FOUND", message: "calculation not found" } });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

calculations.get("/:id/timeseries", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1)); const size = Math.min(5000, Number(req.query.pageSize ?? 1000));
    const r = await withUser(req.userId, (c) => c.query(
      `SELECT sample_time AS "timestampUTC", solar_elevation_deg AS "solarElevationDeg", solar_azimuth_deg AS "solarAzimuthDeg",
              earth_elevation_deg AS "earthElevationDeg", earth_azimuth_deg AS "earthAzimuthDeg", solar_irradiance_w_m2 AS "solarIrradianceWm2",
              terrain_illumination_fraction AS "solarVisibilityFraction", earth_disk_visibility_fraction AS "earthVisibilityFraction",
              estimated_panel_power_w AS "estimatedPanelPowerW", calculation_quality AS "calculationQuality"
       FROM environmental_samples WHERE calculation_id=$1 ORDER BY sample_time LIMIT $2 OFFSET $3`, [req.params.id, size, (page - 1) * size]));
    res.json({ page, pageSize: size, items: r.rows });
  } catch (e) { next(e); }
});

calculations.get("/:id/events", async (req, res, next) => {
  try {
    const r = await withUser(req.userId, (c) => c.query(
      `SELECT event_type AS type, event_time AS "timeUTC", event_value AS "refinementToleranceSeconds", event_metadata AS metadata
       FROM calculation_events WHERE calculation_id=$1 ORDER BY event_time`, [req.params.id]));
    res.json({ items: r.rows });
  } catch (e) { next(e); }
});
