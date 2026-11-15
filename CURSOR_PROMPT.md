# CURSOR AGENT PROMPT — Lunar Landing Site Navigator (NASA Space Apps 2026)

**Deadline: Nov 15, 2026 11:59 PM local. Prioritise a working, honest, scientifically valid MVP over breadth.**
You are continuing an existing monorepo. Do NOT restart or re-scaffold. First run the "Verify baseline" commands, then work the phases in order.

---
## 0. Ground rules (non-negotiable)
1. Never fabricate scientific values. Missing kernel/DEM → explicit error, or `null` + warning. Never a plausible number.
2. All geometry is computed in `science-engine/` with SpiceyPy. No ephemeris maths in JS/TS. Frontend renders backend results only.
3. Distinguish (never interchange): geometric elevation · apparent elevation · terrain-obstructed visibility · irradiance · panel power · geometric Earth visibility · terrain-obstructed Earth visibility · RF link. Electrical energy is shown ONLY when panel parameters were supplied.
4. Angles in degrees at API boundaries, radians only inside math libs. Units in field names (`...Km`, `...M`, `...Wm2`).
5. Planetocentric latitude, east-positive longitude only. Reject other conventions; never silently convert.
6. UTC→ET only via `spice.str2et` with the loaded LSK.
7. Every result carries provenance: frame, kernel names, fidelity level (GEOMETRIC/TERRAIN_APPROX/DEM/DEM_HIGHRES), warnings. UI always shows the level.
8. No Earth EPSG codes on lunar data. No silent DEM substitution. Do not load user-supplied kernel files.
9. DB access only as `app_user` (NOBYPASSRLS) via `withUser()`. Parameterised SQL only.
10. After each phase: list files changed, run the phase's acceptance commands, paste REAL output, list remaining limitations. Do not claim anything works without a test you ran.
11. Do not commit kernels/DEMs/secrets. `data/kernels/*` and `data/terrain/*` are git-ignored except `mission.tm`.

---
## 1. Baseline state (what already exists — verified in the authoring sandbox)
| Area | State | Evidence |
|---|---|---|
| `science-engine/` pure geometry (ENU basis, az/el, disk visibility fraction, irradiance, panel power, trapezoid energy, Brent event detection, DEM horizon profile) | implemented | `pytest` → 23 passed, 1 skipped (SPICE tests skip until kernels exist) |
| Calculation pipeline `app/api/compute.py` (provider-injected) | implemented, tested with a SYNTHETIC provider (tests only) | `tests/test_pipeline.py` |
| FastAPI app (`/health /ready /v1/kernels /v1/calculate`) | implemented, not run against real kernels | — |
| SPICE kernel manager / fetch script / meta-kernel | written, **UNTESTED against real kernels** (sandbox could not reach naif.jpl.nasa.gov) | — |
| `database/migrations/001–004` + `migrate.sh` | applied cleanly on PostgreSQL 16 + PostGIS | `tests/integration/rls_isolation.sh` → PASS |
| Express backend (sites, calculations w/ dedupe+persist, scenarios, data-sources, reports csv/json, helmet, CORS, rate-limit, guest session) | implemented | `vitest` → 13 passed; one-off e2e (backend→stub engine→Postgres) persisted samples/events and CSV export OK |
| Frontend (Vite+React+TS+Tailwind+Query+Recharts) | `/mission` page works against the API; other routes are stubs | `npm run build` OK |
| `docs/openapi.yaml` | contract for all routes (comparisons/PDF marked 501) | — |

**Things the author could NOT verify — check them first (Phase 2):**
- Exact kernel filenames in `data/metadata/kernel_catalog.json` (esp. `moon_de440_250416.tf`, `moon_pa_de440_200625.bpc`). Open the NAIF listings and fix. The lunar PCK and FK **must be a matching pair**.
- That frame names `MOON_ME` / `MOON_PA` exist in the FK you load, and `MOON_PA_FRAME_CLASS_ID = 31008` in `app/spice/kernels.py` matches the FK's frame ID (needed for `pckcov`).
- The Apollo coordinates in `004_seed_sites.sql` were entered from memory → seeded `verified=FALSE`. Verify each against LROC/NASA, then flip. Do NOT invent CLPS/Artemis coordinates; if no authoritative point exists, add as `PLANNED_TARGET_REGION`/`CANDIDATE_REGION` with bounds in description only.
- Light-time/aberration: `spkpos(..., 'LT+S', 'MOON')` is taken from the Moon centre, not the surface point (sub-ms difference). Document; keep.

