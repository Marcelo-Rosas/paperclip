import type { Context } from "hono";
import type { Env } from "../index";

/**
 * Proxies requests to the origin Express server.
 * Strips hop-by-hop headers and forwards everything else.
 * Handles both regular HTTP and WebSocket upgrade requests.
 */
export async function proxyToOrigin(c: Context<{ Bindings: Env }>) {
  const originUrl = c.env.ORIGIN_URL;
  if (!originUrl) {
    return c.json({ error: "ORIGIN_URL not configured" }, 502);
  }

  const url = new URL(c.req.url);
  const target = new URL(url.pathname + url.search, originUrl);

  // Build forwarded headers
  const headers = new Headers(c.req.raw.headers);

  // Remove hop-by-hop headers that shouldn't be forwarded
  const hopByHop = [
    "connection",
    "keep-alive",
    "transfer-encoding",
    "te",
    "trailer",
    "upgrade",
    "proxy-authorization",
    "proxy-authenticate",
  ];
  for (const h of hopByHop) {
    headers.delete(h);
  }

  // Add standard proxy headers
  const clientIp = c.req.header("cf-connecting-ip") ?? "unknown";
  headers.set("X-Forwarded-For", clientIp);
  headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Real-IP", clientIp);

  try {
    const init: RequestInit = {
      method: c.req.method,
      headers,
    };

    // Forward body for non-GET/HEAD requests
    if (c.req.method !== "GET" && c.req.method !== "HEAD") {
      init.body = c.req.raw.body;
      // @ts-expect-error - Workers support duplex streaming
      init.duplex = "half";
    }

    const response = await fetch(target.toString(), init);

    // Clone response with cleaned headers
    const responseHeaders = new Headers(response.headers);

    // Add security headers on the way back
    responseHeaders.set("X-Served-By", "paperclip-edge");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("Proxy error:", err);
    return c.json(
      {
        error: "Origin server unavailable",
        detail: c.env.ENVIRONMENT === "development" ? String(err) : undefined,
      },
      502,
    );
  }
}
