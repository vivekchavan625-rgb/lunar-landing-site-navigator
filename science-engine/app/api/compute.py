"""Calculation orchestration. Provider-injected so the pipeline is testable without kernels."""
from __future__ import annotations
from datetime import datetime, timezone
import numpy as np
from app.geometry import constants as C
from app.geometry.local_frame import surface_position_km, to_az_el, angular_radius_deg, disk_visible_fraction
from app.energy.solar import irradiance_w_m2, panel_normal_enu, incidence_cos, panel_power_w, integrate_energy_wh
from app.events.detection import find_crossings
from app.models.schemas import CalculationRequest, CalculationResponse, Sample, EventOut, Energy, Provenance
from app.spice.provider import EphemerisProvider
from app.terrain.provider import load_horizon_profile
from app.terrain.horizon import horizon_at
from app.spice.ephemeris import ABCORR


def _geometry_at(p: EphemerisProvider, req: CalculationRequest, et: float, r_moon: float):
    s = req.site
    elev = s.elevationM or 0.0
    obs = surface_position_km(s.latitude, s.longitude, elev, r_moon)
    sun_vec = p.moon_to("SUN", et, s.bodyFrame) - obs     # observer -> Sun, body-fixed
    earth_vec = p.moon_to("EARTH", et, s.bodyFrame) - obs  # observer -> Earth, body-fixed
    saz, sel, sd = to_az_el(sun_vec, s.latitude, s.longitude)
    eaz, eel, ed = to_az_el(earth_vec, s.latitude, s.longitude)
    return saz, sel, sd, eaz, eel, ed


