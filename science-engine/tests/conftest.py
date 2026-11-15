from datetime import datetime, timedelta, timezone
import numpy as np
import pytest

J2000 = datetime(2000, 1, 1, 12, 0, 0)
AU = 149_597_870.7
SYNODIC_S = 29.530588 * 86400.0


class SyntheticProvider:
    """Analytic stand-in (TEST ONLY): Earth fixed on +X body axis (synchronous rotation), Sun circles the
    body-fixed frame once per synodic month in the equatorial plane. No leap seconds. Never used in the app."""
    kernels = ["SYNTHETIC-TEST-PROVIDER"]

    def utc_to_et(self, s): return (datetime.strptime(s[:19], "%Y-%m-%dT%H:%M:%S") - J2000).total_seconds()
    def et_to_utc_iso(self, et): return (J2000 + timedelta(seconds=et)).strftime("%Y-%m-%dT%H:%M:%S.000") + "Z"
    def moon_radius_km(self): return 1737.4
    def require_coverage(self, a, b): pass

    def moon_to(self, target, et, frame):
        if target == "EARTH":
            return np.array([384_400.0, 0.0, 0.0])
        w = 2 * np.pi / SYNODIC_S
        return AU * np.array([np.cos(w * et), -np.sin(w * et), 0.0])


@pytest.fixture
def prov():
    return SyntheticProvider()
