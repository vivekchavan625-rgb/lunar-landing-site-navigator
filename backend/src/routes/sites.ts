import { Router } from "express";
import { z } from "zod";
import { withUser } from "../database/pool.js";
export const sites = Router();

sites.get("/", async (req, res, next) => {
  try {
    const cat = typeof req.query.category === "string" ? req.query.category : null;
    const r = await withUser(req.userId, (c) => c.query(
      `SELECT id,slug,name,mission_name AS "missionName",mission_category AS "missionCategory",latitude,longitude,elevation_m AS "elevationM",
              latitude_type AS "latitudeType",coordinate_frame AS "coordinateFrame",location_status AS "locationStatus",
              coordinate_accuracy_m AS "coordinateAccuracyM",source_name AS "sourceName",source_url AS "sourceUrl",verified,description
       FROM landing_sites WHERE ($1::text IS NULL OR mission_category=$1) ORDER BY mission_category,name`, [cat]));
    res.json({ items: r.rows });
  } catch (e) { next(e); }
});

sites.get("/:id", async (req, res, next) => {
  try {
    const r = await withUser(req.userId, (c) => c.query("SELECT * FROM landing_sites WHERE id=$1", [req.params.id]));
    if (!r.rows[0]) return res.status(404).json({ error: { code: "NOT_FOUND", message: "site not found" } });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

const Custom = z.object({ name: z.string().min(1).max(200), latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180), elevationM: z.number().finite().gt(-20000).lt(20000).nullable().optional(),
  coordinateFrame: z.enum(["MOON_ME", "MOON_PA"]).default("MOON_ME"), latitudeType: z.literal("PLANETOCENTRIC"),
  description: z.string().max(2000).optional() });

sites.post("/custom", async (req, res, next) => {
  const p = Custom.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: { code: "VALIDATION", message: "invalid site", details: p.error.flatten() } });
  try {
    const d = p.data;
    const r = await withUser(req.userId, (c) => c.query(
      `INSERT INTO landing_sites(owner_user_id,name,mission_category,latitude,longitude,elevation_m,latitude_type,coordinate_frame,location_status,source_name,source_url,verified,description)
       VALUES ($1,$2,'CUSTOM',$3,$4,$5,$6,$7,'ILLUSTRATIVE','User supplied','about:user-input',FALSE,$8) RETURNING id`,
      [req.userId, d.name, d.latitude, d.longitude, d.elevationM ?? null, d.latitudeType, d.coordinateFrame, d.description ?? null]));
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) { next(e); }
});

sites.delete("/:id", async (req, res, next) => {
  try {
    const r = await withUser(req.userId, (c) => c.query("DELETE FROM landing_sites WHERE id=$1", [req.params.id]));
    if (!r.rowCount) return res.status(404).json({ error: { code: "NOT_FOUND", message: "site not found or not deletable" } });
    res.status(204).end();
  } catch (e) { next(e); }
});
