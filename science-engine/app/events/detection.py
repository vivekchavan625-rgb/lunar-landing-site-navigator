"""Sign-change event detection with Brent refinement."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Callable
import numpy as np
from scipy.optimize import brentq


@dataclass
class Event:
    kind: str            # e.g. SUNRISE / SUNSET
    et: float            # refined time (same unit as input grid, here SPICE ET seconds)
    uncertainty_s: float # refinement tolerance (NOT a physical-model uncertainty)


def find_crossings(f: Callable[[float], float], t_grid: np.ndarray, rising: str, setting: str,
                   xtol_s: float = 0.5, max_subdivide: int = 0) -> list[Event]:
    """Find zero crossings of f over t_grid. f>0 means 'up/visible'.

    Short windows between samples can be missed by the coarse grid; callers must pick a
    sampling interval smaller than the shortest feature of interest (documented limitation).
    """
    vals = np.array([f(float(t)) for t in t_grid])
    out: list[Event] = []
    for i in range(len(t_grid) - 1):
        a, b = vals[i], vals[i + 1]
        if a == 0 and i == 0:
            continue
        if (a < 0 < b) or (a > 0 > b):
            root = brentq(f, float(t_grid[i]), float(t_grid[i + 1]), xtol=xtol_s)
            out.append(Event(rising if b > 0 else setting, float(root), xtol_s))
    return out
