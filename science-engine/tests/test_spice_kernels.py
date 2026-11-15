"""Run only when verified kernels are present (python scripts/fetch_kernels.py)."""
import numpy as np, pytest
from app.spice import kernels

pytestmark = pytest.mark.spice
if not kernels.META_KERNEL.exists() or kernels.verify_manifest():
    pytest.skip("SPICE kernels not installed/verified", allow_module_level=True)

from app.spice.provider import SpiceProvider
from app.api.compute import run
from app.models.schemas import CalculationRequest


def test_utc_to_et_j2000():
    p = SpiceProvider()
    assert p.utc_to_et("2000-01-01T12:00:00") == pytest.approx(64.18392728, abs=1e-6)  # TDB-UTC at J2000


def test_distances_plausible():
    p = SpiceProvider(); et = p.utc_to_et("2026-11-15T00:00:00")
    assert 356_000 < np.linalg.norm(p.moon_to("EARTH", et, "MOON_ME")) < 407_000
    assert 1.46e8 < np.linalg.norm(p.moon_to("SUN", et, "MOON_ME")) < 1.53e8


def test_coverage_rejection():
    r = CalculationRequest.model_validate({"site": {"latitude": -89.5, "longitude": 0, "coordinateType": "PLANETOCENTRIC"},
        "time": {"utc": "2500-01-01T00:00:00Z"}, "analysis": {"durationHours": 24, "samplingMinutes": 60}})
    with pytest.raises(kernels.KernelCoverageError):
        run(r, SpiceProvider())


def test_south_pole_sun_never_high():
    r = CalculationRequest.model_validate({"site": {"latitude": -89.9, "longitude": 0, "coordinateType": "PLANETOCENTRIC"},
        "time": {"utc": "2026-11-15T00:00:00Z"}, "analysis": {"durationHours": 24 * 30, "samplingMinutes": 120}})
    out = run(r, SpiceProvider())
    assert max(s.solarGeometricElevationDeg for s in out.samples) < 3.0   # Moon obliquity ~1.54 deg
