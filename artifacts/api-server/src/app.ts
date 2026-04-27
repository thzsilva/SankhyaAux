import "./lib/env";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createClient } from "@supabase/supabase-js";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY must be set in the API environment.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount under both prefixes:
// - /backend is used by the frontend because Replit's edge proxy reserves /api/* paths
//   for its own infra and never forwards them to the dev server.
// - /api is kept for backwards-compatibility (direct localhost access, generated OpenAPI
//   client, etc).
app.use("/backend", router);
app.use("/api", router);

// Serve frontend static files in production
if (process.env.NODE_ENV === "production") {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "public"),
    path.resolve(here, "..", "..", "sankhya-suporte", "dist", "public"),
  ];
  const staticDir = candidates.find((p) => existsSync(p));
  if (staticDir) {
    logger.info({ staticDir }, "serving frontend static files");
    app.use(express.static(staticDir));
    app.get(/^(?!\/api\/).*/, (_req: Request, res: Response, next: NextFunction) => {
      const indexPath = path.join(staticDir, "index.html");
      if (existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  } else {
    logger.warn({ candidates }, "frontend static directory not found");
  }
}

export default app;