---
## 2. Verify baseline (run first; fix anything red before new work)
```bash
cp .env.example .env            # then set real passwords
docker compose up -d db
DATABASE_ADMIN_URL=postgresql://postgres:<pw>@localhost:5432/lunar_navigator ./database/migrate.sh
psql "$DATABASE_ADMIN_URL" -c "ALTER ROLE app_user PASSWORD '<APP_DB_PASSWORD>'"
(cd science-engine && pip install -r requirements.txt && python -m pytest -q)
(cd backend && npm i && DATABASE_URL=postgresql://app_user:<pw>@localhost:5432/lunar_navigator npx vitest run)
(cd frontend && npm i && npm run build)
DATABASE_ADMIN_URL=... DATABASE_APP_URL=postgresql://app_user:<pw>@localhost:5432/lunar_navigator bash tests/integration/rls_isolation.sh
```
Expect: 23 passed/1 skipped · 13 passed · build ok · `RLS isolation: PASS`.

---
## 3. Phases

### Phase 2 — Real SPICE data (HIGHEST PRIORITY; everything scientific depends on it)
Tasks
1. Verify/fix `kernel_catalog.json` against NAIF listings; run `python science-engine/scripts/fetch_kernels.py`. It records SHA-256 in `data/metadata/kernel_manifest.json` (commit the manifest, not the kernels). Cross-check hashes with NAIF-published values where available.
2. Confirm `mission.tm` loads: `python -c "from app.spice.provider import SpiceProvider; print(SpiceProvider().kernels)"` (run in `science-engine/` with env vars from `.env`). Fix frame ID / names if `pckcov` or `spkpos` fails.
3. Add a `/v1/kernels` coverage check and insert kernel rows into `spice_kernels` (seed script reading the manifest + live coverage; `active=true`). Backend `/data-sources/kernels` must show them.
4. Remove the `SpiceProvider` assumption that `MOON_ME` exists if the FK doesn't define it — then restrict `bodyFrame` choices in BOTH pydantic and zod to what actually loads.

Acceptance (all must pass; `pytest -m spice` no longer skips)
- `test_utc_to_et_j2000`: `str2et('2000-01-01T12:00:00')` = 64.18392728 ± 1e-6 s.
- Moon–Earth distance 356,000–407,000 km; Sun 1.46e8–1.53e8 km at 2026-11-15.
- Request at 2500-01-01 → HTTP 422 `KERNEL_COVERAGE` naming the covered range (no output).
- Rename a kernel file → `/ready` returns 503 and `POST /calculations` returns 503 `KERNEL_UNAVAILABLE` naming it.
- South pole (−89.9°, lon 0) over 30 days: max Sun elevation < 3° (obliquity ≈1.54°) — Level-1 sanity.

### Phase 3 — Horizons cross-validation (server-side only)
Implement `science-engine/app/validation/horizons.py` (httpx, 15 s timeout, retries=2, never from the browser). Query: target Sun(10)/Earth(399), observer = lunar surface site (`CENTER='coord@301'` with `SITE_COORD`; **read the Horizons manual for the exact coordinate/ COORD_TYPE semantics and the TDB/UT time scale — do not trust defaults**), quantities for azimuth/elevation. Log the full query config in the response.
Endpoint `POST /v1/validate/horizons` returns per-sample differences. Acceptance:
- Pytest (marked `network`, skipped offline) for 3 sites × 3 dates compares Sun/Earth az/el. Start tolerance **0.05° elevation / 0.1° azimuth** for Level 1 at non-polar sites; record actual deltas in `docs/validation-report.md` and explain any excess (frame ME vs PA ≈ <0.1°, sphere vs terrain, aberration setting, refraction off). Polar sites: expect larger differences — report, don't hide.

