import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { logger } from "../logging/logger.js";

const SAFE_REQUEST_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

export function resolveRequestId(req: Request): string {
  if (req.requestId) return req.requestId;
  const headerVal = req.headers["x-request-id"];
  if (typeof headerVal === "string" && SAFE_REQUEST_ID_RE.test(headerVal.trim())) {
    return headerVal.trim();
  }
  return crypto.randomUUID();
}

export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = resolveRequestId(req);
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    if (res.locals?.errorLogged) return;

    const elapsedNs = process.hrtime.bigint() - startedAt;
    const durationMs = Number(elapsedNs) / 1_000_000;
    const status = res.statusCode;
    const routePath = `${req.baseUrl || ""}${req.route?.path || req.path || ""}` || "/";
    const isHealth = routePath.startsWith("/api/v1/health") || routePath.startsWith("/health");
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase());

    const context = {
      module: "http",
      operation: status >= 400 ? "http_request_error" : "http_request",
      requestId,
      method: req.method,
      route: routePath,
      status,
      durationMs,
      userId: req.user?.id || req.platformAdmin?.id || null,
      tenantId: req.tenant?.id || null,
      persistToDb:
        !res.locals?.skipDbHttpLog &&
        (status >= 400 || (isMutation && !routePath.includes("/auth/login"))),
    };

    if (status >= 500) {
      logger.error(`HTTP ${req.method} ${routePath} -> ${status}`, context);
    } else if (status >= 400) {
      logger.warn(`HTTP ${req.method} ${routePath} -> ${status}`, context);
    } else if (isHealth) {
      logger.debug(`HTTP ${req.method} ${routePath} -> ${status}`, {
        ...context,
        persistToDb: false,
      });
    } else {
      logger.info(`HTTP ${req.method} ${routePath} -> ${status}`, context);
    }
  });

  next();
}
