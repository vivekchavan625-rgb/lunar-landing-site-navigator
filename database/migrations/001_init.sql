-- 001_init.sql  Lunar Landing Site Navigator. Requires a superuser/owner role to run.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  display_name VARCHAR(120),
  auth_provider VARCHAR(50) NOT NULL DEFAULT 'guest',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE landing_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,         -- NULL = curated public site
  slug VARCHAR(80) UNIQUE,
  name VARCHAR(200) NOT NULL,
  mission_name VARCHAR(150),
  mission_category VARCHAR(50) NOT NULL
    CHECK (mission_category IN ('APOLLO','CLPS','ARTEMIS_CANDIDATE','CUSTOM','REFERENCE')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  elevation_m DOUBLE PRECISION,
  latitude_type VARCHAR(30) NOT NULL CHECK (latitude_type IN ('PLANETOCENTRIC')),
  coordinate_frame VARCHAR(50) NOT NULL CHECK (coordinate_frame IN ('MOON_ME','MOON_PA')),
  location_status VARCHAR(40) NOT NULL
    CHECK (location_status IN ('CONFIRMED_LANDING_SITE','PLANNED_TARGET_REGION','CANDIDATE_REGION','ILLUSTRATIVE')),
  coordinate_accuracy_m DOUBLE PRECISION,
  description TEXT,
  source_name VARCHAR(150) NOT NULL,
  source_url TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_latitude CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT valid_longitude CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT valid_elevation CHECK (elevation_m IS NULL OR (elevation_m > -20000 AND elevation_m < 20000))
);

CREATE TABLE spice_kernels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kernel_name VARCHAR(255) NOT NULL,
  kernel_type VARCHAR(30) NOT NULL,
  version VARCHAR(100),
  source_url TEXT NOT NULL,
  checksum_sha256 VARCHAR(64),
  coverage_start TIMESTAMPTZ,
  coverage_end TIMESTAMPTZ,
  compatible_ephemeris VARCHAR(100),
  frame_reference VARCHAR(100),
  file_size_bytes BIGINT,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (kernel_name, checksum_sha256)
);

CREATE TABLE terrain_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_name VARCHAR(255) NOT NULL,
  provider VARCHAR(150) NOT NULL,
  instrument VARCHAR(100),
  dataset_version VARCHAR(100),
  resolution_m DOUBLE PRECISION,
  projection VARCHAR(100),
  coordinate_frame VARCHAR(100),
  source_url TEXT NOT NULL,
  checksum_sha256 VARCHAR(64),
  -- Lunar data: NEVER assign an Earth EPSG SRID. Footprint is stored as lat/lon bounds + frame metadata.
  coverage_metadata JSONB NOT NULL DEFAULT '{}',  -- {"latMin":..,"latMax":..,"lonMin":..,"lonMax":..,"crs":"<lunar WKT/proj string>"}
  active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mission_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_name VARCHAR(200) NOT NULL,
  description TEXT,
  site_id UUID REFERENCES landing_sites(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  elevation_m DOUBLE PRECISION,
  selected_time TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  analysis_duration_hours DOUBLE PRECISION NOT NULL CHECK (analysis_duration_hours > 0),
  configuration JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE calculation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES mission_scenarios(id) ON DELETE CASCADE,
  request_hash CHAR(64) NOT NULL,                      -- sha256 of canonical request JSON + engine version (dedupe/cache)
  status VARCHAR(30) NOT NULL CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED')),
  calculation_model VARCHAR(50) NOT NULL,
  geometry_method VARCHAR(100) NOT NULL,
  spice_kernel_ids UUID[] NOT NULL DEFAULT '{}',
  terrain_dataset_id UUID REFERENCES terrain_datasets(id),
  input_parameters JSONB NOT NULL,
  result_summary JSONB,
  provenance JSONB,
  quality_metadata JSONB NOT NULL DEFAULT '{}',
  error_code VARCHAR(50),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE environmental_samples (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  calculation_id UUID NOT NULL REFERENCES calculation_runs(id) ON DELETE CASCADE,
  sample_time TIMESTAMPTZ NOT NULL,
  spice_et_seconds DOUBLE PRECISION NOT NULL,
  solar_azimuth_deg DOUBLE PRECISION,
  solar_elevation_deg DOUBLE PRECISION,
  earth_azimuth_deg DOUBLE PRECISION,
  earth_elevation_deg DOUBLE PRECISION,
  solar_irradiance_w_m2 DOUBLE PRECISION,
  terrain_illumination_fraction DOUBLE PRECISION CHECK (terrain_illumination_fraction BETWEEN 0 AND 1),
  earth_disk_visibility_fraction DOUBLE PRECISION CHECK (earth_disk_visibility_fraction BETWEEN 0 AND 1),
  estimated_panel_power_w DOUBLE PRECISION,
  solar_visible BOOLEAN,
  earth_visible BOOLEAN,
  calculation_quality VARCHAR(40) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  UNIQUE (calculation_id, sample_time)
);

CREATE TABLE comparison_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  site_ids UUID[] NOT NULL CHECK (cardinality(site_ids) BETWEEN 1 AND 3),
  configuration JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE calculation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id UUID NOT NULL REFERENCES calculation_runs(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_time TIMESTAMPTZ NOT NULL,
  event_value DOUBLE PRECISION,
  event_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
