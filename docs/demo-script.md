# Demo Script (3–5 Minutes) — Lunar Landing Site Navigator
**NASA Space Apps Challenge 2026**

## 1. Introduction (0:00 – 0:45)
- **Hook:** "Welcome to the Lunar Landing Site Navigator — a scientifically rigorous, SPICE-backed mission planning tool designed for lunar explorers, Artemis scientists, and mission operators."
- **Core Value Proposition:** "Unlike typical web tools that use approximate ephemerides, every calculation here is computed via NASA NAIF SPICE kernels, verified against JPL Horizons, and integrated with LOLA Digital Elevation Models."

## 2. Mission Planner & Site Selection (0:45 – 2:00)
- **Action:** Open `http://localhost:5173/mission`.
- **Narration:** "Let's plan a 30-day mission to Apollo 17 in the Taurus-Littrow valley, or switch to an Artemis III candidate region near the lunar south pole (Shackleton Rim)."
- **Highlight:** Point out the planetocentric latitude and east-positive longitude fields, ISO UTC start time picker, and optional solar panel engineering parameters.
- **Run Calculation:** Click **Run Calculation**.

## 3. Results, Provenance & Fidelity Badge (2:00 – 3:00)
- **Narration:** "Look at the results: we instantly get solar elevation, Earth elevation, solar irradiance, and terrain illumination percentage."
- **Highlight:** Point out the **Fidelity Badge** (`DEM` or `TERRAIN_APPROX`), kernel provenance (`de440s.bsp`, `naif0012.tls`), and warning notices. Explain that terrain illumination correctly shows `N/A — terrain not evaluated` when outside DEM coverage, adhering strictly to scientific honesty.
- **Time-Series Chart:** Show the interactive Recharts solar and earth elevation curves.

## 4. Multi-Site Comparison & 3D Globe (3:00 – 4:00)
- **Action:** Navigate to `/compare` and `/analysis` (or `/sites`).
- **Narration:** "Operators can compare up to 3 sites side-by-side to evaluate shadowing risks. In the 3D Lunar Viewer powered by React Three Fiber, we can rotate around the textured Moon sphere, focus on the south pole, and observe real-time Sun and Earth direction vectors derived from local ENU transformations."

## 5. Methodology & Export (4:00 – 4:30)
- **Action:** Navigate to `/methodology` and show CSV/PDF export options.
- **Narration:** "Every assumption, coordinate convention, and known limitation—such as the 2.5-D horizon approximation—is fully documented in our scientific validation report. Users can export audit-ready CSV datasets and PDF reports containing complete provenance."
- **Conclusion:** "Thank you!"
