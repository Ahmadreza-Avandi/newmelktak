// @ts-nocheck
import * as webpush from "web-push";
import { postgresDb } from "../../db/postgres.js";
import { logger } from "../../logging/logger.js";
import { evaluateTaskReminderCandidates } from "../../../shared/notification-rules.js";

const VAPID_SETTING_KEY = "webpush_vapid_keys_v1";

export type PushDispatcher = (
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
) => Promise<any>;

class NotificationSchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private runningSweep = false;
  private vapidKeysCache: { publicKey: string; privateKey: string; subject: string } | null = null;
  private customDispatcher: PushDispatcher | null = null;

  setPushDispatcherForTests(dispatcher: PushDispatcher | null) {
    this.customDispatcher = dispatcher;
  }

  async getVapidConfig(): Promise<{ publicKey: string; privateKey: string; subject: string }> {
    if (this.vapidKeysCache) return this.vapidKeysCache;

    const subject =
      process.env.VAPID_SUBJECT?.trim() || "mailto:notifications@melktak.local";
    const envPub = process.env.VAPID_PUBLIC_KEY?.trim();
    const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();

    if (envPub && envPriv) {
      webpush.setVapidDetails(subject, envPub, envPriv);
      this.vapidKeysCache = { publicKey: envPub, privateKey: envPriv, subject };
      return this.vapidKeysCache;
    }

    const stored = await postgresDb.getSystemSetting<{
      publicKey: string;
      privateKey: string;
    }>(VAPID_SETTING_KEY);

    if (stored?.publicKey && stored?.privateKey) {
      webpush.setVapidDetails(subject, stored.publicKey, stored.privateKey);
      this.vapidKeysCache = {
        publicKey: stored.publicKey,
        privateKey: stored.privateKey,
        subject,
      };
      return this.vapidKeysCache;
    }

    const generated = webpush.generateVAPIDKeys();
    await postgresDb.setSystemSetting(VAPID_SETTING_KEY, generated);
    webpush.setVapidDetails(subject, generated.publicKey, generated.privateKey);
    this.vapidKeysCache = {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
      subject,
    };
    return this.vapidKeysCache;
  }

  async getPublicVapidKey(): Promise<string> {
    const cfg = await this.getVapidConfig();
    return cfg.publicKey;
  }

  async dispatchPushToUser(
    tenantId: string,
    userId: string,
    notification: {
      id: string;
      title: string;
      body: string;
      category: string;
      dedup_key: string;
      target_url: string;
      entity_type?: string | null;
      entity_id?: string | null;
    },
  ): Promise<number> {
    const subs = await postgresDb.getPushSubscriptionsForUser(tenantId, userId);
    if (!subs.length) return 0;

    if (!this.customDispatcher) {
      await this.getVapidConfig();
    }

    const payload = JSON.stringify({
      notification_id: notification.id,
      title: notification.title,
      body: notification.body,
      category: notification.category,
      tag: notification.dedup_key,
      target_url: notification.target_url,
      entity_type: notification.entity_type || null,
      entity_id: notification.entity_id || null,
    });

    let sentCount = 0;
    for (const sub of subs) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        if (this.customDispatcher) {
          await this.customDispatcher(pushSub, payload);
        } else {
          await webpush.sendNotification(pushSub, payload, { TTL: 3600 });
        }
        sentCount++;
      } catch (err: any) {
        const statusCode = err?.statusCode || err?.status;
        if (statusCode === 404 || statusCode === 410) {
          await postgresDb.deletePushSubscriptionByEndpoint(sub.endpoint).catch(() => {});
        } else {
          logger.warn("Web Push delivery failed for subscription", {
            module: "notifications",
            operation: "push_send_failed",
            tenantId,
            userId,
            details: { statusCode: statusCode || null, reason: err?.message },
          });
        }
      }
    }

    if (sentCount > 0) {
      await postgresDb.markNotificationPushDelivered(notification.id).catch(() => {});
    }
    return sentCount;
  }

  async runSweep(options: { tenantId?: string; userId?: string; now?: Date } = {}) {
    if (this.runningSweep && !options.tenantId) {
      return { created: 0, pushed: 0 };
    }
    if (!options.tenantId) this.runningSweep = true;
    try {
      const now = options.now || new Date();
      const activeTasks = await postgresDb.getActiveTasksForNotificationSweep({
        tenantId: options.tenantId,
        userId: options.userId,
      });

      // Group tasks by (tenant_id, assigned_user_id)
      const grouped = new Map<string, { tenantId: string; userId: string; timeZone: string; tasks: any[] }>();
      for (const task of activeTasks) {
        const key = `${task.tenant_id}:${task.assigned_user_id}`;
        let group = grouped.get(key);
        if (!group) {
          group = {
            tenantId: task.tenant_id,
            userId: task.assigned_user_id,
            timeZone: task.timezone || "Asia/Tehran",
            tasks: [],
          };
          grouped.set(key, group);
        }
        group.tasks.push(task);
      }

      let created = 0;
      let pushed = 0;

      for (const group of grouped.values()) {
        const prefs = await postgresDb.getOrCreateNotificationPreferences(
          group.tenantId,
          group.userId,
        );
        const candidates = evaluateTaskReminderCandidates(
          group.tasks,
          now,
          prefs,
          group.timeZone,
        );
        for (const c of candidates) {
          const inserted = await postgresDb.insertNotificationIfNew({
            tenant_id: group.tenantId,
            user_id: group.userId,
            branch_id: group.tasks.find((t) => t.id === c.entity_id)?.branch_id || null,
            category: c.category,
            dedup_key: c.dedup_key,
            title: c.title,
            body: c.body,
            entity_type: c.entity_type,
            entity_id: c.entity_id,
            target_url: c.target_url,
            metadata: c.metadata,
            scheduled_for: c.scheduled_for,
          });
          if (inserted) {
            created++;
            const delivered = await this.dispatchPushToUser(
              group.tenantId,
              group.userId,
              inserted,
            );
            pushed += delivered;
          }
        }
      }

      return { created, pushed };
    } catch (err: any) {
      logger.warn("Notification reminder sweep failed", {
        module: "notifications",
        operation: "sweep_failed",
        details: { message: err?.message },
      });
      return { created: 0, pushed: 0 };
    } finally {
      if (!options.tenantId) this.runningSweep = false;
    }
  }

  start() {
    if (this.timer) return;
    // Initial sweep shortly after startup, then every 60s
    const initial = setTimeout(() => {
      void this.runSweep();
    }, 5000);
    initial.unref();
    this.timer = setInterval(() => {
      void this.runSweep();
    }, 60_000);
    this.timer.unref();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const notificationScheduler = new NotificationSchedulerService();
