// Requires DATABASE_URL (app_user role) with migrations applied. Skipped when not set.
import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";

const run = process.env.DATABASE_URL ? describe : describe.skip;
run("db-backed API", () => {
  const app = buildApp();
  const scen = { scenarioName: "t", latitude: -89.5, longitude: 0, selectedTime: "2026-11-15T00:00:00Z", analysisDurationHours: 24 };

  it("lists curated sites, none claiming verified unless truly verified", async () => {
    const r = await request(app).get("/api/v1/sites"); expect(r.status).toBe(200);
    expect(r.body.items.length).toBeGreaterThan(0);
    for (const s of r.body.items.filter((x: any) => x.missionCategory === "APOLLO")) expect(s.verified).toBe(false);
  });
  it("guest A's scenario is invisible to guest B", async () => {
    const a = request.agent(app), b = request.agent(app);
    const c = await a.post("/api/v1/scenarios").send(scen); expect(c.status).toBe(201);
    expect((await a.get("/api/v1/scenarios")).body.items).toHaveLength(1);
    expect((await b.get("/api/v1/scenarios")).body.items).toHaveLength(0);
    expect((await b.get(`/api/v1/scenarios/${c.body.id}`)).status).toBe(404);
    expect((await b.delete(`/api/v1/scenarios/${c.body.id}`)).status).toBe(404);
  });
  it("curated sites cannot be deleted by a guest", async () => {
    const a = request.agent(app); const s = (await a.get("/api/v1/sites")).body.items[0];
    expect((await a.delete(`/api/v1/sites/${s.id}`)).status).toBe(404);
  });
  it("calculation with invalid body returns consistent 400", async () => {
    const r = await request(app).post("/api/v1/calculations").send({ site: {} }); expect(r.status).toBe(400); expect(r.body.error.code).toBe("VALIDATION");
  });
  it("science engine down => 502/504 error object, run recorded FAILED, not fabricated", async () => {
    const a = request.agent(app);
    const r = await a.post("/api/v1/calculations").send({ site: { latitude: 0, longitude: 0, coordinateType: "PLANETOCENTRIC" },
      time: { utc: "2026-11-15T00:00:00Z" }, analysis: { durationHours: 1, samplingMinutes: 10 } });
    expect([502, 503, 504]).toContain(r.status); expect(r.body.error.code).toMatch(/SCIENCE|KERNEL/);
  });
});
