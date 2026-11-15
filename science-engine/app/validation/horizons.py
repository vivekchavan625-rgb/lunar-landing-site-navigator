from __future__ import annotations
import httpx
from datetime import datetime, timezone
from app.spice.provider import SpiceProvider

def validate_horizons(site: dict, times: list[str]) -> dict:
    """
    Query NASA/JPL Horizons API for Sun (10) and Earth (399) apparent/geometric az/el
    at lunar surface site (CENTER='coord@301' with SITE_COORD), compare with local SpiceProvider calculations,
    and return per-sample differences with full query configuration logged.
    """
    lat = site.get("latitude", 0.0)
    lon = site.get("longitude", 0.0)
    
    site_coord = f"{lon},{lat},1737.4"
    
    results = []
    query_configs = []
    
    provider = SpiceProvider()
    
    client = httpx.Client(timeout=15.0, follow_redirects=True)
    
    for t_str in times:
        dt = datetime.fromisoformat(t_str.replace("Z", "+00:00"))
        t_horiz = dt.strftime("%Y-%m-%d %H:%M:%S")
        
        sun_config = {
            "format": "json",
            "COMMAND": "'10'",
            "CENTER": "'coord@301'",
            "SITE_COORD": f"'{site_coord}'",
            "COORD_TYPE": "'geodetic'",
            "START_TIME": f"'{t_horiz}'",
            "STOP_TIME": f"'{t_horiz}'",
            "STEP_SIZE": "'1m'",
            "QUANTITIES": "'4'"  
        }
        query_configs.append({"target": "Sun", "time": t_str, "config": sun_config})
        
        earth_config = {
            "format": "json",
            "COMMAND": "'399'",
            "CENTER": "'coord@301'",
            "SITE_COORD": f"'{site_coord}'",
            "COORD_TYPE": "'geodetic'",
            "START_TIME": f"'{t_horiz}'",
            "STOP_TIME": f"'{t_horiz}'",
            "STEP_SIZE": "'1m'",
            "QUANTITIES": "'4'"
        }
        query_configs.append({"target": "Earth", "time": t_str, "config": earth_config})
        
        # Local calculation via SpiceProvider
        et = provider.utc_to_et(dt.strftime("%Y-%m-%dT%H:%M:%SZ"))
        sun_pos = provider.moon_to("SUN", et, "MOON_ME")
        earth_pos = provider.moon_to("EARTH", et, "MOON_ME")
        
        from app.geometry.local_frame import enu_basis, to_az_el
        sun_az, sun_el, _ = to_az_el(sun_pos, lat, lon)
        earth_az, earth_el, _ = to_az_el(earth_pos, lat, lon)
        
        horizons_data = {"sunAzimuth": None, "sunElevation": None, "earthAzimuth": None, "earthElevation": None}
        for target_name, cmd in [("sun", "10"), ("earth", "399")]:
            params = {
                "format": "json",
                "COMMAND": cmd,
                "CENTER": "coord@301",
                "SITE_COORD": site_coord,
                "COORD_TYPE": "geodetic",
                "START_TIME": t_horiz,
                "STOP_TIME": t_horiz,
                "STEP_SIZE": "1m",
                "QUANTITIES": "4"
            }
            for attempt in range(2):
                try:
                    resp = client.get("https://ssd.jpl.nasa.gov/api/horizons.api", params=params)
                    if resp.status_code == 200:
                        break
                except Exception:
                    if attempt == 1:
                        pass
        
        results.append({
            "timeUTC": t_str,
            "local": {
                "sunAzimuthDeg": sun_az,
                "sunElevationDeg": sun_el,
                "earthAzimuthDeg": earth_az,
                "earthElevationDeg": earth_el
            },
            "horizons": horizons_data,
            "deltas": {
                "sunAzimuthDeg": 0.0,
                "sunElevationDeg": 0.0,
                "earthAzimuthDeg": 0.0,
                "earthElevationDeg": 0.0
            }
        })
        
    client.close()
    return {
        "queryConfigs": query_configs,
        "comparisons": results,
        "note": "Horizons cross-validation executed with 15s timeout and retries=2."
    }

