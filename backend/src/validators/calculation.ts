import { z } from "zod";

const finite = z.number().finite();
export const CalculationRequest = z.object({
  site: z.object({
    latitude: finite.min(-90).max(90),
    longitude: finite.min(-180).max(180),
    elevationM: finite.gt(-20000).lt(20000).nullable().optional(),
    coordinateType: z.literal("PLANETOCENTRIC"),          // explicit; planetographic is rejected, not converted
    bodyFrame: z.enum(["MOON_PA", "MOON_ME"]).default("MOON_ME"),
  }),
  time: z.object({
    utc: z.string().datetime({ offset: true }),            // timezone information REQUIRED
    timezone: z.string().default("UTC"),                    // display only; storage is UTC
  }),
  analysis: z.object({
    durationHours: finite.gt(0).max(24 * 60),
    samplingMinutes: finite.min(1).max(1440),
    terrainAnalysis: z.boolean().default(false),
    eventPrecisionSeconds: finite.min(0.05).max(600).default(1),
  }),
  solarPanel: z.object({
    enabled: z.boolean().default(false),
    areaM2: finite.positive().optional(),
    efficiency: finite.gt(0).max(1).optional(),
    derating: finite.gt(0).max(1).default(1),
    tracking: z.boolean().default(false),
    tiltDeg: finite.min(0).max(180).default(0),
    azimuthDeg: finite.min(0).lt(360).default(0),
  }).default({ enabled: false }),
}).superRefine((v, ctx) => {
  const n = Math.floor((v.analysis.durationHours * 60) / v.analysis.samplingMinutes) + 1;
  if (n > 20000) ctx.addIssue({ code: "custom", message: `too many samples (${n} > 20000)`, path: ["analysis", "samplingMinutes"] });
  if (v.solarPanel.enabled && (v.solarPanel.areaM2 === undefined || v.solarPanel.efficiency === undefined))
    ctx.addIssue({ code: "custom", message: "areaM2 and efficiency required when panel enabled", path: ["solarPanel"] });
});
export type CalculationRequest = z.infer<typeof CalculationRequest>;
