import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { CalculationRequest } from "../src/validators/calculation.js";

const app = buildApp();
const valid = { site: { latitude: -89.5, longitude: 0, coordinateType: "PLANETOCENTRIC" }, time: { utc: "2026-11-15T00:00:00Z" },
  analysis: { durationHours: 24, samplingMinutes: 10 } };

describe("validation (no DB needed)", () => {
  it("accepts a valid request", () => expect(CalculationRequest.safeParse(valid).success).toBe(true));
  it("rejects missing tz", () => expect(CalculationRequest.safeParse({ ...valid, time: { utc: "2026-11-15T00:00:00" } }).success).toBe(false));
  it("rejects planetographic", () => expect(CalculationRequest.safeParse({ ...valid, site: { ...valid.site, coordinateType: "PLANETOGRAPHIC" } }).success).toBe(false));
  it("rejects NaN/lat>90", () => { expect(CalculationRequest.safeParse({ ...valid, site: { ...valid.site, latitude: 91 } }).success).toBe(false);
    expect(CalculationRequest.safeParse({ ...valid, site: { ...valid.site, latitude: NaN } }).success).toBe(false); });
  it("rejects excessive sampling", () => expect(CalculationRequest.safeParse({ ...valid, analysis: { durationHours: 1440, samplingMinutes: 1 } }).success).toBe(false));
  it("rejects panel enabled without params", () => expect(CalculationRequest.safeParse({ ...valid, solarPanel: { enabled: true } }).success).toBe(false));
});

describe("system", () => {
  it("health", async () => { const r = await request(app).get("/api/v1/health"); expect(r.status).toBe(200); expect(r.headers["x-request-id"]).toBeTruthy(); });
  it("404 is a consistent error object", async () => { const r = await request(app).get("/api/v1/nope"); expect(r.status).toBe(404); expect(r.body.error.code).toBe("NOT_FOUND"); });
});
