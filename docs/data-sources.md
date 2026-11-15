# Data Sources & Terrain Datasets

## 1. Ephemeris & Orientation Kernels (NAIF SPICE)
- **LSK**: `naif0012.tls` (Leapseconds)
- **SPK**: `de440s.bsp` (JPL Planetary Ephemeris 1950–2050)
- **PCK**: `pck00011.tpc` (Constants)
- **FK**: `moon_de440_250416.tf` (Lunar Frame Definitions)
- **BPC**: `moon_pa_de440_200625.bpc` (Lunar Principal Axis Orientation)

## 2. Terrain Datasets (LOLA DEM)
- **Dataset Name**: `ldem_64.img` (LOLA South Polar LDEM)
- **URL**: `https://imbrium.mit.edu/DATA/LOLA_GDR/LDEM_64/SOUTH/`
- **Version**: 1.0
- **Resolution**: ~463.3 meters/pixel (64 pixels/degree)
- **License**: Public Domain (NASA Planetary Data System / MIT Imbrium)
- **Note**: Rasters are git-ignored and loaded via Rasterio when present in `data/terrain/`.
