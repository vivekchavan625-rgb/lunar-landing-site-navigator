import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { ScienceError } from "../services/science.js";

declare global { namespace Express { interface Request { id: string } } }

export function requestId(req: Request, res: Response, next: NextFunction) {
  req.id = randomUUID(); res.setHeader("x-request-id", req.id); next();
}

/** Consistent error object; never leaks stack traces or internals. */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ScienceError)
    return res.status(err.status).json({ error: { code: err.code, message: err.message, requestId: req.id } });
  req.log?.error({ err }, "unhandled error");
  res.status(500).json({ error: { code: "INTERNAL", message: "internal server error", requestId: req.id } });
}
