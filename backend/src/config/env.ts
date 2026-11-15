import { z } from "zod";
const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  APP_URL: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  SCIENCE_ENGINE_URL: z.string().url().default("http://localhost:8000"),
  SCIENCE_TIMEOUT_MS: z.coerce.number().default(60000),
  LOG_LEVEL: z.string().default("info"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
});
export const env = Env.parse(process.env);   // fail fast on bad config; never echo secrets
