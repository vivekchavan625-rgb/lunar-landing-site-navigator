import { Router } from "express";
import { z } from "zod";
import { withUser } from "../database/pool.js";
import { requestHash } from "../services/hash.js";
import { calculate } from "../services/science.js";

export const comparisons = Router();

const comparisonInputSchema = z.object({
  sites: z.array(z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    elevationM: z.number().nullable().optional(),
    coordinateType: z.literal("PLANETOCENTRIC"),
    bodyFrame: z.enum(["MOON_ME", "MOON_PA"]).optional(),
  })).min(1).max(3),
  time: z.object({
    utc: z.string().datetime({ offset: true }),
    timezone: z.string().optional(),
  }),
  analysis: z.object({
    durationHours: z.number().gt(0).lte(8760),
    samplingMinutes: z.number().int().gt(0),
    terrainAnalysis: z.boolean(),
    eventPrecisionSeconds: z.number().optional(),
  }),
  solarPanel: z.object({
    enabled: z.boolean(),
    areaM2: z.number().positive().optional(),
    efficiency: z.number().positive().max(1).optional(),
    derating: z.number().positive().optional(),
    tracking: z.boolean().optional(),
    tiltDeg: z.number().optional(),
    azimuthDeg: z.number().optional(),
  }).optional(),
});

comparisons.post("/", async (req, res, next) => {
  try {
    const parsed = comparisonInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "invalid comparison request", details: parsed.error.format() } });
    }
    const body = parsed.data;
    const results: Array<{ site: any; calculation: any }> = [];

    for (const site of body.sites) {
      const calcReq = {
        site,
        time: body.time,
        analysis: body.analysis,
        solarPanel: body.solarPanel ?? { enabled: false },
      };
      const rHash = requestHash(calcReq);
      
      const calcRun = await withUser(req.userId, async (c) => {
        let existing = (await c.query("SELECT * FROM calculation_runs WHERE user_id=$1 AND request_hash=$2", [req.userId, rHash])).rows[0];
        if (existing) {
          const samples = (await c.query("SELECT * FROM environmental_samples WHERE calculation_id=$1 ORDER BY sample_time", [existing.id])).rows;
          const events = (await c.query("SELECT * FROM calculation_events WHERE calculation_id=$1 ORDER BY event_time", [existing.id])).rows;
          return { id: existing.id, status: existing.status, provenance: existing.provenance, samples, events };
        }

        const engineRes = await calculate(calcReq, String(req.id));
        const ins = await c.query(
          `INSERT INTO calculation_runs (user_id, request_hash, status, geometry_method, terrain_dataset_id, input_parameters, provenance, quality_metadata, result_summary)
           VALUES ($1, $2, 'COMPLETED', $3, NULL, $4, $5, $6, $7) RETURNING id`,
          [req.userId, rHash, engineRes.quality.calculationMode, JSON.stringify(calcReq), JSON.stringify(engineRes.provenance), JSON.stringify(engineRes.quality), JSON.stringify(engineRes.energy)]
        );
        const runId = ins.rows[0].id;

        const sampleValues = engineRes.samples.map((s: any) => `('${runId}', '${s.timestampUTC}', ${s.ephemerisTimeSeconds}, ${s.solarAzimuthDeg}, ${s.solarGeometricElevationDeg}, ${s.earthAzimuthDeg}, ${s.earthCenterElevationDeg}, ${s.solarIrradianceWm2}, ${s.solarVisibilityFraction ?? 'NULL'}, ${s.earthDiskVisibilityFraction}, ${s.estimatedPanelPowerW ?? 'NULL'}, '${s.calculationQuality}')`).join(",");
        if (sampleValues) {
          await c.query(`INSERT INTO environmental_samples(calculation_id, sample_time, spice_et_seconds, solar_azimuth_deg, solar_elevation_deg, earth_azimuth_deg, earth_elevation_deg, solar_irradiance_w_m2, terrain_illumination_fraction, earth_disk_visibility_fraction, estimated_panel_power_w, calculation_quality) VALUES ${sampleValues}`);
        }

        const samples = (await c.query("SELECT * FROM environmental_samples WHERE calculation_id=$1 ORDER BY sample_time", [runId])).rows;
        const events: any[] = [];
        return { id: runId, status: "COMPLETED", provenance: engineRes.provenance, samples, events };
      });

      results.push({ site, calculation: calcRun });
    }

    // Persist comparison group
    const compId = await withUser(req.userId, async (c) => {
      const res = await c.query("INSERT INTO comparison_groups(user_id, comparison_name, calculation_ids) VALUES ($1, $2, $3) RETURNING id", [req.userId, "Multi-Site Comparison", results.map(r => r.calculation.id)]);
      return res.rows[0].id;
    });

    res.status(201).json({ id: compId, results });
  } catch (e) {
    next(e);
  }
});

comparisons.get("/", async (req, res, next) => {
  try {
    const list = await withUser(req.userId, async (c) => {
      return (await c.query("SELECT * FROM comparison_groups ORDER BY created_at DESC LIMIT 50")).rows;
    });
    res.json({ items: list });
  } catch (e) {
    next(e);
  }
});

comparisons.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await withUser(req.userId, async (c) => {
      const r = await c.query("DELETE FROM comparison_groups WHERE id=$1 RETURNING id", [req.params.id]);
      return r.rows[0];
    });
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "comparison not found" } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
