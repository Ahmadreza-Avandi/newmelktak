import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../logging/logger.js";
import { resolveRequestId } from "./request-logger.middleware.js";

function inferModuleFromRoute(routePath: string): string {
  if (routePath.includes("/auth")) return "auth";
  if (routePath.includes("/documents")) return "documents";
  if (routePath.includes("/properties")) return "properties";
  if (routePath.includes("/platform")) return "platform";
  if (routePath.includes("/transactions")) return "transactions";
  if (routePath.includes("/customers")) return "customers";
  if (routePath.includes("/tasks")) return "tasks";
  if (routePath.includes("/agency") || routePath.includes("/agent")) return "agency";
  return "api";
}

export function errorMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) return next(err);
  const requestId = resolveRequestId(req);
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const supplied = Number(err?.status || err?.statusCode);
  const status =
    err instanceof ZodError
      ? 400
      : err?.code?.startsWith?.("LIMIT_")
        ? 400
        : Number.isInteger(supplied) && supplied >= 400 && supplied <= 599
          ? supplied
          : 500;

  const originalPath = req.originalUrl ? req.originalUrl.split("?")[0] : "";
  const routePath = req.baseUrl && req.route?.path
    ? `${req.baseUrl}${req.route.path}`
    : originalPath || `${req.baseUrl || ""}${req.route?.path || req.path || "unmatched"}`;
  const moduleName = inferModuleFromRoute(originalPath || routePath);
  const errorType = err?.constructor?.name || "Error";
  const errorCode =
    err instanceof ZodError
      ? "VALIDATION_ERROR"
      : status >= 500
        ? "INTERNAL_SERVER_ERROR"
        : /^[A-Z][A-Z0-9_]+$/.test(err?.code || "")
          ? err.code
          : "REQUEST_ERROR";

  res.locals.errorLogged = true;

  const logMessage =
    err instanceof ZodError
      ? `Validation error on ${req.method} ${routePath}`
      : err?.message || `Request failed with status ${status}`;

  const logContext = {
    module: moduleName,
    operation: "api_error",
    requestId,
    method: req.method,
    route: routePath,
    status,
    userId: req.user?.id || req.platformAdmin?.id || null,
    tenantId: req.tenant?.id || null,
    details: {
      errorType,
      errorCode,
      ...(err instanceof ZodError
        ? {
            validationFields: err.errors.map((e) => e.path.join(".")),
          }
        : {}),
    },
    stack: status >= 500 || !err?.status ? err?.stack || null : null,
  };

  if (status >= 500) {
    logger.error(logMessage, logContext);
  } else {
    logger.warn(logMessage, logContext);
  }

  const messages: Record<number, string> = {
    400: "داده‌های ورودی یا فایل ارسالی معتبر نیستند.",
    401: "لطفاً دوباره وارد سامانه شوید.",
    403: "دسترسی به این عملیات مجاز نیست.",
    404: "اطلاعات مورد نظر یافت نشد.",
    409: "این اطلاعات با داده‌های موجود تداخل دارد.",
    413: "حجم اطلاعات ارسالی بیش از حد مجاز است.",
    429: "تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید.",
  };
  return res.status(status).json({
    success: false,
    error: {
      code: errorCode,
      message:
        status >= 500
          ? "خطای داخلی سرور؛ لطفاً دوباره تلاش کنید."
          : messages[status] || "انجام درخواست امکان‌پذیر نیست.",
      requestId,
      ...(err instanceof ZodError
        ? {
            issues: err.errors.map((e) => ({
              field: e.path.join("."),
              message: "مقدار واردشده معتبر نیست.",
            })),
          }
        : {}),
    },
  });
}
