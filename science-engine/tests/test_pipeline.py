from datetime import datetime, timezone
import numpy as np, pytest
from pydantic import ValidationError
from app.api.compute import run
from app.models.schemas import CalculationRequest


def req(**over):
    base = {"site": {"latitude": 0, "longitude": 0, "coordinateType": "PLANETOCENTRIC"},
            "time": {"utc": "2000-01-01T12:00:00Z"},
            "analysis": {"durationHours": 24 * 30, "samplingMinutes": 60, "terrainAnalysis": False}}
    base.update(over); return CalculationRequest.model_validate(base)


def test_geometry_pipeline_synthetic(prov):
    r = run(req(), prov)
    s0 = r.samples[0]
    assert s0.solarGeometricElevationDeg == pytest.approx(90, abs=0.01)       # Sun at +X, observer lon 0 => zenith
    assert s0.earthCenterElevationDeg == pytest.approx(90 - np.degrees(1737.4 / 384400) * 0, abs=0.5)
    assert s0.earthDiskVisibilityFraction == 1.0 and s0.earthCenterVisible
    kinds = [e.type for e in r.events]
    assert "SUNSET" in kinds and "SUNRISE" in kinds
    quarter = 29.530588 * 86400 / 4
    sunset = next(e for e in r.events if e.type == "SUNSET")
    assert abs(sunset.ephemerisTimeSeconds - quarter) < 3 * 3600      # upper limb ~ quarter period (+limb offset)
    assert r.provenance.calculationMethod == "GEOMETRIC" and r.quality["terrainAvailable"] is False
    assert r.energy.energyModel == "THEORETICAL" and r.energy.estimatedEnergyWh is None
    assert r.energy.theoreticalHorizontalIncidentWhPerM2 > 0


def test_earth_never_sets_at_subearth_point(prov):
    r = run(req(), prov)
    assert not [e for e in r.events if e.type.startswith("EARTH")]


def test_terrain_requested_but_unavailable_is_flagged_not_faked(prov):
    r = run(req(analysis={"durationHours": 24, "samplingMinutes": 60, "terrainAnalysis": True}), prov)
    assert r.provenance.calculationMethod == "GEOMETRIC"
    assert any("no DEM" in w for w in r.provenance.warnings)


def test_panel_estimate_is_consistent(prov):
    r = run(req(analysis={"durationHours": 24, "samplingMinutes": 30},
                solarPanel={"enabled": True, "areaM2": 2, "efficiency": 0.3, "tracking": True}), prov)
    assert r.energy.energyModel == "PANEL_ESTIMATE" and r.energy.estimatedEnergyWh > 0
    p = np.array([s.estimatedPanelPowerW for s in r.samples])
    assert p.max() == pytest.approx(r.samples[0].solarIrradianceWm2 * 2 * 0.3, rel=1e-3)


def test_validation_rejections():
    with pytest.raises(ValidationError): req(time={"utc": "2026-11-15T00:00:00"})              # no tz
    with pytest.raises(ValidationError): req(solarPanel={"enabled": True})                       # missing params
    with pytest.raises(ValidationError): req(site={"latitude": 91, "longitude": 0, "coordinateType": "PLANETOCENTRIC"})
    with pytest.raises(ValidationError): req(site={"latitude": 0, "longitude": 0, "coordinateType": "PLANETOGRAPHIC"})
    with pytest.raises(ValidationError): req(analysis={"durationHours": 24 * 60, "samplingMinutes": 1})  # sample cap
