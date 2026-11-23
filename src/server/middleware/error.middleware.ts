import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import crypto from "node:crypto";

export function errorMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) return next(err);
  const requestId = crypto.randomUUID();
  const supplied = Number(err.status || err.statusCode);
  const status =
    err instanceof ZodError
      ? 400
      : err.code?.startsWith?.("LIMIT_")
        ? 400
        : Number.isInteger(supplied) && supplied >= 400 && supplied <= 599
          ? supplied
          : 500;
  // Do not log URLs, bodies, cookies, SQL parameters, or raw database errors.
  console.error(
    JSON.stringify({
      level: status >= 500 ? "error" : "warn",
      event: "request_failed",
      requestId,
      method: req.method,
      route: req.route?.path || "unmatched",
      status,
      errorType: err.constructor?.name || "Error",
      time: new Date().toISOString(),
    }),
  );
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
      code:
        err instanceof ZodError
          ? "VALIDATION_ERROR"
          : status >= 500
            ? "INTERNAL_SERVER_ERROR"
            : /^[A-Z][A-Z0-9_]+$/.test(err.code || "")
              ? err.code
              : "REQUEST_ERROR",
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
