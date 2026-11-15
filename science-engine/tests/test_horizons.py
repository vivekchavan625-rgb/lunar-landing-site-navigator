import pytest
from app.validation.horizons import validate_horizons

def test_horizons_validation_live():
    # 3 sites × dates check
    sites = [
        {"latitude": 0.0, "longitude": 0.0, "coordinateType": "PLANETOCENTRIC"},
        {"latitude": -89.9, "longitude": 0.0, "coordinateType": "PLANETOCENTRIC"},
        {"latitude": 45.0, "longitude": 45.0, "coordinateType": "PLANETOCENTRIC"}
    ]
    times = [
        "2026-11-15T00:00:00Z",
        "2026-11-15T12:00:00Z",
        "2026-11-16T00:00:00Z"
    ]
    for s in sites:
        res = validate_horizons(s, times)
        assert "queryConfigs" in res
        assert "comparisons" in res
        assert len(res["comparisons"]) == len(times)

