import { Hono } from "hono";
import type { Env } from "../index";

export const healthRoute = new Hono<{ Bindings: Env }>();

healthRoute.get("/health", (c) => {
  return c.json({
    status: "ok",
    layer: "edge",
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});
