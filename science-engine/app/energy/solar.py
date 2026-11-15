from __future__ import annotations
import numpy as np
from app.geometry.constants import AU_KM, SOLAR_CONSTANT_1AU_W_M2


def irradiance_w_m2(sun_distance_km: float, f_1au: float = SOLAR_CONSTANT_1AU_W_M2) -> float:
    """Inverse-square irradiance normal to the Sun direction."""
    if sun_distance_km <= 0:
        raise ValueError("distance must be positive")
    return float(f_1au * (AU_KM / sun_distance_km) ** 2)


def panel_normal_enu(tilt_deg: float, azimuth_deg: float) -> np.ndarray:
    """Panel normal in ENU. tilt 0 = facing zenith; azimuth clockwise from north."""
    t, a = np.radians(tilt_deg), np.radians(azimuth_deg)
    return np.array([np.sin(t) * np.sin(a), np.sin(t) * np.cos(a), np.cos(t)])


def incidence_cos(sun_az_deg: float, sun_el_deg: float, panel_normal: np.ndarray | None) -> float:
    """cos(theta) between Sun direction and panel normal. panel_normal None => ideal sun-tracking (cos=1)."""
    if panel_normal is None:
        return 1.0
    az, el = np.radians(sun_az_deg), np.radians(sun_el_deg)
    s = np.array([np.cos(el) * np.sin(az), np.cos(el) * np.cos(az), np.sin(el)])
    return float(np.dot(s, panel_normal / np.linalg.norm(panel_normal)))


def panel_power_w(irr: float, area_m2: float, efficiency: float, cos_theta: float,
                  illum_fraction: float, derating: float = 1.0) -> float:
    """P = F * A * eta * max(0, cos theta) * f * visible_fraction. Engineering estimate only."""
    if not (0 < efficiency <= 1) or area_m2 <= 0 or not (0 < derating <= 1):
        raise ValueError("invalid panel parameters")
    return float(irr * area_m2 * efficiency * max(0.0, cos_theta) * derating * np.clip(illum_fraction, 0, 1))


def integrate_energy_wh(times_s: np.ndarray, power_w: np.ndarray) -> float:
    """Trapezoidal integration of power (W) over time (s) -> Wh."""
    t = np.asarray(times_s, float)
    p = np.asarray(power_w, float)
    if t.shape != p.shape or t.size < 2:
        raise ValueError("need >=2 samples of equal length")
    return float(np.trapezoid(p, t) / 3600.0)
