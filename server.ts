import {
  getPlatformPath,
  validateRuntimeConfig,
} from "./src/server/config/runtime.js";
var __defProp = Object.defineProperty;
var __name = (target, value) =>
  __defProp(target, "name", { value, configurable: true });
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { postgresDb } from "./src/server/db/postgres.js";
import { authRouter } from "./src/server/modules/auth/auth.routes.js";
import { agentRouter } from "./src/server/modules/agent/agent.routes.js";
import { propertiesRouter } from "./src/server/modules/properties/properties.routes.js";
import { customersRouter } from "./src/server/modules/customers/customers.routes.js";
import { tasksRouter } from "./src/server/modules/tasks/tasks.routes.js";
import { ownersRouter } from "./src/server/modules/owners/owners.routes.js";
import { searchRouter } from "./src/server/modules/search/search.routes.js";
import { healthRouter } from "./src/server/modules/health/health.routes.js";
import { publicRouter } from "./src/server/modules/public/public.routes.js";
import { agencyRouter } from "./src/server/modules/agency/agency.routes.js";
import { documentsRouter } from "./src/server/modules/documents/documents.routes.js";
import { transactionsRouter } from "./src/server/modules/transactions/transactions.routes.js";
import { platformRouter } from "./src/server/modules/platform/platform.routes.js";
import { platformUiRouter } from "./src/server/modules/platform/platform.ui.js";
import { notificationsRouter } from "./src/server/modules/notifications/notifications.routes.js";
import { notificationScheduler } from "./src/server/modules/notifications/notification-scheduler.service.js";
import { errorMiddleware } from "./src/server/middleware/error.middleware.js";
import { requestLoggerMiddleware } from "./src/server/middleware/request-logger.middleware.js";
import { logger } from "./src/server/logging/logger.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function startServer() {
  validateRuntimeConfig();
  const isProd = process.env.NODE_ENV === "production";
  const dbReadyPromise = postgresDb.init();
  const vitePromise = !isProd
    ? createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: "spa",
      })
    : Promise.resolve(null);
  const app = express();
  if (process.env.TRUST_PROXY)
    app.set(
      "trust proxy",
      process.env.TRUST_PROXY.split(",").map((v) => v.trim()),
    );
  let PORT = process.env.DEFAULT_APP_PORT
    ? parseInt(process.env.DEFAULT_APP_PORT, 10)
    : process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : 3e3;
  const portArgIndex = process.argv.indexOf("--port");
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed)) {
      PORT = parsed;
    }
  }
  app.use(
    helmet({
      frameguard: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://cdn.tailwindcss.com",
          ],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://cdn.tailwindcss.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:", "https:"],
          frameAncestors: ["*"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "20mb" }));
  app.use(cookieParser());
  app.use("/api", requestLoggerMiddleware);
  app.use("/api", (req, res, next) => {
    const method = req.method.toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const origin = req.headers.origin;
      if (origin) {
        try {
          const originUrl = new URL(origin);
          const isLoopback = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
            req.socket.remoteAddress || "",
          );
          const forwardedProto = req.headers["x-forwarded-proto"];
          const proto =
            typeof forwardedProto === "string" && forwardedProto.trim()
              ? forwardedProto.split(",")[0].trim()
              : req.protocol;
          const forwardedHost = req.headers["x-forwarded-host"];
          const host =
            isLoopback &&
            typeof forwardedHost === "string" &&
            forwardedHost.trim()
              ? forwardedHost.split(",")[0].trim()
              : req.get("host");
          const expected = `${proto}://${host}`;
          const allowed = [
            ...(process.env.ALLOWED_ORIGINS || "")
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
            ...(process.env.APP_URL ? [process.env.APP_URL.trim()] : []),
          ];
          if (
            originUrl.origin !== expected &&
            !allowed.includes(originUrl.origin)
          ) {
            logger.warn("Cross-origin mutation blocked by CSRF origin check", {
              module: "security",
              operation: "csrf_blocked",
              requestId: req.requestId,
              method: req.method,
              route: req.originalUrl,
              status: 403,
              details: { origin: originUrl.origin, expected },
            });
            return res.status(403).json({
              success: false,
              error: {
                code: "CSRF_DETECTED",
                message: "درخواست نامعتبر بین‌سایتی مسدود گردید.",
              },
            });
          }
        } catch {
          logger.warn("Malformed Origin header blocked by CSRF check", {
            module: "security",
            operation: "csrf_invalid_origin",
            requestId: req.requestId,
            method: req.method,
            route: req.originalUrl,
            status: 403,
          });
          return res.status(403).json({
            success: false,
            error: {
              code: "CSRF_DETECTED",
              message: "مبدأ درخواست نامعتبر است.",
            },
          });
        }
      }
    }
    next();
  });
  const propertyMediaDir = path.resolve(
    process.env.DATA_DIR || path.join(process.cwd(), "data"),
    "uploads",
    "properties",
  );
  if (!fs.existsSync(propertyMediaDir)) {
    fs.mkdirSync(propertyMediaDir, { recursive: true });
  }
  app.use("/uploads/properties", express.static(propertyMediaDir));
  app.use(["/api", getPlatformPath()], async (_req, _res, next) => {
    try {
      await dbReadyPromise;
      next();
    } catch (err) {
      next(err);
    }
  });
  app.use("/api/v1/public", publicRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/agent", agentRouter);
  app.use("/api/v1/agency", agencyRouter);
  app.use("/api/v1/properties", propertiesRouter);
  app.use("/api/v1/customers", customersRouter);
  app.use("/api/v1/owners", ownersRouter);
  app.use("/api/v1/tasks", tasksRouter);
  app.use("/api/v1/search", searchRouter);
  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/documents", documentsRouter);
  app.use("/api/v1/transactions", transactionsRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/platform", platformRouter);
  app.use(getPlatformPath(), platformUiRouter);
  if (getPlatformPath() !== "/platform")
    app.use("/platform", (req, res) => res.sendStatus(404));
  app.use((req, res, next) => {
    if (
      req.path.endsWith(".html") ||
      req.path === "/" ||
      req.path.includes("/assets/")
    ) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
  });
  app.use(express.static(path.resolve(__dirname, "public")));
  app.all("/api/*", (req, res) => {
    return res
      .status(404)
      .json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `\u0645\u0633\u06CC\u0631 \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F: ${req.method} ${req.originalUrl}`,
        },
      });
  });
  app.use("/api", errorMiddleware);
  if (!isProd) {
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite!.middlewares(req, res, next);
      } catch (e) {
        next(e);
      }
    });
    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }
      try {
        const vite = await vitePromise;
        const indexPath = path.resolve(__dirname, "index.html");
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite!.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        try {
          const vite = await vitePromise;
          vite?.ssrFixStacktrace(e as Error);
        } catch {}
        next(e);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, "dist");
    const distIndex = path.resolve(distDir, "index.html");
    const fallbackIndex = path.resolve(__dirname, "index.html");
    app.use(express.static(distDir));
    app.get("*", (req, res, next) => {
      if (
        req.path.startsWith("/api") ||
        req.path.startsWith("/uploads") ||
        req.path.startsWith("/platform") ||
        req.path.startsWith("/assets") ||
        req.path.startsWith("/src")
      ) {
        return next();
      }
      const indexToServe = fs.existsSync(distIndex) ? distIndex : fallbackIndex;
      res.sendFile(indexToServe);
    });
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(
      `Server listening at http://0.0.0.0:${PORT} in ${isProd ? "production" : "development"} mode`,
      {
        module: "server",
        operation: "startup",
        details: { port: PORT, mode: isProd ? "production" : "development" },
      },
    );
  });
  Promise.all([dbReadyPromise, vitePromise])
    .then(() => {
      notificationScheduler.start();
    })
    .catch((err) => {
      logger.error(err?.message || "Critical startup failure", {
        module: "server",
        operation: "startup_failed",
        details: { name: err?.name || "Error", code: err?.code || null },
        stack: err?.stack || null,
        persistToDb: false,
      });
      server.close(() => process.exit(1));
      setTimeout(() => process.exit(1), 2000).unref();
    });
  let stopping = false;
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => {
      if (stopping) return;
      stopping = true;
      logger.info(`Received ${signal}; starting graceful shutdown`, {
        module: "server",
        operation: "shutdown_started",
        details: { signal },
      });
      const deadline = setTimeout(() => {
        logger.error("Graceful shutdown timed out; forcing exit", {
          module: "server",
          operation: "shutdown_timeout",
        });
        process.exit(1);
      }, 25000);
      deadline.unref();
      server.close(async () => {
        try {
          notificationScheduler.stop();
          await logger.flush();
          await postgresDb.pg.close();
          clearTimeout(deadline);
          process.exit(0);
        } catch (err: any) {
          logger.error("Error during graceful shutdown", {
            module: "server",
            operation: "shutdown_failed",
            details: { error: err?.message },
            stack: err?.stack || null,
            persistToDb: false,
          });
          process.exit(1);
        }
      });
    });
}
__name(startServer, "startServer");
process.on("uncaughtException", (err) => {
  logger.error(err?.message || "Uncaught exception", {
    module: "server",
    operation: "uncaught_exception",
    details: { name: err?.name || "Error" },
    stack: err?.stack || null,
  });
});
process.on("unhandledRejection", (reason: any) => {
  logger.error(reason?.message || "Unhandled promise rejection", {
    module: "server",
    operation: "unhandled_rejection",
    details: { reason: typeof reason === "string" ? reason : reason?.name || "Rejection" },
    stack: reason?.stack || null,
  });
});
startServer().catch((err) => {
  logger.error(err?.message || "Critical startup failure", {
    module: "server",
    operation: "startup_failed",
    details: { name: err?.name || "Error", code: err?.code || null },
    stack: err?.stack || null,
    persistToDb: false,
  });
  process.exit(1);
});
