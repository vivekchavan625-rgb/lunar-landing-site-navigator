# 🌔 Lunar Landing Site Navigator
**NASA Space Apps Challenge 2026**

> *A scientifically rigorous, NAIF SPICE-backed ephemeris, solar irradiance, earth visibility, and DEM-aware terrain illumination planning engine for lunar exploration, Artemis III landing sites, and CLPS commercial payloads.*

---

## 🚀 Live Demo
Experience the live mission control dashboard deployed in production:
👉 **[https://lunar-navigator-ebon.vercel.app](https://lunar-navigator-ebon.vercel.app)**

---

## ✨ Key Features

- **🛰️ Verified SPICE Ephemeris Engine**: Powered by NASA NAIF SPICE kernels (`de440s.bsp`, `naif0012.tls`, `pck00011.tpc`, FK/PCK frames) computed purely in Python via `Spiceypy`.
- **🏔️ Terrain & DEM Horizon Profiles**: Integrates LOLA LDEM South Polar raster tiles via `rasterio` to calculate 2.5-D horizon blockage and true crater rim shadowing.
- **☀️ Irradiance & Power Modeling**: Computes top-of-atmosphere solar irradiance, solar disk visibility fractions, and solar panel energy yields.
- **🌐 3D Mission Control Interface**: Interactive React Three Fiber 3D Moon sphere with orbit controls, south-pole focus, and dynamic Sun/Earth direction vectors.
- **📊 Multi-Site Comparisons & Reports**: Compare up to 3 landing sites simultaneously with synchronized charts, event logs, and downloadable audit-ready CSV/PDF reports.
- **🔒 Enterprise-Grade Security**: PostgreSQL Row-Level Security (RLS) isolation, Helmet CSP, rate limiting, and strict provenance tracking.

---

## 🏗️ Architecture & Tech Stack

| Tier | Technology Stack |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Three Fiber (`@react-three/drei`), Recharts, TanStack Query, Zod |
| **Backend API** | Node.js, Express, TypeScript, Zod, OpenAPI / Swagger UI (`/api/v1/docs`), Pino, Helmet |
| **Science Engine** | Python 3.11+, FastAPI, SpiceyPy, NumPy, SciPy, Rasterio, Pyproj, Shapely, Httpx, Pytest |
| **Database** | PostgreSQL 16 + PostGIS (Row-Level Security enforced via `app_user`) |

---

## 🛠️ Quick Start (Local Development)

### 1. Environment Setup
```bash
cp .env.example .env
# Set your real database passwords and environment variables in .env
```

### 2. Database & Migrations
```bash
docker compose up -d db
DATABASE_ADMIN_URL=postgresql://postgres:<password>@localhost:5432/lunar_navigator ./database/migrate.sh
psql "postgresql://postgres:<password>@localhost:5432/lunar_navigator" -c "ALTER ROLE app_user PASSWORD '<APP_DB_PASSWORD>'"
```

### 3. Fetch SPICE Kernels
```bash
cd science-engine
pip install -r requirements.txt
python scripts/fetch_kernels.py
```

### 4. Run Services
- **Science Engine**: `cd science-engine && uvicorn app.api.main:app --reload --port 8000`
- **Backend API**: `cd backend && npm install && npm run dev`
- **Frontend**: `cd frontend && npm install && npm run dev`

---

## 📜 Scientific Provenance & Validation
- **Zero Fabrication Policy**: Missing kernels or out-of-coverage ephemerides return explicit HTTP 422/503 errors (`KERNEL_COVERAGE` / `KERNEL_UNAVAILABLE`). No plausible values are ever fabricated.
- **Horizons Cross-Validation**: Server-side validation against JPL Horizons ephemerides with deltas documented in `docs/validation-report.md`.
- **API Contract**: Fully documented via OpenAPI specification at `docs/openapi.yaml`.

---

## 🛡️ License & Team
Developed for the **NASA Space Apps Challenge 2026** by **Team Lunar Atlas**.

