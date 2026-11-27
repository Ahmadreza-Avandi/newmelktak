// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { subscriptionEnforcementMiddleware } from "./subscription.middleware.js";
import { postgresDb } from "../db/postgres.js";
import { logger } from "../logging/logger.js";
import { resolveRequestId } from "./request-logger.middleware.js";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = resolveRequestId(req);
  const routePath = `${req.baseUrl || ""}${req.path || ""}`;
  try {
    // --- Check Support Session (Phase P3) ---
    const supportSessionId = req.headers["x-support-session-id"] as string;
    if (supportSessionId) {
      const session = await postgresDb.getSupportSessionById(supportSessionId);
      if (
        !session ||
        session.status !== "ACTIVE" ||
        new Date(session.expires_at) < new Date()
      ) {
        logger.warn("Support session rejected (invalid or expired)", {
          module: "auth",
          operation: "support_session_denied",
          requestId,
          method: req.method,
          route: routePath,
          status: 403,
        });
        return res.status(403).json({
          success: false,
          error: {
            code: "SUPPORT_SESSION_INVALID",
            message: "نشست پشتیبانی نامعتبر است یا منقضی شده است.",
          },
        });
      }

      // Support sessions are STRICTLY READ-ONLY (GET, HEAD, OPTIONS)
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase())) {
        logger.warn("Write blocked in read-only support session", {
          module: "auth",
          operation: "support_readonly_blocked",
          requestId,
          method: req.method,
          route: routePath,
          status: 403,
          tenantId: session.tenant_id,
        });
        return res.status(403).json({
          success: false,
          error: {
            code: "SUPPORT_READ_ONLY",
            message:
              "دسترسی در حالت پشتیبانی نظارتی صرفاً خواندنی است و امکان ثبت یا ویرایش داده وجود ندارد.",
          },
        });
      }

      const tenant = await postgresDb.getTenantById(session.tenant_id);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: {
            code: "TENANT_NOT_FOUND",
            message: "آژانس مورد نظر یافت نشد.",
          },
        });
      }

      req.tenant = tenant;
      req.supportSession = session;
      req.user = {
        id: "00000000-0000-0000-0000-000000000000",
        username: `support_${session.admin_username || "admin"}`,
        display_name: `ناظر پلتفرم (${session.admin_name || "پشتیبان"})`,
        role_code: "ADMIN",
        branch_id: null,
        is_support: true,
      };

      // Log the read action
      if (typeof postgresDb.logSupportAudit === "function") {
        postgresDb
          .logSupportAudit(
            session.id,
            session.admin_id,
            tenant.id,
            `${req.method} ${req.path}`,
            "API_ACCESS",
            null,
            { query: req.query },
          )
          .catch(() => {});
      }
      return next();
    }

    // --- Normal Tenant Staff Authentication ---
    let bearerToken: string | undefined;
    if (req.headers.authorization?.startsWith("Bearer ")) {
      bearerToken = req.headers.authorization.split(" ")[1];
    }
    let cookieToken = req.cookies?.amlak_session || req.cookies?.amlak_token;

    const token = bearerToken || cookieToken;
    if (!token) {
      logger.warn("Missing authentication credentials", {
        module: "auth",
        operation: "auth_missing_token",
        requestId,
        method: req.method,
        route: routePath,
        status: 401,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "احراز هویت الزامی است. لطفاً وارد سیستم شوید.",
        },
      });
    }

    const session = await postgresDb.getSessionByToken(token);
    if (!session) {
      logger.warn("Session token invalid or expired", {
        module: "auth",
        operation: "auth_session_expired",
        requestId,
        method: req.method,
        route: routePath,
        status: 401,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: "SESSION_EXPIRED",
          message: "نشست کاری شما منقضی شده است. لطفاً دوباره وارد شوید.",
        },
      });
    }

    const user = await postgresDb.getUserById(session.user_id);
    if (!user || !user.is_active) {
      logger.warn("Deactivated or missing user attempted access", {
        module: "auth",
        operation: "auth_user_deactivated",
        requestId,
        method: req.method,
        route: routePath,
        status: 401,
        userId: session.user_id,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: "USER_DEACTIVATED",
          message: "حساب کاربری شما غیرفعال شده است.",
        },
      });
    }

    const tenant = await postgresDb.getTenantById(user.tenant_id);
    if (!tenant || tenant.status !== "ACTIVE") {
      logger.warn("Inactive or suspended tenant access blocked", {
        module: "auth",
        operation: "auth_tenant_inactive",
        requestId,
        method: req.method,
        route: routePath,
        status: 403,
        userId: user.id,
        tenantId: user.tenant_id,
      });
      return res.status(403).json({
        success: false,
        error: {
          code: "TENANT_INACTIVE",
          message: "دسترسی این دفتر املاک موقتاً مسدود شده است.",
        },
      });
    }

    req.user = user;
    req.tenant = tenant;
    return subscriptionEnforcementMiddleware(req, res, next);
  } catch (error) {
    next(error);
  }
}
