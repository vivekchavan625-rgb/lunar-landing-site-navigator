import pg from "pg";
import { env } from "../config/env.js";
export const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });

/** Run `fn` in a transaction with app.user_id set (transaction-local) so RLS applies. */
export async function withUser<T>(userId: string, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; } finally { c.release(); }
}
