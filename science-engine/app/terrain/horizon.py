"""DEM horizon profile (Level 3/4). Pure NumPy so it is testable without rasters.

dem: 2-D array of elevations in metres on a regular grid with square cells of `cell_m`.
Observer at (row, col) with height `obs_height_m` above the DEM surface.
Curvature drop d^2/(2R) is applied so distant terrain is correctly lowered on a sphere.
"""
from __future__ import annotations
import numpy as np

MOON_R_M = 1_737_400.0


def horizon_profile(dem: np.ndarray, row: int, col: int, cell_m: float, n_az: int = 360,
                    max_range_m: float | None = None, obs_height_m: float = 0.0,
                    body_radius_m: float = MOON_R_M) -> np.ndarray:
    """Return horizon elevation angle (deg) for azimuths 0..360 (clockwise from grid-north = -row direction)."""
    h, w = dem.shape
    z0 = float(dem[row, col]) + obs_height_m
    max_cells = int(min(max_range_m / cell_m, max(h, w))) if max_range_m else max(h, w)
    out = np.full(n_az, -90.0)
    steps = np.arange(1, max_cells + 1)
    for k in range(n_az):
        az = np.radians(360.0 * k / n_az)
        r = row - steps * np.cos(az)
        c = col + steps * np.sin(az)
        ok = (r >= 0) & (r <= h - 1) & (c >= 0) & (c <= w - 1)
        if not ok.any():
            continue
        r, c, s = r[ok], c[ok], steps[ok]
        # bilinear sample
        r0, c0 = np.floor(r).astype(int), np.floor(c).astype(int)
        r1, c1 = np.minimum(r0 + 1, h - 1), np.minimum(c0 + 1, w - 1)
        fr, fc = r - r0, c - c0
        z = (dem[r0, c0] * (1 - fr) * (1 - fc) + dem[r1, c0] * fr * (1 - fc)
             + dem[r0, c1] * (1 - fr) * fc + dem[r1, c1] * fr * fc)
        d = s * cell_m
        dz = z - z0 - d**2 / (2.0 * body_radius_m)
        out[k] = np.degrees(np.max(np.arctan2(dz, d)))
    return out


def horizon_at(profile_deg: np.ndarray, az_deg: float) -> float:
    n = len(profile_deg)
    x = (az_deg % 360.0) / 360.0 * n
    i0 = int(np.floor(x)) % n
    i1 = (i0 + 1) % n
    f = x - np.floor(x)
    return float(profile_deg[i0] * (1 - f) + profile_deg[i1] * f)
