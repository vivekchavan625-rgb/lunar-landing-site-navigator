import numpy as np, pytest
from app.energy.solar import irradiance_w_m2, panel_power_w, integrate_energy_wh, panel_normal_enu, incidence_cos
from app.geometry.constants import AU_KM, SOLAR_CONSTANT_1AU_W_M2
from app.events.detection import find_crossings
from app.terrain.horizon import horizon_profile, horizon_at


def test_inverse_square():
    assert irradiance_w_m2(AU_KM) == pytest.approx(SOLAR_CONSTANT_1AU_W_M2)
    assert irradiance_w_m2(2 * AU_KM) == pytest.approx(SOLAR_CONSTANT_1AU_W_M2 / 4)
    with pytest.raises(ValueError): irradiance_w_m2(0)


def test_integration_constant_and_triangle():
    assert integrate_energy_wh(np.array([0, 3600.0]), np.array([100.0, 100.0])) == pytest.approx(100.0)
    t = np.linspace(0, 7200, 201); p = np.where(t < 3600, t / 3600 * 200, (7200 - t) / 3600 * 200)
    assert integrate_energy_wh(t, p) == pytest.approx(200.0, rel=1e-3)  # area = 0.5*7200*200/3600
    with pytest.raises(ValueError): integrate_energy_wh(np.array([0.0]), np.array([1.0]))


def test_panel_power_rules():
    assert panel_power_w(1360, 2, 0.3, 1.0, 1.0) == pytest.approx(816)
    assert panel_power_w(1360, 2, 0.3, -0.5, 1.0) == 0.0     # back-lit
    assert panel_power_w(1360, 2, 0.3, 1.0, 0.5) == pytest.approx(408)
    with pytest.raises(ValueError): panel_power_w(1360, 2, 1.5, 1, 1)


def test_incidence():
    n = panel_normal_enu(0, 0)  # faces zenith
    assert incidence_cos(0, 90, n) == pytest.approx(1)
    assert incidence_cos(0, 0, n) == pytest.approx(0, abs=1e-12)
    assert incidence_cos(10, 20, None) == 1.0


def test_crossings_refined_and_direction():
    f = lambda t: np.sin(2 * np.pi * t / 1000.0)
    ev = find_crossings(f, np.arange(0, 2001, 100.0), "RISE", "SET", xtol_s=0.01)
    # sin starts rising from 0 at t=0, so the first detected crossing (t=500) is downward = SET
    assert [e.kind for e in ev] == ["SET", "RISE", "SET"]
    assert ev[0].et == pytest.approx(500.0, abs=0.05)
    assert ev[1].et == pytest.approx(1000.0, abs=0.05)
    assert ev[2].et == pytest.approx(1500.0, abs=0.05)


def test_horizon_wall_east():
    dem = np.zeros((101, 101)); dem[:, 60:] = 10.0   # 10 m step 10 cells east of observer at col 50
    prof = horizon_profile(dem, 50, 50, cell_m=10.0)
    assert horizon_at(prof, 90.0) == pytest.approx(np.degrees(np.arctan2(10, 100)), abs=0.5)
    assert horizon_at(prof, 270.0) < 0.01
    assert horizon_at(prof, 0.0) < 0.5


def test_horizon_flat_is_non_positive():
    prof = horizon_profile(np.zeros((51, 51)), 25, 25, 5.0)
    assert prof.max() <= 1e-6
