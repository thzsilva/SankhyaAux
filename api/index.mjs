// Vercel serverless entrypoint.
//
// Vercel discovers any file under /api as a function. We use `.mjs` (and not
// .ts) on purpose so Vercel does NOT run its own `tsc` over our code — the
// api-server is already pre-compiled into a single bundled .mjs file by the
// build step in vercel.json (`npm run build --workspace @workspace/api-server`).
//
// Express apps are themselves `(req, res, next)` handlers, so we can re-export
// the bundled app directly without any adapter.
//
// vercel.json rewrites /api/* and /backend/* to /api/index so all backend
// requests hit this function and Express handles internal routing under the
// `/api` and `/backend` mounts.
import app from "../artifacts/api-server/dist/app.mjs";

export default app;