### Phase 4 — Terrain (DEM) — makes "terrain-aware" claims legitimate
1. Choose ONE LOLA product (e.g. south-polar LDEM tile, ~20–60 m) from PDS/imbrium; document URL/version/resolution/license in `docs/data-sources.md`; register in `terrain_datasets` (+ checksum). Never commit the raster.
2. Implement `science-engine/app/terrain/provider.py` (`load_horizon_profile`) with rasterio: use the raster's own lunar CRS (never an Earth EPSG), window ≤ configurable radius, call `horizon_profile()` (already tested), return `(profile_deg[360], dataset_name)`. Outside coverage → `(None, None)` (existing behaviour: warning + GEOMETRIC).
3. In `compute.py`, set `calculationMethod="DEM"` only when a profile was used; terrain sun fraction uses `horizon_at(profile, az)` (already wired). Add observer elevation from DEM when `elevationM` is null.
4. Known limitation to state in UI/methodology: the sun-disk visibility uses the horizon elevation at the Sun's centre azimuth (planar approximation across the disk); terrain is a 2.5-D horizon (no multi-bounce, no Earth-shine).
Acceptance: synthetic ridge test (exists) + a real-DEM test at a polar site showing (a) horizon max elevation plausible (a few degrees at polar crater rims), (b) site outside tile → warning present and `terrainAvailable=false`, (c) compare 1 illumination timeline qualitatively against NASA SVS 5027 for the same date; document mismatch causes.

### Phase 5 — Backend completion
- `POST/GET/DELETE /comparisons` (≤3 sites, same time config; run each calc; return aligned series). Table + RLS exist.
- `POST /reports/:id/pdf` (pdfkit or puppeteer) — must include: site coords + frame + latitude type, UTC time, fidelity level, metrics, time-series summary + a chart, events with tolerances, kernel names/hashes, terrain dataset, methodology, assumptions, uncertainties, warnings.
- Redis cache is optional; the DB dedupe (`request_hash`) already works. Add OpenAPI serving at `/api/v1/docs` (swagger-ui-express reading `docs/openapi.yaml`).
- Backend tests: supertest for every route incl. 400/404/422/502/504, ownership isolation (two agents), rate limit 429, CSV-injection guard.
Acceptance: `vitest run` green; `npx tsc --noEmit` clean; OpenAPI file matches implemented routes.

### Phase 6 — Frontend (premium mission-control UI)
Build all routes in the master prompt (`/ /mission /sites /compare /analysis /timeline /data-sources /saved-scenarios /methodology /about`). Palette in `tailwind.config.js` (deep space `#070B14`, cyan, solar amber, earth blue). Requirements:
- Mission page: site selector (show `verified` + `locationStatus` badges), custom lat/lon with explicit "planetocentric / east+" labels, datetime+timezone (convert to UTC before sending), duration/step, optional panel form (hide energy unless panel supplied), React Hook Form + zod.
- Always render `ModeBadge` + warnings; show `N/A — terrain not evaluated` instead of 0 or 100 %.
- Time slider / play-pause / speed reads the **stored series** (no invented motion); event markers from `/events` with ±tolerance.
- Compare page: ≤3 sites, synchronised charts (shared time axis), metric table.
- Data sources page: `/data-sources/kernels` + `/terrain`, coverage window, missing-data warnings.
- Responsive (panels collapse <768 px), loading + error states, ErrorBoundary, keyboard-accessible controls, WCAG AA contrast.
Acceptance: `npm run build` clean; Playwright (or manual script) walks: pick site → run → metrics+chart+events → scrub timeline → add 2nd site → compare → save scenario → export CSV.

### Phase 7 — 3D viewer (React Three Fiber + drei)
`Lunar3DViewer`: textured Moon sphere (use a freely licensed NASA/SVS or LROC colour/height map; cite it), site markers from `/sites`, orbit controls + reset + south-pole focus, Sun and Earth direction arrows **driven by the selected sample's az/el converted via the local ENU basis → body-fixed**, local horizon ring, optional horizon-profile polar chart from the terrain endpoint. Do NOT compute metrics from the mesh. Lazy-load the viewer (code-split; current bundle >500 kB).
Acceptance: arrows change with the slider; marker click selects site; 60 fps desktop on the moon preview; `three`-related code not in the initial bundle.

