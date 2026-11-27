import { api } from "./apiClient.ts";
import { offlineStore, scopeKeyOf, type OfflineScope } from "./offlineStore.ts";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  evaluateTaskReminderCandidates,
  type NotificationPreferences,
  type ReminderTaskInput,
} from "../shared/notification-rules.ts";

export interface AppNotificationItem {
  id: string;
  category: string;
  dedup_key: string;
  title: string;
  body: string;
  entity_type?: string | null;
  entity_id?: string | null;
  target_url: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  localOnly?: boolean;
}

export interface NotificationCenterState {
  items: AppNotificationItem[];
  unreadCount: number;
  preferences: NotificationPreferences;
  pushSupported: boolean;
  pushPermission: NotificationPermission | "unsupported";
  pushSubscribed: boolean;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

class NotificationEngine {
  private listeners = new Set<(state: NotificationCenterState) => void>();
  private stateByScope = new Map<string, NotificationCenterState>();

  private defaultState(): NotificationCenterState {
    const pushSupported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    const pushPermission =
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "unsupported";
    return {
      items: [],
      unreadCount: 0,
      preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      pushSupported,
      pushPermission,
      pushSubscribed: false,
    };
  }

  subscribe(listener: (state: NotificationCenterState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(scope: OfflineScope) {
    const state = this.getState(scope);
    for (const cb of this.listeners) {
      try {
        cb(state);
      } catch {
        // Ignore listener errors
      }
    }
  }

  getState(scope: OfflineScope | null): NotificationCenterState {
    if (!scope) return this.defaultState();
    const key = scopeKeyOf(scope);
    return this.stateByScope.get(key) || this.defaultState();
  }

  private setState(scope: OfflineScope, next: NotificationCenterState) {
    this.stateByScope.set(scopeKeyOf(scope), next);
    this.emit(scope);
  }

  async loadCachedState(scope: OfflineScope): Promise<NotificationCenterState> {
    const [cachedItems, cachedPrefs] = await Promise.all([
      offlineStore.getScopedValue<AppNotificationItem[]>("kv_cache", scope, "notifications"),
      offlineStore.getScopedValue<NotificationPreferences>("kv_cache", scope, "notif_prefs"),
    ]);
    const current = this.getState(scope);
    const items = Array.isArray(cachedItems) ? cachedItems : current.items;
    const preferences = cachedPrefs || current.preferences;
    const pushSubscribed = await this.checkPushSubscriptionStatus();
    const next: NotificationCenterState = {
      ...current,
      items,
      unreadCount: items.filter((n) => !n.is_read).length,
      preferences,
      pushSubscribed,
    };
    this.setState(scope, next);
    return next;
  }

  async syncFromServer(scope: OfflineScope, runReminderSweep = true): Promise<NotificationCenterState> {
    await this.loadCachedState(scope);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return this.getState(scope);
    }
    try {
      if (runReminderSweep) {
        await api.post("/api/v1/notifications/sync-reminders", {});
      }
      const res = await api.get<{
        items: AppNotificationItem[];
        unread_count: number;
        preferences: NotificationPreferences;
      }>("/api/v1/notifications");
      if (res.success && res.data) {
        const current = this.getState(scope);
        const localOnly = current.items.filter((i) => i.localOnly);
        const serverDedupKeys = new Set(res.data.items.map((i) => i.dedup_key));
        const merged = [
          ...res.data.items,
          ...localOnly.filter((l) => !serverDedupKeys.has(l.dedup_key)),
        ].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        const prefs = res.data.preferences || DEFAULT_NOTIFICATION_PREFERENCES;
        await Promise.all([
          offlineStore.setScopedValue("kv_cache", scope, "notifications", merged),
          offlineStore.setScopedValue("kv_cache", scope, "notif_prefs", prefs),
        ]);
        const pushSubscribed = await this.checkPushSubscriptionStatus();
        const next: NotificationCenterState = {
          ...current,
          items: merged,
          unreadCount: merged.filter((n) => !n.is_read).length,
          preferences: prefs,
          pushSubscribed,
        };
        this.setState(scope, next);
        return next;
      }
    } catch {
      // Fallback to cached state
    }
    return this.getState(scope);
  }

  async evaluateLocalTasks(
    scope: OfflineScope,
    tasks: ReminderTaskInput[],
    now: Date = new Date(),
  ): Promise<AppNotificationItem[]> {
    const state = await this.loadCachedState(scope);
    const candidates = evaluateTaskReminderCandidates(tasks, now, state.preferences);
    if (candidates.length === 0) return [];

    const createdLocal: AppNotificationItem[] = [];
    const existingDedupKeys = new Set(state.items.map((i) => i.dedup_key));

    for (const c of candidates) {
      const alreadyFired = await offlineStore.getScopedValue<number>(
        "fired_notifs",
        scope,
        c.dedup_key,
      );
      if (alreadyFired || existingDedupKeys.has(c.dedup_key)) continue;

      await offlineStore.setScopedValue("fired_notifs", scope, c.dedup_key, Date.now());

      const item: AppNotificationItem = {
        id: `local-${c.dedup_key}`,
        category: c.category,
        dedup_key: c.dedup_key,
        title: c.title,
        body: c.body,
        entity_type: c.entity_type,
        entity_id: c.entity_id,
        target_url: c.target_url,
        is_read: false,
        created_at: new Date().toISOString(),
        localOnly: true,
      };
      createdLocal.push(item);

      // Show native OS / PWA notification if permission granted
      await this.showLocalOsNotification(item);
    }

    if (createdLocal.length > 0) {
      const updatedItems = [...createdLocal, ...state.items].slice(0, 100);
      await offlineStore.setScopedValue("kv_cache", scope, "notifications", updatedItems);
      this.setState(scope, {
        ...state,
        items: updatedItems,
        unreadCount: updatedItems.filter((n) => !n.is_read).length,
      });
    }

    return createdLocal;
  }

  async addSyncAlert(scope: OfflineScope, title: string, body: string, targetUrl = "/?tab=home") {
    const state = await this.loadCachedState(scope);
    if (!state.preferences.sync_alerts) return;

    const item: AppNotificationItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category: "sync_alerts",
      dedup_key: `sync_alert:${Date.now()}`,
      title,
      body,
      target_url: targetUrl,
      is_read: false,
      created_at: new Date().toISOString(),
      localOnly: true,
    };
    const updatedItems = [item, ...state.items].slice(0, 100);
    await offlineStore.setScopedValue("kv_cache", scope, "notifications", updatedItems);
    this.setState(scope, {
      ...state,
      items: updatedItems,
      unreadCount: updatedItems.filter((n) => !n.is_read).length,
    });
    await this.showLocalOsNotification(item);
  }

