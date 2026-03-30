import type { Context, Next } from "hono";
import type { Env } from "../index";

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

/**
 * Simple in-memory rate limiter per Worker isolate.
 * For production with multiple isolates, consider Cloudflare Rate Limiting rules
 * or a KV/Durable Object-backed solution.
 */
const counters = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(opts: RateLimitOptions) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Allow bypass with a secret token (useful for CI/monitoring)
    const bypassToken = c.env.RATE_LIMIT_BYPASS_TOKEN;
    if (bypassToken && c.req.header("X-RateLimit-Bypass") === bypassToken) {
      return next();
    }

    const key = c.req.header("cf-connecting-ip") ?? "unknown";
    const now = Date.now();
    let entry = counters.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + opts.windowMs };
      counters.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    c.header("X-RateLimit-Limit", String(opts.max));
    c.header("X-RateLimit-Remaining", String(Math.max(0, opts.max - entry.count)));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > opts.max) {
      return c.json({ error: "Too many requests" }, 429);
    }

    // Periodically clean up stale entries (every ~100 requests)
    if (Math.random() < 0.01) {
      for (const [k, v] of counters) {
        if (now > v.resetAt) counters.delete(k);
      }
    }

    return next();
  };
}
