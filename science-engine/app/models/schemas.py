"""Pydantic contracts for the science engine. Angles: degrees. Distances: units in field names."""
from __future__ import annotations
from datetime import datetime, timezone
from enum import Enum
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

MAX_SAMPLES = 20_000


class CoordinateType(str, Enum):
    PLANETOCENTRIC = "PLANETOCENTRIC"  # only convention implemented; planetographic is rejected, never silently converted


class Site(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)  # east-positive
    elevationM: Optional[float] = Field(default=None, gt=-20000, lt=20000)
    coordinateType: CoordinateType
    bodyFrame: Literal["MOON_PA", "MOON_ME"] = "MOON_ME"


class TimeSpec(BaseModel):
    utc: datetime

    @field_validator("utc")
    @classmethod
    def must_have_tz(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("timestamp must include timezone information")
        return v.astimezone(timezone.utc)


class Analysis(BaseModel):
    durationHours: float = Field(gt=0, le=24 * 60)
    samplingMinutes: float = Field(ge=1, le=1440)
    terrainAnalysis: bool = False
    eventPrecisionSeconds: float = Field(default=1.0, gt=0.01, le=600)


class SolarPanel(BaseModel):
    enabled: bool = False
    areaM2: Optional[float] = Field(default=None, gt=0)
    efficiency: Optional[float] = Field(default=None, gt=0, le=1)
    derating: float = Field(default=1.0, gt=0, le=1)
    tracking: bool = False
    tiltDeg: float = Field(default=0.0, ge=0, le=180)
    azimuthDeg: float = Field(default=0.0, ge=0, lt=360)

    @model_validator(mode="after")
    def need_params(self):
        if self.enabled and (self.areaM2 is None or self.efficiency is None):
            raise ValueError("areaM2 and efficiency are required when solarPanel.enabled")
        return self


class CalculationRequest(BaseModel):
    site: Site
    time: TimeSpec
    analysis: Analysis
    solarPanel: SolarPanel = SolarPanel()

    @model_validator(mode="after")
    def sample_cap(self):
        n = int(self.analysis.durationHours * 60 / self.analysis.samplingMinutes) + 1
        if n > MAX_SAMPLES:
            raise ValueError(f"too many samples ({n} > {MAX_SAMPLES}); increase samplingMinutes")
        return self


class Sample(BaseModel):
    timestampUTC: datetime
    ephemerisTimeSeconds: float
    solarAzimuthDeg: float
    solarGeometricElevationDeg: float
    solarAngularRadiusDeg: float
    solarDistanceKm: float
    solarIrradianceWm2: float
    solarVisibilityFraction: float  # disk fraction above horizon (terrain-aware only if mode != GEOMETRIC)
    earthAzimuthDeg: float
    earthCenterElevationDeg: float
    earthAngularRadiusDeg: float
    earthDiskVisibilityFraction: float
    earthCenterVisible: bool
    estimatedPanelPowerW: Optional[float] = None


class EventOut(BaseModel):
    type: Literal["SUNRISE", "SUNSET", "EARTHRISE", "EARTHSET"]
    timeUTC: datetime
    ephemerisTimeSeconds: float
    refinementToleranceSeconds: float
    definition: str = "upper limb crosses geometric horizon (no refraction, no terrain)"


class Energy(BaseModel):
    solarDistanceAUMean: float
    energyModel: Literal["THEORETICAL", "PANEL_ESTIMATE"]
    theoreticalHorizontalIncidentWhPerM2: float
    estimatedEnergyWh: Optional[float] = None


class Provenance(BaseModel):
    ephemerisSource: str = "JPL_SPICE"
    kernels: list[str]
    referenceFrame: str
    coordinateType: str
    shapeModel: str
    terrainDataset: Optional[str] = None
    calculationMethod: Literal["GEOMETRIC", "TERRAIN_APPROX", "DEM", "DEM_HIGHRES"]
    aberrationCorrection: str
    solarConstant1AUWm2: float
    solarConstantSource: str
    timeConversion: str = "SPICE str2et/et2utc via loaded LSK"
    calculatedAtUTC: datetime
    warnings: list[str]


class CalculationResponse(BaseModel):
    referenceFrame: str
    samples: list[Sample]
    events: list[EventOut]
    energy: Energy
    provenance: Provenance
    quality: dict
