from __future__ import annotations
import numpy as np
import spiceypy as spice
from app.spice.kernels import LOCK, ensure_loaded

ABCORR = "LT+S"


def utc_to_et(utc_iso: str) -> float:
    ensure_loaded()
    with LOCK:
        return float(spice.str2et(utc_iso))  # never add constants manually


def et_to_utc_iso(et: float) -> str:
    with LOCK:
        return spice.et2utc(et, "ISOC", 3) + "Z"


def moon_radius_km() -> float:
    ensure_loaded()
    with LOCK:
        _, radii = spice.bodvrd("MOON", "RADII", 3)
    return float(radii[0])  # pck00011: sphere (1737.4 km)


def moon_to(target: str, et: float, frame: str) -> np.ndarray:
    """Moon-centre -> target position (km) in `frame`, with light-time + stellar aberration."""
    ensure_loaded()
    with LOCK:
        pos, _lt = spice.spkpos(target, et, frame, ABCORR, "MOON")
    return np.array(pos, dtype=float)
