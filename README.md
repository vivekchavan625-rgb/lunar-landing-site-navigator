# Lunar Landing Site Navigator
NASA Space Apps 2026. React/Vite/TS · Express/TS · FastAPI + SpiceyPy · PostgreSQL/PostGIS.

**Start with `CURSOR_PROMPT.md`** (agent instructions, phases, acceptance tests). Contract: `docs/openapi.yaml`.

Quick start: `cp .env.example .env` → `docker compose up -d db` → `./database/migrate.sh` → `python science-engine/scripts/fetch_kernels.py` → run services (see CURSOR_PROMPT §2).
Without kernels the engine returns 503 `KERNEL_UNAVAILABLE` — by design, it never fabricates results.
