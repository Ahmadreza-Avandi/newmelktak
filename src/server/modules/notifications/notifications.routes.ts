// @ts-nocheck
import { Router } from "express";
import { z } from "zod";
import { postgresDb } from "../../db/postgres.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { subscriptionEnforcementMiddleware } from "../../middleware/subscription.middleware.js";
import { notificationScheduler } from "./notification-scheduler.service.js";

const notificationsRouter = Router();

notificationsRouter.use(authMiddleware);
notificationsRouter.use(subscriptionEnforcementMiddleware);

const PreferencesPatchSchema = z.object({
  two_hour_reminder: z.boolean().optional(),
  overdue_reminder: z.boolean().optional(),
  visit_reminder: z.boolean().optional(),
  near_due_reminder: z.boolean().optional(),
  sync_alerts: z.boolean().optional(),
});

const PushSubscribeSchema = z.object({
  endpoint: z.string().url("نشانی سرویس پوش نامعتبر است"),
  keys: z.object({
    p256dh: z.string().min(10),
    auth: z.string().min(6),
  }),
});

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const unreadOnly = req.query.unread_only === "true";
    const category = (req.query.category as string) || "ALL";
    const limit = Number(req.query.limit || 80);

    const [feed, preferences] = await Promise.all([
      postgresDb.getNotifications(req.tenant.id, req.user.id, {
        unreadOnly,
        category,
        limit,
      }),
      postgresDb.getOrCreateNotificationPreferences(req.tenant.id, req.user.id),
    ]);

    return res.json({
      success: true,
      data: {
        items: feed.items,
        unread_count: feed.unread_count,
        preferences,
      },
    });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/sync-reminders", async (req, res, next) => {
  try {
    const sweep = await notificationScheduler.runSweep({
      tenantId: req.tenant.id,
      userId: req.user.id,
    });
    const feed = await postgresDb.getNotifications(req.tenant.id, req.user.id, {
      limit: 80,
    });
    return res.json({
      success: true,
      data: {
        created: sweep.created,
        items: feed.items,
        unread_count: feed.unread_count,
      },
    });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.get("/preferences", async (req, res, next) => {
  try {
    const prefs = await postgresDb.getOrCreateNotificationPreferences(
      req.tenant.id,
      req.user.id,
    );
    return res.json({ success: true, data: prefs });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch("/preferences", async (req, res, next) => {
  try {
    const validated = PreferencesPatchSchema.parse(req.body || {});
    const updated = await postgresDb.updateNotificationPreferences(
      req.tenant.id,
      req.user.id,
      validated,
    );
    return res.json({
      success: true,
      data: updated,
      message: "تنظیمات اعلان‌ها ذخیره شد.",
    });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.get("/vapid-public-key", async (_req, res, next) => {
  try {
    const publicKey = await notificationScheduler.getPublicVapidKey();
    return res.json({ success: true, data: { publicKey } });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/push-subscribe", async (req, res, next) => {
  try {
    const validated = PushSubscribeSchema.parse(req.body);
    const saved = await postgresDb.upsertPushSubscription(
      req.tenant.id,
      req.user.id,
      validated,
      req.headers["user-agent"] as string,
    );
    return res.status(201).json({
      success: true,
      data: saved,
      message: "اعلان‌های اندروید/مرورگر با موفقیت فعال شد.",
    });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.delete("/push-subscribe", async (req, res, next) => {
  try {
    const endpoint =
      (req.body?.endpoint as string) || (req.query.endpoint as string) || undefined;
    await postgresDb.deletePushSubscription(req.tenant.id, req.user.id, endpoint);
    return res.json({
      success: true,
      message: "اشتراک پوش نوتیفیکیشن لغو شد.",
    });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/read-all", async (req, res, next) => {
  try {
    const count = await postgresDb.markAllNotificationsRead(
      req.tenant.id,
      req.user.id,
    );
    return res.json({
      success: true,
      data: { updated: count },
      message: "همه اعلان‌ها به عنوان خوانده‌شده علامت‌گذاری شدند.",
    });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch("/:id/read", async (req, res, next) => {
  try {
    const updated = await postgresDb.markNotificationRead(
      req.tenant.id,
      req.user.id,
      req.params.id,
    );
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: "NOTIFICATION_NOT_FOUND", message: "اعلان یافت نشد." },
      });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await postgresDb.deleteNotification(
      req.tenant.id,
      req.user.id,
      req.params.id,
    );
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: "NOTIFICATION_NOT_FOUND", message: "اعلان یافت نشد." },
      });
    }
    return res.json({ success: true, message: "اعلان حذف شد." });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.delete("/", async (req, res, next) => {
  try {
    const count = await postgresDb.clearReadNotifications(
      req.tenant.id,
      req.user.id,
    );
    return res.json({
      success: true,
      data: { deleted: count },
      message: "اعلان‌های خوانده‌شده پاک شدند.",
    });
  } catch (error) {
    next(error);
  }
});

export { notificationsRouter };
