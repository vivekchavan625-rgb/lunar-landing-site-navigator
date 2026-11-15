"""Physical constants. Every constant carries its source. Units are in the name."""

AU_KM = 149_597_870.7                 # IAU 2012 Resolution B2 (exact)
SOLAR_CONSTANT_1AU_W_M2 = 1360.8      # Kopp & Lean (2011), TSI at 1 AU; replace via config if needed
SOLAR_CONSTANT_SOURCE = "Kopp & Lean 2011, GRL 38, L01706 (TSI 1360.8 W/m^2 at 1 AU)"
SUN_RADIUS_KM = 695_700.0             # IAU 2015 Resolution B3 nominal solar radius
EARTH_MEAN_RADIUS_KM = 6371.0084      # IAU 2015 nominal volumetric mean radius (approx.)
MOON_REFERENCE_RADIUS_KM = 1737.4     # IAU/LOLA reference sphere used by pck00011 (verify via bodvrd at runtime)
MOON_NAIF_ID = 301
EARTH_NAIF_ID = 399
SUN_NAIF_ID = 10
