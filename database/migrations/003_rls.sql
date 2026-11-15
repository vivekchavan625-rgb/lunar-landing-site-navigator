-- NOTE: rotate the placeholder password immediately: ALTER ROLE app_user PASSWORD '<from env>';
-- Restricted runtime role: NOBYPASSRLS, no table ownership. The API connects ONLY as app_user.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD 'CHANGE_ME_IN_ENV';
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO app_user;

-- helper: current user id from the transaction-local setting (set with SET LOCAL via set_config(...,true))
CREATE OR REPLACE FUNCTION app_current_user() RETURNS UUID LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.user_id', true), '')::UUID $$;

-- read-only public catalogs
GRANT SELECT ON spice_kernels, terrain_datasets TO app_user;

-- users: guests can create themselves, read themselves
ALTER TABLE users ENABLE ROW LEVEL SECURITY; ALTER TABLE users FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON users TO app_user;
CREATE POLICY users_self_select ON users FOR SELECT USING (id = app_current_user());
CREATE POLICY users_guest_insert ON users FOR INSERT WITH CHECK (auth_provider = 'guest');

-- landing sites: curated rows (owner NULL) readable by all, read-only; custom rows owned
ALTER TABLE landing_sites ENABLE ROW LEVEL SECURITY; ALTER TABLE landing_sites FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON landing_sites TO app_user;
CREATE POLICY sites_read ON landing_sites FOR SELECT USING (owner_user_id IS NULL OR owner_user_id = app_current_user());
CREATE POLICY sites_ins ON landing_sites FOR INSERT WITH CHECK (owner_user_id = app_current_user() AND mission_category = 'CUSTOM' AND verified = FALSE);
CREATE POLICY sites_upd ON landing_sites FOR UPDATE USING (owner_user_id = app_current_user()) WITH CHECK (owner_user_id = app_current_user());
CREATE POLICY sites_del ON landing_sites FOR DELETE USING (owner_user_id = app_current_user());

-- owned tables
ALTER TABLE mission_scenarios ENABLE ROW LEVEL SECURITY; ALTER TABLE mission_scenarios FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON mission_scenarios TO app_user;
CREATE POLICY scenario_owner_policy ON mission_scenarios FOR ALL
  USING (user_id = app_current_user()) WITH CHECK (user_id = app_current_user());

ALTER TABLE comparison_groups ENABLE ROW LEVEL SECURITY; ALTER TABLE comparison_groups FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON comparison_groups TO app_user;
CREATE POLICY comparison_owner_policy ON comparison_groups FOR ALL
  USING (user_id = app_current_user()) WITH CHECK (user_id = app_current_user());

ALTER TABLE calculation_runs ENABLE ROW LEVEL SECURITY; ALTER TABLE calculation_runs FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON calculation_runs TO app_user;
CREATE POLICY calc_owner_policy ON calculation_runs FOR ALL
  USING (user_id = app_current_user()) WITH CHECK (user_id = app_current_user());

-- children inherit ownership through calculation_runs
ALTER TABLE environmental_samples ENABLE ROW LEVEL SECURITY; ALTER TABLE environmental_samples FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON environmental_samples TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
CREATE POLICY samples_owner_policy ON environmental_samples FOR ALL
  USING (EXISTS (SELECT 1 FROM calculation_runs c WHERE c.id = calculation_id AND c.user_id = app_current_user()))
  WITH CHECK (EXISTS (SELECT 1 FROM calculation_runs c WHERE c.id = calculation_id AND c.user_id = app_current_user()));

ALTER TABLE calculation_events ENABLE ROW LEVEL SECURITY; ALTER TABLE calculation_events FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON calculation_events TO app_user;
CREATE POLICY events_owner_policy ON calculation_events FOR ALL
  USING (EXISTS (SELECT 1 FROM calculation_runs c WHERE c.id = calculation_id AND c.user_id = app_current_user()))
  WITH CHECK (EXISTS (SELECT 1 FROM calculation_runs c WHERE c.id = calculation_id AND c.user_id = app_current_user()));
