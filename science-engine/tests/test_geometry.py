import numpy as np, pytest
from app.geometry.local_frame import enu_basis, to_az_el, disk_visible_fraction, normalize, angular_radius_deg
from app.geometry.constants import SUN_RADIUS_KM, AU_KM


@pytest.mark.parametrize("lat,lon", [(0, 0), (45, 120), (-89.9, -170), (90, 0), (-90, 33)])
def test_enu_orthonormal_right_handed(lat, lon):
    e, n, u = enu_basis(lat, lon)
    assert np.allclose([e @ e, n @ n, u @ u], 1)
    assert abs(e @ n) < 1e-12 and abs(e @ u) < 1e-12 and abs(n @ u) < 1e-12
    assert np.allclose(np.cross(e, n), u)  # E x N = U


def test_az_el_cardinals():
    e, n, u = enu_basis(10, 20)
    az, el, _ = to_az_el(u * 5, 10, 20); assert abs(el - 90) < 1e-9
    az, el, _ = to_az_el(n, 10, 20); assert abs(az) < 1e-9 and abs(el) < 1e-9
    az, el, _ = to_az_el(e, 10, 20); assert abs(az - 90) < 1e-9
    az, el, _ = to_az_el(-n, 10, 20); assert abs(az - 180) < 1e-9


def test_normalize_rejects_zero_and_nan():
    with pytest.raises(ValueError): normalize(np.zeros(3))
    with pytest.raises(ValueError): normalize(np.array([np.nan, 0, 0]))


def test_sun_angular_radius_at_1au():
    assert angular_radius_deg(SUN_RADIUS_KM, AU_KM) == pytest.approx(0.2666, abs=2e-3)


def test_disk_fraction_boundaries_and_symmetry():
    rho = 0.27
    assert disk_visible_fraction(0.0, rho) == pytest.approx(0.5)
    assert disk_visible_fraction(rho, rho) == 1.0 and disk_visible_fraction(-rho, rho) == 0.0
    for h in np.linspace(-0.26, 0.26, 13):
        assert disk_visible_fraction(h, rho) + disk_visible_fraction(-h, rho) == pytest.approx(1.0)
    hs = np.linspace(-0.3, 0.3, 50)
    f = [disk_visible_fraction(h, rho) for h in hs]
    assert all(b >= a - 1e-12 for a, b in zip(f, f[1:]))


def test_center_above_horizon_does_not_mean_disk_fully_visible():
    assert disk_visible_fraction(0.05, 0.27) < 1.0  # centre up, disk only partly up


def test_horizon_offset_shifts_fraction():
    assert disk_visible_fraction(2.0, 0.27, horizon_elev_deg=2.0) == pytest.approx(0.5)
