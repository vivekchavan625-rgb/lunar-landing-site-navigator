import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { withUser } from "../database/pool.js";
import { env } from "../config/env.js";

declare global { namespace Express { interface Request { userId: string } } }

/** Guest-session ownership: httpOnly cookie holds an unguessable UUID that is also the users.id. */
export async function guestSession(req: Request, res: Response, next: NextFunction) {
  try {
    let id = req.cookies?.["lsn_guest"] as string | undefined;
    const valid = id && /^[0-9a-f-]{36}$/i.test(id);
    if (!valid) {
      id = randomUUID();
      await withUser(id, (c) => c.query("INSERT INTO users(id, auth_provider) VALUES ($1,'guest')", [id]));
      res.cookie("lsn_guest", id, { httpOnly: true, sameSite: "lax", secure: env.COOKIE_SECURE, maxAge: 1000 * 60 * 60 * 24 * 365 });
    }
    req.userId = id!;
    next();
  } catch (e) { next(e); }
}