def run(req: CalculationRequest, p: EphemerisProvider) -> CalculationResponse:
    warnings: list[str] = []
    t0 = p.utc_to_et(req.time.utc.strftime("%Y-%m-%dT%H:%M:%S.%f"))
    step = req.analysis.samplingMinutes * 60.0
    n = int(req.analysis.durationHours * 3600.0 / step) + 1
    grid = t0 + step * np.arange(n)
    p.require_coverage(float(grid[0]), float(grid[-1]))     # never extrapolate silently

    r_moon = p.moon_radius_km()
    s = req.site
    method = "GEOMETRIC"
    horizon = None
    terrain_name = None
    if req.analysis.terrainAnalysis:
        res = load_horizon_profile(s.latitude, s.longitude)
        if len(res) == 3:
            horizon, terrain_name, dem_elev = res
        else:
            horizon, terrain_name = res
            dem_elev = None
        if horizon is None:
            warnings.append("Terrain analysis requested but no DEM covers this location; terrain-dependent outputs are NOT evaluated.")
        else:
            method = "DEM"
    else:
        dem_elev = None

    elev = s.elevationM
    if elev is None:
        if dem_elev is not None:
            elev = dem_elev
            warnings.append(f"Elevation not supplied: obtained {elev:.1f} m from DEM.")
        else:
            elev = 0.0
            warnings.append("Elevation not supplied and no DEM available: observer placed on reference sphere (0 m).")

    if method == "GEOMETRIC":
        warnings.append("Level-1 spherical shape model; horizon refraction not modelled (airless body).")
    else:
        warnings.append(f"Level-3 DEM terrain-aware mode using dataset {terrain_name}; sun-disk visibility uses center azimuth approximation (2.5-D horizon).")

    pn = None
    if req.solarPanel.enabled and not req.solarPanel.tracking:
        pn = panel_normal_enu(req.solarPanel.tiltDeg, req.solarPanel.azimuthDeg)

    samples: list[Sample] = []
    power, horiz_inc, dists = [], [], []
    for et in grid:
        saz, sel, sd, eaz, eel, ed = _geometry_at(p, req, float(et), r_moon, elev)
        srad = angular_radius_deg(C.SUN_RADIUS_KM, sd)
        erad = angular_radius_deg(C.EARTH_MEAN_RADIUS_KM, ed)
        s_hz = horizon_at(horizon, saz) if horizon is not None else 0.0
        e_hz = horizon_at(horizon, eaz) if horizon is not None else 0.0
        sfrac = disk_visible_fraction(sel, srad, s_hz)
        efrac = disk_visible_fraction(eel, erad, e_hz)
        irr = irradiance_w_m2(sd)
        pw = None
        if req.solarPanel.enabled:
            ct = incidence_cos(saz, sel, pn)
            pw = panel_power_w(irr, req.solarPanel.areaM2, req.solarPanel.efficiency, ct, sfrac, req.solarPanel.derating)
            power.append(pw)
        horiz_inc.append(irr * max(0.0, np.sin(np.radians(sel))) * sfrac)
        dists.append(sd)
        samples.append(Sample(
            timestampUTC=datetime.fromisoformat(p.et_to_utc_iso(float(et)).replace("Z", "+00:00")),
            ephemerisTimeSeconds=float(et), solarAzimuthDeg=saz, solarGeometricElevationDeg=sel,
            solarAngularRadiusDeg=srad, solarDistanceKm=sd, solarIrradianceWm2=irr,
            solarVisibilityFraction=sfrac, earthAzimuthDeg=eaz, earthCenterElevationDeg=eel,
            earthAngularRadiusDeg=erad, earthDiskVisibilityFraction=efrac,
            earthCenterVisible=eel > e_hz, estimatedPanelPowerW=pw))

    # events: upper-limb crossing of the (terrain or flat) horizon
    def sun_f(et):
        saz, sel, sd, *_ = _geometry_at(p, req, et, r_moon, elev)
        hz = horizon_at(horizon, saz) if horizon is not None else 0.0
        return sel + angular_radius_deg(C.SUN_RADIUS_KM, sd) - hz

    def earth_f(et):
        _, _, _, eaz, eel, ed = _geometry_at(p, req, et, r_moon, elev)
        hz = horizon_at(horizon, eaz) if horizon is not None else 0.0
        return eel + angular_radius_deg(C.EARTH_MEAN_RADIUS_KM, ed) - hz

    tol = req.analysis.eventPrecisionSeconds
    evs = [(e, "SUNRISE") for e in find_crossings(sun_f, grid, "SUNRISE", "SUNSET", tol)]
    evs += [(e, "EARTHRISE") for e in find_crossings(earth_f, grid, "EARTHRISE", "EARTHSET", tol)]
    events = [EventOut(type=e.kind, timeUTC=datetime.fromisoformat(p.et_to_utc_iso(e.et).replace("Z", "+00:00")),
                       ephemerisTimeSeconds=e.et, refinementToleranceSeconds=e.uncertainty_s)
              for e, _ in sorted(evs, key=lambda x: x[0].et)]
    if step > 3600:
        warnings.append("Sampling >1 h: short visibility windows may be missed by event detection.")

    t_rel = grid - grid[0]
    energy = Energy(
        solarDistanceAUMean=float(np.mean(dists) / C.AU_KM),
        energyModel="PANEL_ESTIMATE" if req.solarPanel.enabled else "THEORETICAL",
        theoreticalHorizontalIncidentWhPerM2=integrate_energy_wh(t_rel, np.array(horiz_inc)) if n > 1 else 0.0,
        estimatedEnergyWh=integrate_energy_wh(t_rel, np.array(power)) if (req.solarPanel.enabled and n > 1) else None)

    return CalculationResponse(
        referenceFrame=s.bodyFrame, samples=samples, events=events, energy=energy,
        provenance=Provenance(kernels=p.kernels, referenceFrame=s.bodyFrame, coordinateType=s.coordinateType.value,
                              shapeModel=f"sphere R={r_moon:.1f} km (+elevation)", terrainDataset=terrain_name,
                              calculationMethod=method, aberrationCorrection=ABCORR,
                              solarConstant1AUWm2=C.SOLAR_CONSTANT_1AU_W_M2, solarConstantSource=C.SOLAR_CONSTANT_SOURCE,
                              calculatedAtUTC=datetime.now(timezone.utc), warnings=warnings),
        quality={"ephemerisAvailable": True, "terrainAvailable": horizon is not None,
                 "calculationMode": method, "samples": n, "samplingSeconds": step})
