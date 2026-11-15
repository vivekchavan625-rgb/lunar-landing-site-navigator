#!/usr/bin/env bash
# Verifies RLS isolation as the restricted app_user role. Needs DATABASE_ADMIN_URL (to set a password) and APP_URL_BASE.
set -euo pipefail
ADMIN="${DATABASE_ADMIN_URL:?}"; APP="${DATABASE_APP_URL:?postgresql://app_user:pw@host/db}"
A=$(cat /proc/sys/kernel/random/uuid); B=$(cat /proc/sys/kernel/random/uuid)
# guest creation: the API generates the UUID, sets it as context, then inserts (RETURNING needs the SELECT policy to pass)
for U in $A $B; do psql "$APP" -Atq -v ON_ERROR_STOP=1 -c "BEGIN; SELECT set_config('app.user_id','$U',true); INSERT INTO users(id,auth_provider) VALUES('$U','guest'); COMMIT;" >/dev/null; done
q() { psql "$APP" -Atq -v ON_ERROR_STOP=1 -c "BEGIN; SELECT set_config('app.user_id','$1',true); $2; COMMIT;" | grep -v '^$' | grep -v '^[0-9a-f-]\{36\}$' || true; }
fail() { echo "FAIL: $1"; exit 1; }
psql "$APP" -Atq -c "BEGIN; SELECT set_config('app.user_id','$A',true); INSERT INTO mission_scenarios(user_id,scenario_name,latitude,longitude,selected_time,analysis_duration_hours) VALUES('$A','a-private',0,0,now(),24); COMMIT;" >/dev/null
CNT_B=$(psql "$APP" -Atq -c "BEGIN; SELECT set_config('app.user_id','$B',true); SELECT count(*) FROM mission_scenarios; COMMIT;" | sed -n 2p)
[ "$CNT_B" = "0" ] || fail "user B can see user A scenarios ($CNT_B)"
CNT_A=$(psql "$APP" -Atq -c "BEGIN; SELECT set_config('app.user_id','$A',true); SELECT count(*) FROM mission_scenarios; COMMIT;" | sed -n 2p)
[ "$CNT_A" = "1" ] || fail "user A cannot see own scenario ($CNT_A)"
# B must not insert as A
if psql "$APP" -Atq -v ON_ERROR_STOP=1 -c "BEGIN; SELECT set_config('app.user_id','$B',true); INSERT INTO mission_scenarios(user_id,scenario_name,latitude,longitude,selected_time,analysis_duration_hours) VALUES('$A','x',0,0,now(),1); COMMIT;" >/dev/null 2>&1; then fail "B inserted as A"; fi
# no context => nothing visible
CNT_N=$(psql "$APP" -Atq -c "SELECT count(*) FROM mission_scenarios")
[ "$CNT_N" = "0" ] || fail "rows visible without user context"
# curated sites are readable and read-only
SITES=$(psql "$APP" -Atq -c "SELECT count(*) FROM landing_sites")
[ "$SITES" -ge 1 ] || fail "curated sites not readable"
if psql "$APP" -Atq -v ON_ERROR_STOP=1 -c "BEGIN; SELECT set_config('app.user_id','$A',true); DELETE FROM landing_sites WHERE slug='apollo-11'; COMMIT;" 2>&1 | grep -q DELETE; then :; fi
LEFT=$(psql "$ADMIN" -Atq -c "SELECT count(*) FROM landing_sites WHERE slug='apollo-11'")
[ "$LEFT" = "1" ] || fail "user deleted curated site"
echo "RLS isolation: PASS"
