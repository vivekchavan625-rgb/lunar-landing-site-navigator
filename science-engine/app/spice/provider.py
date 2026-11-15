from __future__ import annotations
from typing import Protocol
import numpy as np


class EphemerisProvider(Protocol):
    kernels: list[str]
    def utc_to_et(self, utc_iso: str) -> float: ...
    def et_to_utc_iso(self, et: float) -> str: ...
    def moon_radius_km(self) -> float: ...
    def moon_to(self, target: str, et: float, frame: str) -> np.ndarray: ...
    def require_coverage(self, et0: float, et1: float) -> None: ...


class SpiceProvider:
    def __init__(self) -> None:
        from app.spice import kernels, ephemeris
        self._k, self._e = kernels, ephemeris
        kernels.ensure_loaded()
        self.kernels = kernels.loaded_kernel_names()

    def utc_to_et(self, utc_iso): return self._e.utc_to_et(utc_iso)
    def et_to_utc_iso(self, et): return self._e.et_to_utc_iso(et)
    def moon_radius_km(self): return self._e.moon_radius_km()
    def moon_to(self, target, et, frame): return self._e.moon_to(target, et, frame)
    def require_coverage(self, et0, et1): self._k.require_coverage(et0, et1)
