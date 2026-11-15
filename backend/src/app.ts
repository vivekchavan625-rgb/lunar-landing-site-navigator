import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { requestId, errorHandler } from "./middleware/common.js";
import { guestSession } from "./middleware/session.js";
import { system, dataSources } from "./routes/system.js";
import { sites } from "./routes/sites.js";
import { calculations } from "./routes/calculations.js";
import { scenarios } from "./routes/scenarios.js";
import { reports } from "./routes/reports.js";
import { comparisons } from "./routes/comparisons.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestId);
  app.use(pinoHttp({ logger: pino({ level: env.LOG_LEVEL, redact: ["req.headers.cookie", "req.headers.authorization"] }), genReqId: (r: any) => r.id }));
  app.use(helmet({ contentSecurityPolicy: false })); // allow swagger-ui assets
  app.use(cors({ origin: env.APP_URL, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  
  app.use("/api/v1", system);

  const swaggerDocument = YAML.load(path.join(__dirname, "../../../docs/openapi.yaml"));
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  const api = express.Router();
  api.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
  api.use(guestSession);

  api.use("/sites", sites);
  api.use("/calculations", rateLimit({ windowMs: 60_000, limit: 20 }), calculations);
  api.use("/scenarios", scenarios);
  api.use("/data-sources", dataSources);
  api.use("/reports", reports);
  api.use("/comparisons", comparisons);
  
  app.use("/api/v1", api);
  app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "route not found" } }));
  app.use(errorHandler);
  return app;
}
