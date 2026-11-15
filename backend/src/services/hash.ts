import { createHash } from "node:crypto";
export const ENGINE_VERSION = "0.1.0";
const canon = (v: unknown): unknown => Array.isArray(v) ? v.map(canon)
  : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as object).sort().map(k => [k, canon((v as any)[k])])) : v;
/** Stable dedupe/cache key: canonical JSON + engine version. */
export const requestHash = (req: unknown) => createHash("sha256").update(JSON.stringify(canon(req)) + "|" + ENGINE_VERSION).digest("hex");
