import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { rateLimiter } from "./middleware/rate-limit";
import { proxyToOrigin } from "./middleware/proxy";
import { healthRoute } from "./routes/health";

export type Env = {
  ORIGIN_URL: string;
  ENVIRONMENT: string;
  // Secrets (set via `wrangler secret put`)
  RATE_LIMIT_BYPASS_TOKEN?: string;
};

const app = new Hono<{ Bindings: Env }>();

// ─── Global middleware ──────────────────────────────
app.use("*", secureHeaders());

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const env = c.env.ENVIRONMENT;
      // In dev, allow localhost origins
      if (env === "development") return origin;
      // In staging/prod, restrict to your domains
      // Adjust these patterns to match your actual domains
      const allowed = [
        /^https:\/\/.*\.paperclip\.pages\.dev$/,
        /^https:\/\/paperclip\.example\.com$/,
        /^https:\/\/app\.paperclip\.example\.com$/,
      ];
      if (origin && allowed.some((re) => re.test(origin))) return origin;
      return null;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86400,
  }),
);

// ─── Rate limiting (simple in-memory, per-worker isolate) ───
app.use("/api/*", rateLimiter({ windowMs: 60_000, max: 120 }));

// ─── Edge health check (does NOT hit origin) ───────
app.route("/edge", healthRoute);

// ─── Proxy all /api/* requests to origin server ────
app.all("/api/*", proxyToOrigin);

// ─── Catch-all: return 404 for non-frontend paths ──
app.all("*", (c) => {
  return c.json({ error: "Not found. Frontend is served by Cloudflare Pages." }, 404);
});

export default app;
