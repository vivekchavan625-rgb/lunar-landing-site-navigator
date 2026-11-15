import { Router } from "express";
import { z } from "zod";
import { withUser } from "../database/pool.js";
export const scenarios = Router();

const Body = z.object({ scenarioName: z.string().min(1).max(200), description: z.string().max(2000).optional(),
  siteId: z.string().uuid().nullable().optional(), latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180), elevationM: z.number().finite().nullable().optional(),
  selectedTime: z.string().datetime({ offset: true }), timezone: z.string().default("UTC"),
  analysisDurationHours: z.number().finite().positive().max(1440), configuration: z.record(z.any()).default({}) });

scenarios.post("/", async (req, res, next) => {
  const p = Body.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: { code: "VALIDATION", message: "invalid scenario", details: p.error.flatten() } });
  try { const d = p.data;
    const r = await withUser(req.userId, (c) => c.query(
      `INSERT INTO mission_scenarios(user_id,scenario_name,description,site_id,latitude,longitude,elevation_m,selected_time,timezone,analysis_duration_hours,configuration)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [req.userId, d.scenarioName, d.description ?? null, d.siteId ?? null, d.latitude, d.longitude, d.elevationM ?? null, d.selectedTime, d.timezone, d.analysisDurationHours, d.configuration]));
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) { next(e); }
});

scenarios.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1)); const size = Math.min(100, Number(req.query.pageSize ?? 20));
    const r = await withUser(req.userId, (c) => c.query("SELECT * FROM mission_scenarios ORDER BY created_at DESC LIMIT $1 OFFSET $2", [size, (page - 1) * size]));
    res.json({ page, pageSize: size, items: r.rows });
  } catch (e) { next(e); }
});

scenarios.get("/:id", async (req, res, next) => {
  try { const r = await withUser(req.userId, (c) => c.query("SELECT * FROM mission_scenarios WHERE id=$1", [req.params.id]));
    if (!r.rows[0]) return res.status(404).json({ error: { code: "NOT_FOUND", message: "scenario not found" } }); res.json(r.rows[0]);
  } catch (e) { next(e); }
});

scenarios.put("/:id", async (req, res, next) => {
  const p = Body.partial().safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: { code: "VALIDATION", message: "invalid scenario", details: p.error.flatten() } });
  try { const d = p.data;
    const r = await withUser(req.userId, (c) => c.query(
      `UPDATE mission_scenarios SET scenario_name=COALESCE($2,scenario_name), description=COALESCE($3,description),
         configuration=COALESCE($4,configuration), updated_at=now() WHERE id=$1 RETURNING id`,
      [req.params.id, d.scenarioName ?? null, d.description ?? null, d.configuration ?? null]));
    if (!r.rowCount) return res.status(404).json({ error: { code: "NOT_FOUND", message: "scenario not found" } }); res.json({ id: r.rows[0].id });
  } catch (e) { next(e); }
});

scenarios.delete("/:id", async (req, res, next) => {
  try { const r = await withUser(req.userId, (c) => c.query("DELETE FROM mission_scenarios WHERE id=$1", [req.params.id]));
    if (!r.rowCount) return res.status(404).json({ error: { code: "NOT_FOUND", message: "scenario not found" } }); res.status(204).end();
  } catch (e) { next(e); }
});
