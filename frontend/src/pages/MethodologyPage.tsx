export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Scientific Methodology & Provenance</h1>
        <p className="text-sm text-mute">Rigorous astronomical computations, coordinate conventions, and uncertainty disclosure.</p>
      </div>
      <div className="rounded-xl bg-surface p-6 border border-white/5 space-y-4 text-sm text-mute leading-relaxed">
        <h3 className="text-ink font-semibold">1. Geometry & Ephemeris</h3>
        <p>All positions and vector transformations are computed exclusively in the backend science engine via NASA SPICE (SpiceyPy) using official JPL development ephemerides (DE440s) and lunar orientation frames (MOON_PA / MOON_ME).</p>
        <h3 className="text-ink font-semibold">2. Coordinate Systems</h3>
        <p>Planetocentric latitude and east-positive longitude are strictly enforced across all API boundaries and calculations. Other conventions are rejected.</p>
        <h3 className="text-ink font-semibold">3. Known Limitations</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Spherical reference body model for basic visibility; LOLA DEM 2.5-D horizon profiles for regional shadowing.</li>
          <li>Atmospheric refraction is zero (vacuum environment).</li>
          <li>Solar irradiance scales as $S_0 \cdot (1AU / r)^2$.</li>
        </ul>
      </div>
    </div>
  );
}