  private async showLocalOsNotification(item: AppNotificationItem) {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg?.showNotification) {
          await reg.showNotification(item.title, {
            body: item.body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            dir: "rtl",
            lang: "fa",
            tag: item.dedup_key,
            data: {
              target_url: item.target_url,
              notification_id: item.id,
              entity_type: item.entity_type || null,
              entity_id: item.entity_id || null,
            },
          });
          return;
        }
      }
      new Notification(item.title, {
        body: item.body,
        icon: "/icons/icon-192.png",
        tag: item.dedup_key,
      });
    } catch {
      // Ignore notification API errors
    }
  }

  async markRead(scope: OfflineScope, notificationId: string) {
    const current = this.getState(scope);
    const updatedItems = current.items.map((n) =>
      n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n,
    );
    await offlineStore.setScopedValue("kv_cache", scope, "notifications", updatedItems);
    this.setState(scope, {
      ...current,
      items: updatedItems,
      unreadCount: updatedItems.filter((n) => !n.is_read).length,
    });

    if (!notificationId.startsWith("local-") && !notificationId.startsWith("sync-")) {
      await api.patch(`/api/v1/notifications/${notificationId}/read`, {}).catch(() => {});
    }
  }

  async markAllRead(scope: OfflineScope) {
    const current = this.getState(scope);
    const nowIso = new Date().toISOString();
    const updatedItems = current.items.map((n) => ({
      ...n,
      is_read: true,
      read_at: n.read_at || nowIso,
    }));
    await offlineStore.setScopedValue("kv_cache", scope, "notifications", updatedItems);
    this.setState(scope, {
      ...current,
      items: updatedItems,
      unreadCount: 0,
    });
    await api.post("/api/v1/notifications/read-all", {}).catch(() => {});
  }

  async deleteNotification(scope: OfflineScope, notificationId: string) {
    const current = this.getState(scope);
    const updatedItems = current.items.filter((n) => n.id !== notificationId);
    await offlineStore.setScopedValue("kv_cache", scope, "notifications", updatedItems);
    this.setState(scope, {
      ...current,
      items: updatedItems,
      unreadCount: updatedItems.filter((n) => !n.is_read).length,
    });
    if (!notificationId.startsWith("local-") && !notificationId.startsWith("sync-")) {
      await api.delete(`/api/v1/notifications/${notificationId}`).catch(() => {});
    }
  }

  async clearRead(scope: OfflineScope) {
    const current = this.getState(scope);
    const updatedItems = current.items.filter((n) => !n.is_read);
    await offlineStore.setScopedValue("kv_cache", scope, "notifications", updatedItems);
    this.setState(scope, {
      ...current,
      items: updatedItems,
      unreadCount: updatedItems.length,
    });
    await api.delete("/api/v1/notifications").catch(() => {});
  }

  async updatePreferences(
    scope: OfflineScope,
    patch: Partial<NotificationPreferences>,
  ): Promise<{ success: boolean; error?: string }> {
    const current = this.getState(scope);
    const nextPrefs = { ...current.preferences, ...patch };
    await offlineStore.setScopedValue("kv_cache", scope, "notif_prefs", nextPrefs);
    this.setState(scope, { ...current, preferences: nextPrefs });

    const res = await api.patch("/api/v1/notifications/preferences", patch);
    if (res.success && res.data) {
      await offlineStore.setScopedValue("kv_cache", scope, "notif_prefs", res.data);
      this.setState(scope, { ...this.getState(scope), preferences: res.data });
      return { success: true };
    }
    if (res.status === 0) {
      return { success: true };
    }
    return { success: false, error: res.error?.message || "خطا در ذخیره تنظیمات." };
  }

  async checkPushSubscriptionStatus(): Promise<boolean> {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager?.getSubscription();
      return Boolean(sub);
    } catch {
      return false;
    }
  }

  async enablePushNotifications(scope: OfflineScope): Promise<{ success: boolean; message: string }> {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return {
        success: false,
        message: "مرورگر یا دستگاه فعلی از اعلان‌های پس‌زمینه وب‌پوش پشتیبانی نمی‌کند.",
      };
    }

    const permission = await Notification.requestPermission();
    const current = this.getState(scope);
    this.setState(scope, { ...current, pushPermission: permission });

    if (permission !== "granted") {
      return {
        success: false,
        message: "دسترسی نمایش اعلان توسط کاربر یا مرورگر مسدود شده است.",
      };
    }

    try {
      const keyRes = await api.get<{ publicKey: string }>("/api/v1/notifications/vapid-public-key");
      if (!keyRes.success || !keyRes.data?.publicKey) {
        return {
          success: false,
          message: keyRes.error?.message || "کلید وب‌پوش از سرور دریافت نشد.",
        };
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyRes.data.publicKey) as unknown as BufferSource,
        });
      }

      const jsonSub = sub.toJSON();
      if (!jsonSub.endpoint || !jsonSub.keys?.p256dh || !jsonSub.keys?.auth) {
        return { success: false, message: "ساختار اشتراک پوش معتبر نیست." };
      }

      const saveRes = await api.post("/api/v1/notifications/push-subscribe", {
        endpoint: jsonSub.endpoint,
        keys: {
          p256dh: jsonSub.keys.p256dh,
          auth: jsonSub.keys.auth,
        },
      });
      if (!saveRes.success) {
        return {
          success: false,
          message: saveRes.error?.message || "خطا در ثبت اشتراک اعلان در سرور.",
        };
      }

      // Also request periodicSync for background reminder checks when supported
      try {
        await (reg as any).periodicSync?.register?.("melktak-reminder-check", {
          minInterval: 15 * 60 * 1000,
        });
      } catch {
        // Optional browser feature
      }

      this.setState(scope, {
        ...this.getState(scope),
        pushPermission: permission,
        pushSubscribed: true,
      });

      return {
        success: true,
        message: "اعلان‌های پس‌زمینه اندروید با موفقیت فعال شدند.",
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || "امکان فعال‌سازی وب‌پوش در این محیط وجود ندارد.",
      };
    }
  }

  async disablePushNotifications(scope: OfflineScope): Promise<void> {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager?.getSubscription();
        const endpoint = sub?.endpoint;
        if (sub) await sub.unsubscribe();
        await api.delete(
          endpoint
            ? `/api/v1/notifications/push-subscribe?endpoint=${encodeURIComponent(endpoint)}`
            : "/api/v1/notifications/push-subscribe",
        );
      } catch {
        // Ignore cleanup errors
      }
    }
    this.setState(scope, {
      ...this.getState(scope),
      pushSubscribed: false,
    });
  }
}

export const notificationEngine = new NotificationEngine();
