"""Pure-NumPy local observer geometry (no SPICE). Fully unit-testable.

Convention: planetocentric latitude (angle between equatorial plane and radius vector),
east-positive longitude in the body-fixed frame. ENU basis is analytic, so it is
well-defined at the poles (no cross-product degeneracy).
"""
from __future__ import annotations
import numpy as np

Vec = np.ndarray


def normalize(v: Vec) -> Vec:
    v = np.asarray(v, dtype=float)
    n = np.linalg.norm(v)
    if not np.isfinite(n) or n == 0.0:
        raise ValueError("cannot normalize zero or non-finite vector")
    return v / n


def surface_position_km(lat_deg: float, lon_deg: float, elevation_m: float, radius_km: float) -> Vec:
    """Body-fixed Cartesian position (km) on a sphere of `radius_km` plus elevation. Level-1 shape model."""
    lat, lon = np.radians(lat_deg), np.radians(lon_deg)
    r = radius_km + elevation_m / 1000.0
    return r * np.array([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)])


def enu_basis(lat_deg: float, lon_deg: float) -> tuple[Vec, Vec, Vec]:
    """Return (east, north, up) unit vectors in the body-fixed frame for a spherical body."""
    lat, lon = np.radians(lat_deg), np.radians(lon_deg)
    east = np.array([-np.sin(lon), np.cos(lon), 0.0])
    north = np.array([-np.sin(lat) * np.cos(lon), -np.sin(lat) * np.sin(lon), np.cos(lat)])
    up = np.array([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)])
    return east, north, up


def to_az_el(vec_bodyfixed: Vec, lat_deg: float, lon_deg: float) -> tuple[float, float, float]:
    """Observer->target vector (body-fixed) -> (azimuth_deg [0,360) clockwise from north, elevation_deg, range)."""
    e, n, u = enu_basis(lat_deg, lon_deg)
    rng = float(np.linalg.norm(vec_bodyfixed))
    d = normalize(vec_bodyfixed)
    el = float(np.degrees(np.arcsin(np.clip(np.dot(d, u), -1.0, 1.0))))
    az = float(np.degrees(np.arctan2(np.dot(d, e), np.dot(d, n))) % 360.0)
    return az, el, rng


def angular_radius_deg(body_radius_km: float, distance_km: float) -> float:
    if distance_km <= body_radius_km:
        raise ValueError("distance must exceed body radius")
    return float(np.degrees(np.arcsin(body_radius_km / distance_km)))


def disk_visible_fraction(center_elev_deg: float, angular_radius_deg_: float, horizon_elev_deg: float = 0.0) -> float:
    """Fraction of a circular disk of angular radius rho above a straight horizon.

    x = (h - horizon)/rho ; visible = 1 - (acos(x) - x*sqrt(1-x^2))/pi for |x|<1.
    Small-angle planar approximation (valid for rho << 1 rad, true for Sun/Earth from the Moon).
    """
    if angular_radius_deg_ <= 0:
        raise ValueError("angular radius must be positive")
    x = (center_elev_deg - horizon_elev_deg) / angular_radius_deg_
    if x >= 1.0:
        return 1.0
    if x <= -1.0:
        return 0.0
    return float(1.0 - (np.arccos(x) - x * np.sqrt(1.0 - x * x)) / np.pi)
