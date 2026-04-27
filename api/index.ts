// Vercel serverless entrypoint.
// Vercel discovers any file under /api as a function, bundles it (with esbuild
// internally) and invokes the default export as a (req, res) handler. Express
// apps are themselves (req, res, next) handlers, so we can just re-export the
// existing Express app — no adapter needed.
//
// The vercel.json rewrites /api/* and /backend/* to /api/index so that all
// requests hit this single function and Express handles internal routing.
import app from "../artifacts/api-server/src/app";

export default app;
