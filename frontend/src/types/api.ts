// Mirrors science-engine/app/models/schemas.py and docs/openapi.yaml. Angles: degrees. Distances: units in name.
export type Mode = "GEOMETRIC" | "TERRAIN_APPROX" | "DEM" | "DEM_HIGHRES";
export interface CalculationInput {
  site: { latitude: number; longitude: number; elevationM?: number | null; coordinateType: "PLANETOCENTRIC"; bodyFrame?: "MOON_ME" | "MOON_PA" };
  time: { utc: string; timezone?: string };
  analysis: { durationHours: number; samplingMinutes: number; terrainAnalysis: boolean; eventPrecisionSeconds?: number };
  solarPanel?: { enabled: boolean; areaM2?: number; efficiency?: number; derating?: number; tracking?: boolean; tiltDeg?: number; azimuthDeg?: number };
}
export interface Sample {
  timestampUTC: string; solarElevationDeg: number; solarAzimuthDeg: number; earthElevationDeg: number; earthAzimuthDeg: number;
  solarIrradianceWm2: number; solarVisibilityFraction: number | null; earthVisibilityFraction: number; estimatedPanelPowerW: number | null; calculationQuality: Mode;
}
export interface CalcEvent { type: "SUNRISE" | "SUNSET" | "EARTHRISE" | "EARTHSET"; timeUTC: string; refinementToleranceSeconds: number }
export interface CalcRun {
  id: string; status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED"; provenance: { calculationMethod: Mode; kernels: string[]; referenceFrame: string;
    shapeModel: string; warnings: string[]; solarConstantSource: string; terrainDataset: string | null } | null;
  quality_metadata: { terrainAvailable?: boolean; calculationMode?: Mode }; result_summary: { energyModel: string; theoreticalHorizontalIncidentWhPerM2: number; estimatedEnergyWh: number | null } | null;
  error_code?: string; error_message?: string;
}
export interface ApiError { error: { code: string; message: string; requestId?: string; details?: unknown } }
export interface Site { id: string; name: string; missionCategory: string; latitude: number; longitude: number; elevationM: number | null; locationStatus: string; verified: boolean; sourceUrl: string; sourceName: string }
