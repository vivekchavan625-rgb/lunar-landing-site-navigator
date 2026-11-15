KPL/MK

Meta-kernel for Lunar Landing Site Navigator.
Load order matters: LSK, PCK constants, binary lunar PCK, then FK that defines MOON_PA/MOON_ME, then SPK.
Generated names must match data/metadata/kernel_manifest.json (created by science-engine/scripts/fetch_kernels.py).

\begindata
  PATH_VALUES  = ( '.' )
  PATH_SYMBOLS = ( 'KERNELS' )
  KERNELS_TO_LOAD = (
    '$KERNELS/naif0012.tls',
    '$KERNELS/pck00011.tpc',
    '$KERNELS/moon_pa_de440_200625.bpc',
    '$KERNELS/moon_de440_250416.tf',
    '$KERNELS/de440s.bsp'
  )
\begintext