### Phase 8 — Scientific validation report (`docs/validation-report.md`)
Required content: kernel set + hashes; UTC→ET check; ENU/az-el unit tests; Horizons table (Phase 3) with deltas and explanations; event-time check (compare sunrise/sunset times vs Horizons rise/set within the refinement tolerance + documented model differences); numerical-integration check (constant & triangle); DEM horizon test; SVS qualitative comparison; list of known limitations (sphere shape model, no refraction, 2.5-D horizon, geometric ≠ RF link, irradiance = TSI·(1AU/r)², energy is an engineering estimate).

### Phase 9 — Security, deployment, demo
- `npm audit` / `pip-audit`; Helmet CSP tuned for the built frontend; CORS only `APP_URL`; `COOKIE_SECURE=true` in prod; rotate `app_user` password; science engine NOT publicly reachable (loopback/private network only); backend never returns stack traces.
- Deploy (suggest: Render/Fly/Railway for backend+engine in Docker, Neon/Supabase-with-PostGIS or Railway Postgres for DB, Vercel/Netlify for the frontend; kernels must be fetched at build/start on the engine host via `fetch_kernels.py`, or mounted from a volume — **de440s ≈ 32 MB; confirm the host allows it**). Set env vars on the host, never in the frontend.
- Demo script (3–5 min): open → choose Apollo 17 and a south-pole point → run → show Sun/Earth + fidelity badge → timeline → compare 2 sites → methodology + provenance → CSV/PDF export.
Acceptance: end-to-end calc from the public URL succeeds; `/ready` true; no secrets in the bundle (`grep -r` for DB URL/JWT in `frontend/dist`).

---
## 4. API contract
`docs/openapi.yaml` is authoritative. Key rules: `POST /calculations` validates with zod (timezone-bearing ISO time, planetocentric only, finite numbers, `durationHours*60/samplingMinutes+1 ≤ 20000`, panel needs area+efficiency), dedupes by `sha256(canonical request + engine version)` per user, forwards to the engine, persists samples (`terrain_illumination_fraction` is stored **NULL in GEOMETRIC mode**), events, provenance. Errors: `{error:{code,message,requestId,details?}}`. Codes used: `VALIDATION 400`, `NOT_FOUND 404`, `KERNEL_COVERAGE 422`, `SCIENCE_ERROR/SCIENCE_UNREACHABLE 502`, `SCIENCE_TIMEOUT 504`, `KERNEL_UNAVAILABLE 503`, `INTERNAL 500`.

## 5. Schemas
Engine ↔ backend ↔ frontend share names: `Sample` (solar/earth az, geometric elevation, angular radius, distance, irradiance, disk visibility fractions, optional panel power), `EventOut` (type, timeUTC, refinementToleranceSeconds, definition = upper limb crossing of the geometric/terrain horizon, no refraction), `Energy`, `Provenance`. See `science-engine/app/models/schemas.py` and `frontend/src/types/api.ts`. Keep all three in sync when you change any.

## 6. Definition of done (check every box with evidence)
- [ ] Real SPICE kernels load; coverage enforced; checksums verified
- [ ] Horizons comparison table with documented deltas
- [ ] ≥1 real DEM integrated; terrain mode labelled; out-of-coverage handled
- [ ] RLS isolation test + API ownership tests green
- [ ] All 10 routes implemented and navigable; no dead buttons
- [ ] 3D viewer driven by stored results
- [ ] CSV/JSON/PDF export incl. provenance + limitations
- [ ] Validation report written; limitations stated honestly
- [ ] Deployed; e2e calc works from public URL; demo rehearsed
If you must cut scope, cut in this order: PDF → 3D polish → saved-scenario comparison → Redis. Never cut: real SPICE, provenance, fidelity labelling, honest limitations.
