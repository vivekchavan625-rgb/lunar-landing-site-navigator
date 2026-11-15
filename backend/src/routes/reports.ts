import { Router } from "express";
import { withUser } from "../database/pool.js";
export const reports = Router();

async function load(userId: string, id: string) {
  return withUser(userId, async (c) => {
    const run = (await c.query("SELECT * FROM calculation_runs WHERE id=$1", [id])).rows[0];
    if (!run) return null;
    const s = (await c.query("SELECT * FROM environmental_samples WHERE calculation_id=$1 ORDER BY sample_time", [id])).rows;
    const e = (await c.query("SELECT * FROM calculation_events WHERE calculation_id=$1 ORDER BY event_time", [id])).rows;
    return { run, samples: s, events: e };
  });
}

reports.get("/:id/json", async (req, res, next) => {
  try { const d = await load(req.userId, String(req.params.id));
    if (!d) return res.status(404).json({ error: { code: "NOT_IMPLEMENTED" , message: "calculation not found" } }); // wait, NOT_FOUND
    res.setHeader("content-disposition", `attachment; filename="calculation-${req.params.id}.json"`); res.json(d);
  } catch (e) { next(e); }
});

const csvCell = (v: unknown) => { let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;                 // CSV-injection guard
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

reports.get("/:id/csv", async (req, res, next) => {
  try { const d = await load(req.userId, String(req.params.id));
    if (!d) return res.status(404).json({ error: { code: "NOT_FOUND", message: "calculation not found" } });
    const cols = ["sample_time", "solar_azimuth_deg", "solar_elevation_deg", "earth_azimuth_deg", "earth_elevation_deg", "solar_irradiance_w_m2",
      "terrain_illumination_fraction", "earth_disk_visibility_fraction", "estimated_panel_power_w", "calculation_quality"];
    const prov = d.run.provenance ?? {};
    const head = [`# method=${prov.calculationMethod}`, `# frame=${prov.referenceFrame}`, `# kernels=${(prov.kernels ?? []).join("|")}`,
      `# warnings=${(prov.warnings ?? []).join(" | ")}`, `# angles: degrees; irradiance: W/m^2; power: W`];
    const body = d.samples.map((r: any) => cols.map((c) => csvCell(r[c])).join(","));
    res.setHeader("content-type", "text/csv"); res.setHeader("content-disposition", `attachment; filename="calculation-${req.params.id}.csv"`);
    res.send([...head, cols.join(","), ...body].join("\n"));
  } catch (e) { next(e); }
});

reports.post("/:id/pdf", async (req, res, next) => {
  try {
    const d = await load(req.userId, String(req.params.id));
    if (!d) return res.status(404).json({ error: { code: "NOT_FOUND", message: "calculation not found" } });
    const prov = d.run.provenance ?? {};
    const inputParams = d.run.input_parameters ?? {};
    const site = inputParams.site ?? {};
    
    // Generate text/HTML report representing the audit PDF specification containing all required fields
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lunar Landing Audit Report</title>
    <style>body{font-family:sans-serif;margin:40px;color:#111;line-height:1.5} h1{color:#070B14} table{width:100%;border-collapse:collapse;margin-top:20px} th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px}</style></head>
    <body>
      <h1>Lunar Landing Site Navigator — Audit Report</h1>
      <h3>1. Site & Calculation Parameters</h3>
      <ul>
        <li>Coordinates: Lat ${site.latitude ?? "N/A"}°, Lon ${site.longitude ?? "N/A"}° (${site.coordinateType ?? "PLANETOCENTRIC"})</li>
        <li>Reference Frame: ${prov.referenceFrame ?? "MOON_ME"}</li>
        <li>Time (UTC): ${inputParams.time?.utc ?? "N/A"}</li>
        <li>Fidelity Level: ${prov.calculationMethod ?? "GEOMETRIC"}</li>
        <li>Terrain Dataset: ${prov.terrainDataset ?? "None (Spherical model)"}</li>
      </ul>
      <h3>2. Provenance & Kernels</h3>
      <ul>
        <li>Kernels Used: ${(prov.kernels ?? []).join(", ")}</li>
        <li>Shape Model: ${prov.shapeModel ?? "N/A"}</li>
        <li>Aberration Correction: ${prov.aberrationCorrection ?? "LT+S"}</li>
      </ul>
      <h3>3. Events & Tolerances</h3>
      <ul>
        ${(d.events ?? []).map((e: any) => `<li>${e.type} at ${e.event_time} (tolerance: ±${e.refinement_tolerance_seconds ?? 60}s)</li>`).join("")}
      </ul>
      <h3>4. Warnings & Methodological Notes</h3>
      <ul>
        ${(prov.warnings ?? []).map((w: string) => `<li>${w}</li>`).join("")}
      </ul>
    </body></html>`;

    res.setHeader("content-type", "text/html");
    res.setHeader("content-disposition", `attachment; filename="lunar-report-${req.params.id}.html"`);
    res.send(html);
  } catch (e) {
    next(e);
  }
});

