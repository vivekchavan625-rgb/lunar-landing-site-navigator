"""Terrain hook. Returns (horizon_profile_deg[360], dataset_name, obs_elev) or (None, None, None) when no DEM covers the site.

Uses rasterio and pyproj with Lunar CRS (never an Earth EPSG code).
"""
from __future__ import annotations
import os
from pathlib import Path
import numpy as np
import rasterio
from rasterio.windows import Window
from pyproj import CRS, Transformer
from app.terrain.horizon import horizon_profile

TERRAIN_DIR = Path(os.getenv("SPICE_TERRAIN_DIR", "../data/terrain")).resolve()


def load_horizon_profile(lat_deg: float, lon_deg: float, max_radius_m: float = 50_000.0) -> tuple[np.ndarray | None, str | None, float | None]:
    if not TERRAIN_DIR.exists():
        return None, None, None

    rasters = list(TERRAIN_DIR.glob("*.tif")) + list(TERRAIN_DIR.glob("*.img"))
    if not rasters:
        return None, None, None

    for raster_path in rasters:
        try:
            with rasterio.open(raster_path) as src:
                raster_crs = src.crs
                if raster_crs is None:
                    continue

                lunar_latlon_crs = CRS.from_string("+proj=longlat +a=1737400 +b=1737400 +no_defs")
                transformer = Transformer.from_crs(lunar_latlon_crs, raster_crs, always_xy=True)

                x, y = transformer.transform(lon_deg, lat_deg)

                if not (src.bounds.left <= x <= src.bounds.right and src.bounds.bottom <= y <= src.bounds.top):
                    continue

                row, col = src.index(x, y)
                if not (0 <= row < src.height and 0 <= col < src.width):
                    continue

                cell_m = abs(src.res[0])
                radius_cells = int(min(max_radius_m / cell_m, max(src.height, src.width)))
                
                win_col_off = max(0, col - radius_cells)
                win_row_off = max(0, row - radius_cells)
                win_width = min(src.width - win_col_off, 2 * radius_cells + 1)
                win_height = min(src.height - win_row_off, 2 * radius_cells + 1)

                window = Window(win_col_off, win_row_off, win_width, win_height)
                dem_window = src.read(1, window=window).astype(np.float32)

                local_row = row - win_row_off
                local_col = col - win_col_off

                nodata = src.nodatavals[0]
                if nodata is not None:
                    dem_window[dem_window == nodata] = 0.0

                profile = horizon_profile(dem_window, local_row, local_col, cell_m, n_az=360, max_range_m=max_radius_m)
                obs_elev = float(dem_window[local_row, local_col])

                return profile, raster_path.name, obs_elev
        except Exception:
            continue

    return None, None, None


