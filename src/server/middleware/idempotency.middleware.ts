// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { postgresDb } from "../db/postgres.js";

const IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9._:-]{8,128}$/;

export function parseExpectedUpdatedAt(req: Request): number | null {
  const raw =
    req.headers["x-expected-updated-at"] ||
    req.body?.expected_updated_at ||
    null;
  if (!raw || typeof raw !== "string") return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isRecordModifiedSince(
  serverUpdatedAt: string | Date | null | undefined,
  expectedUpdatedAtMs: number | null,
): boolean {
  if (!expectedUpdatedAtMs || !serverUpdatedAt) return false;
  const serverMs = new Date(serverUpdatedAt).getTime();
  if (!Number.isFinite(serverMs)) return false;
  return serverMs - expectedUpdatedAtMs > 5;
}

export async function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const method = req.method.toUpperCase();
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    return next();
  }

  const rawKey = req.headers["x-idempotency-key"];
  const key = typeof rawKey === "string" ? rawKey.trim() : "";
  if (!key) {
    return next();
  }

  if (!IDEMPOTENCY_KEY_REGEX.test(key)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_IDEMPOTENCY_KEY",
        message: "کلید یکتای همگام‌سازی نامعتبر است.",
      },
    });
  }

  const tenantId = req.tenant?.id;
  const userId = req.user?.id;
  if (!tenantId || !userId) {
    return next();
  }

  try {
    const existing = await postgresDb.getOfflineSyncReceipt(
      tenantId,
      userId,
      key,
    );
    if (existing) {
      res.setHeader("X-Idempotency-Replayed", "true");
      return res.status(existing.status_code).json(existing.response_json);
    }

    const origJson = res.json.bind(res);
    res.json = ((body: any) => {
      const statusCode = res.statusCode || 200;
      if (statusCode >= 200 && statusCode < 300) {
        void postgresDb
          .saveOfflineSyncReceipt(
            tenantId,
            userId,
            key,
            method,
            req.originalUrl,
            statusCode,
            body,
          )
          .catch(() => {});
      }
      return origJson(body);
    }) as any;

    return next();
  } catch (err) {
    return next(err);
  }
}
