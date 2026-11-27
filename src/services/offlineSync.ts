import { api } from "./apiClient.ts";
import { validateLocalLicenseState } from "./offlineLicense.ts";
import { offlineStore, scopeKeyOf, type OfflineScope } from "./offlineStore.ts";
import { taskSchedule } from "../shared/task-schedule.ts";
import type { ApiResponse } from "../types/index.ts";

export type SyncEntityType = "PROPERTY" | "CUSTOMER" | "TASK" | "INTERACTION" | "REQUIREMENT" | "OTHER";
export type SyncItemStatus = "PENDING" | "SYNCING" | "FAILED" | "CONFLICT";

export interface SyncQueueItem {
  id: string;
  scopeKey: string;
  idempotencyKey: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  entityType: SyncEntityType;
  entityId?: string;
  tempId?: string;
  actionLabel: string;
  body?: any;
  expectedUpdatedAt?: string | null;
  optimisticData?: any;
  status: SyncItemStatus;
  retryCount: number;
  errorMessage?: string | null;
  serverRecord?: any;
  createdAt: number;
  updatedAt: number;
}

export interface SyncHistoryItem {
  id: string;
  actionLabel: string;
  entityType: SyncEntityType;
  status: "SYNCED" | "FAILED" | "CONFLICT";
  message?: string;
  timestamp: number;
}

export interface SyncStatusState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  conflictCount: number;
  syncedRecentCount: number;
  items: SyncQueueItem[];
  history: SyncHistoryItem[];
  lastSyncAt: number | null;
}

export interface OfflineTransport {
  request: <T = any>(
    method: "POST" | "PATCH" | "PUT" | "DELETE",
    path: string,
    body: any,
    headers: Record<string, string>,
  ) => Promise<ApiResponse<T>>;
}

const defaultTransport: OfflineTransport = {
  request(method, path, body, headers) {
    if (method === "POST") return api.post(path, body, headers);
    if (method === "PATCH") return api.patch(path, body, headers);
    if (method === "PUT") return api.put(path, body, headers);
    return api.delete(path, headers);
  },
};

function generateUuid(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function isOnlineEnv(): boolean {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine;
  }
  return true;
}

function replaceTempIdsDeep<T>(value: T, tempMap: Map<string, string>): T {
  if (!value || tempMap.size === 0) return value;
  if (typeof value === "string") {
    let out: string = value;
    for (const [tempId, realId] of tempMap.entries()) {
      if (out === tempId) return realId as unknown as T;
      if (out.includes(tempId)) out = out.split(tempId).join(realId);
    }
    return out as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceTempIdsDeep(item, tempMap)) as unknown as T;
  }
  if (typeof value === "object") {
    const next: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      next[k] = replaceTempIdsDeep(v, tempMap);
    }
    return next as T;
  }
  return value;
}

class OfflineSyncManager {
  private listeners = new Set<(state: SyncStatusState) => void>();
  private inFlightDrains = new Map<string, Promise<{ synced: number; failed: number; conflicts: number }>>();
  private isSyncingScope = new Set<string>();
  private historyByScope = new Map<string, SyncHistoryItem[]>();
  private lastSyncByScope = new Map<string, number>();
  private tempIdMapByScope = new Map<string, Map<string, string>>();
  private transport: OfflineTransport = defaultTransport;
  private onSyncedCallback: ((scope: OfflineScope, count: number) => void) | null = null;

  setTransportForTests(transport: OfflineTransport | null) {
    this.transport = transport || defaultTransport;
  }

  onSynced(cb: ((scope: OfflineScope, count: number) => void) | null) {
    this.onSyncedCallback = cb;
  }

  private getTempMap(scopeKey: string): Map<string, string> {
    let m = this.tempIdMapByScope.get(scopeKey);
    if (!m) {
      m = new Map();
      this.tempIdMapByScope.set(scopeKey, m);
    }
    return m;
  }

  subscribe(listener: (state: SyncStatusState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async emit(scope: OfflineScope) {
    if (this.listeners.size === 0) return;
    const snap = await this.getSyncStatus(scope);
    for (const cb of this.listeners) {
      try {
        cb(snap);
      } catch {
        // Ignore listener errors
      }
    }
  }

  async getQueueItems(scope: OfflineScope): Promise<SyncQueueItem[]> {
    const entries = await offlineStore.listScopedValues<SyncQueueItem>(
      "sync_queue",
      scope,
    );
    return entries
      .map((e) => e.value)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async getSyncStatus(scope: OfflineScope | null): Promise<SyncStatusState> {
    if (!scope) {
      return {
        isOnline: isOnlineEnv(),
        isSyncing: false,
        pendingCount: 0,
        syncingCount: 0,
        failedCount: 0,
        conflictCount: 0,
        syncedRecentCount: 0,
        items: [],
        history: [],
        lastSyncAt: null,
      };
    }
    const key = scopeKeyOf(scope);
    const items = await this.getQueueItems(scope);
    const history = this.historyByScope.get(key) || [];
    return {
      isOnline: isOnlineEnv(),
      isSyncing: this.isSyncingScope.has(key),
      pendingCount: items.filter((i) => i.status === "PENDING").length,
      syncingCount: items.filter((i) => i.status === "SYNCING").length,
      failedCount: items.filter((i) => i.status === "FAILED").length,
      conflictCount: items.filter((i) => i.status === "CONFLICT").length,
      syncedRecentCount: history.filter((h) => h.status === "SYNCED").length,
      items,
      history: history.slice(0, 20),
      lastSyncAt: this.lastSyncByScope.get(key) || null,
    };
  }

  private pushHistory(scopeKey: string, entry: SyncHistoryItem) {
    const list = this.historyByScope.get(scopeKey) || [];
    list.unshift(entry);
    this.historyByScope.set(scopeKey, list.slice(0, 25));
  }

  async saveSnapshot(
    scope: OfflineScope,
    domain: "homeData" | "properties" | "customers" | "tasks" | "branches",
    data: any,
    branchId = "ALL",
  ): Promise<void> {
    const subKey = domain === "branches" ? "branches" : `${domain}:${branchId || "ALL"}`;
    await offlineStore.setScopedValue("kv_cache", scope, subKey, {
      data,
      savedAt: Date.now(),
    });
  }

  async loadSnapshot<T = any>(
    scope: OfflineScope,
    domain: "homeData" | "properties" | "customers" | "tasks" | "branches",
    branchId = "ALL",
  ): Promise<T | null> {
    const subKey = domain === "branches" ? "branches" : `${domain}:${branchId || "ALL"}`;
    let cached = await offlineStore.getScopedValue<{ data: T; savedAt: number }>(
      "kv_cache",
      scope,
      subKey,
    );
    if (!cached && branchId !== "ALL" && domain !== "branches") {
      cached = await offlineStore.getScopedValue<{ data: T; savedAt: number }>(
        "kv_cache",
        scope,
        `${domain}:ALL`,
      );
    }
    if (!cached) return null;

    if (domain === "properties" || domain === "customers" || domain === "tasks") {
      const queue = await this.getQueueItems(scope);
      return this.applyQueueOverlay(
        domain,
        Array.isArray(cached.data) ? cached.data : [],
        queue,
      ) as unknown as T;
    }

    if (domain === "homeData" && cached.data && typeof cached.data === "object") {
      const queue = await this.getQueueItems(scope);
      return this.applyHomeOverlay(cached.data, queue) as T;
    }

    return cached.data;
  }

  async applyDomainOverlay(
    scope: OfflineScope,
    domain: "properties" | "customers" | "tasks",
    baseItems: any[],
  ): Promise<any[]> {
    const queue = await this.getQueueItems(scope);
    if (queue.length === 0) return baseItems;
    return this.applyQueueOverlay(domain, baseItems, queue);
  }

  private applyHomeOverlay(homeData: any, queue: SyncQueueItem[]): any {
    const clone = structuredClone(homeData);
    const taskQueue = queue.filter((q) => q.entityType === "TASK");
    if (taskQueue.length === 0) return clone;

    const rawToday = Array.isArray(clone.todayTasks)
      ? clone.todayTasks
      : Array.isArray(clone.today_tasks)
      ? clone.today_tasks
      : [];
    const rawOverdue = Array.isArray(clone.overdueTasks)
      ? clone.overdueTasks
      : Array.isArray(clone.overdue_tasks)
      ? clone.overdue_tasks
      : [];
    const rawVisits = Array.isArray(clone.upcomingVisits) ? clone.upcomingVisits : [];

    const byId = new Map<string, any>();
    for (const item of [...rawToday, ...rawOverdue, ...rawVisits]) {
      if (item?.id) byId.set(String(item.id), item);
    }

    const mergedTasks = this.applyQueueOverlay("tasks", Array.from(byId.values()), queue);
    const scheduled = taskSchedule(mergedTasks, new Date(), "Asia/Tehran");
    const mappedVisits = scheduled.upcomingVisits.map((t: any) => ({
      ...t,
      scheduled_at: t.due_at,
      notes: t.description,
    }));

    clone.overdueTasks = scheduled.overdueTasks;
    clone.todayTasks = scheduled.todayTasks;
    clone.upcomingVisits = mappedVisits;
    if (clone.metrics) {
      clone.metrics.today_count = scheduled.todayTasks.length;
      clone.metrics.overdue_count = scheduled.overdueTasks.length;
      clone.metrics.upcoming_visits_count = mappedVisits.length;
    }
    if (clone.summary) {
      clone.summary.todayTasks = scheduled.todayTasks.length;
      clone.summary.overdueTasks = scheduled.overdueTasks.length;
      clone.summary.upcomingVisits = mappedVisits.length;
    }
    return clone;
  }

  private applyQueueOverlay(
    domain: "properties" | "customers" | "tasks",
    baseItems: any[],
    queue: SyncQueueItem[],
  ): any[] {
    const targetType: SyncEntityType =
      domain === "properties" ? "PROPERTY" : domain === "customers" ? "CUSTOMER" : "TASK";
    const items = baseItems.map((item) => ({ ...item }));

    for (const q of queue) {
      if (q.entityType !== targetType) continue;

      if (q.method === "POST" && q.optimisticData) {
        const idx = items.findIndex((i) => i.id === q.optimisticData.id);
        if (idx === -1) {
          items.unshift({ ...q.optimisticData, _offlinePending: true });
        }
      } else if (q.method === "PATCH" && q.entityId) {
        const idx = items.findIndex((i) => i.id === q.entityId);
        if (idx !== -1) {
          if (q.path.endsWith("/complete")) {
            items[idx] = {
              ...items[idx],
              status: "COMPLETED",
              visit_result: q.body?.visit_result || items[idx].visit_result,
              _offlinePending: true,
            };
          } else if (q.path.endsWith("/cancel")) {
            items[idx] = {
              ...items[idx],
              status: "CANCELLED",
              _offlinePending: true,
            };
          } else if (q.path.endsWith("/status")) {
            items[idx] = {
              ...items[idx],
              status: q.body?.status || items[idx].status,
              is_archived: q.body?.status === "ARCHIVED",
              _offlinePending: true,
            };
          } else {
            const patchObj = { ...(q.body || {}) };
            if (patchObj.district !== undefined || patchObj.neighborhood !== undefined) {
              patchObj.address = {
                ...(items[idx].address || {}),
                district: patchObj.district ?? items[idx].address?.district,
                neighborhood: patchObj.neighborhood ?? items[idx].address?.neighborhood,
              };
            }
            if (
              domain === "customers" &&
              (patchObj.first_name !== undefined || patchObj.last_name !== undefined)
            ) {
              patchObj.display_name = `${patchObj.first_name ?? items[idx].first_name} ${
                patchObj.last_name ?? items[idx].last_name
              }`.trim();
            }
            items[idx] = { ...items[idx], ...patchObj, _offlinePending: true };
          }
        }
      } else if (q.method === "POST" && q.path.endsWith("/archive") && q.entityId) {
        const idx = items.findIndex((i) => i.id === q.entityId);
        if (idx !== -1) {
          items[idx] = {
            ...items[idx],
            is_archived: true,
            status: domain === "properties" ? "ARCHIVED" : items[idx].status,
            _offlinePending: true,
          };
        }
      } else if (q.method === "DELETE" && q.entityId) {
        const idx = items.findIndex((i) => i.id === q.entityId);
        if (idx !== -1) {
          items.splice(idx, 1);
        }
      }
    }

    return items;
  }

  async mutate<T = any>(
    scope: OfflineScope,
    opts: {
      method: "POST" | "PATCH" | "PUT" | "DELETE";
      path: string;
      body?: any;
      entityType: SyncEntityType;
      entityId?: string;
      expectedUpdatedAt?: string | null;
      actionLabel: string;
      optimisticBuilder?: (tempId: string) => any;
      forceOffline?: boolean;
    },
  ): Promise<ApiResponse<T> & { queuedOffline?: boolean; conflict?: boolean; serverRecord?: any }> {
    const idempotencyKey = `sync_${generateUuid()}`;
    const headers: Record<string, string> = {
      "X-Idempotency-Key": idempotencyKey,
    };
    if (opts.expectedUpdatedAt) {
      headers["X-Expected-Updated-At"] = opts.expectedUpdatedAt;
    }

    const canAttemptOnline = !opts.forceOffline && isOnlineEnv();

    if (canAttemptOnline) {
      const response = await this.transport.request<T>(
        opts.method,
        opts.path,
        opts.body,
        headers,
      );
      if (response.success) {
        return response;
      }
      if (response.status === 409) {
        return {
          ...response,
          conflict: true,
          serverRecord: (response.data as any)?.server_record,
        };
      }
      if (response.status !== 0 && response.error?.code !== "NETWORK_ERROR") {
        // Real validation / auth / permission / subscription error from server: do not queue
        return response;
      }
    }

    // Offline or network failed: verify tamper-resistant local subscription license first
    const licenseCheck = await validateLocalLicenseState(scope);
    if (!licenseCheck.valid) {
      return {
        success: false,
        status: 403,
        error: {
          code: licenseCheck.reason || "SUBSCRIPTION_EXPIRED",
          message:
            licenseCheck.message ||
            "اعتبار اشتراک برای انجام عملیات آفلاین معتبر نیست.",
        },
      };
    }

    const queueId = generateUuid();
    const tempId = opts.method === "POST" && opts.optimisticBuilder ? `offline-${queueId}` : undefined;
    const optimisticData = tempId && opts.optimisticBuilder ? opts.optimisticBuilder(tempId) : undefined;
    const now = Date.now();

    const queueItem: SyncQueueItem = {
      id: queueId,
      scopeKey: scopeKeyOf(scope),
      idempotencyKey,
      method: opts.method,
      path: opts.path,
      entityType: opts.entityType,
      entityId: opts.entityId,
      tempId,
      actionLabel: opts.actionLabel,
      body: opts.body,
      expectedUpdatedAt: opts.expectedUpdatedAt || null,
      optimisticData,
      status: "PENDING",
      retryCount: 0,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    await offlineStore.setScopedValue("sync_queue", scope, queueId, queueItem);
    await this.emit(scope);

    // Ask Service Worker for Background Sync if supported
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg: any) => reg.sync?.register?.("melktak-sync-queue"))
        .catch(() => {});
    }

    return {
      success: true,
      status: 202,
      queuedOffline: true,
      data: (optimisticData || { id: opts.entityId, ...(opts.body || {}) }) as T,
      message: "در صف همگام‌سازی آفلاین ذخیره شد و پس از اتصال اینترنت ارسال می‌شود.",
    };
  }

  async drainQueue(
    scope: OfflineScope,
    options: { ignoreOnlineCheck?: boolean } = {},
  ): Promise<{ synced: number; failed: number; conflicts: number }> {
    const key = scopeKeyOf(scope);
    const existingDrain = this.inFlightDrains.get(key);
    if (existingDrain) return existingDrain;

    const task = this.executeDrain(scope, options).finally(() => {
      this.inFlightDrains.delete(key);
      this.isSyncingScope.delete(key);
      void this.emit(scope);
    });
    this.inFlightDrains.set(key, task);
    return task;
  }

  private async executeDrain(
    scope: OfflineScope,
    options: { ignoreOnlineCheck?: boolean },
  ): Promise<{ synced: number; failed: number; conflicts: number }> {
    if (!options.ignoreOnlineCheck && !isOnlineEnv()) {
      return { synced: 0, failed: 0, conflicts: 0 };
    }

    const key = scopeKeyOf(scope);
    this.isSyncingScope.add(key);
    await this.emit(scope);

    const tempMap = this.getTempMap(key);
    const items = await this.getQueueItems(scope);
    const pendingItems = items.filter((item) => item.status === "PENDING");

    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    for (const item of pendingItems) {
      if (!options.ignoreOnlineCheck && !isOnlineEnv()) break;

      const resolvedPath = replaceTempIdsDeep(item.path, tempMap);
      const resolvedBody = replaceTempIdsDeep(item.body, tempMap);

      const syncingItem: SyncQueueItem = {
        ...item,
        status: "SYNCING",
        updatedAt: Date.now(),
      };
      await offlineStore.setScopedValue("sync_queue", scope, item.id, syncingItem);
      await this.emit(scope);

      const headers: Record<string, string> = {
        "X-Idempotency-Key": item.idempotencyKey,
      };
      if (item.expectedUpdatedAt) {
        headers["X-Expected-Updated-At"] = item.expectedUpdatedAt;
      }

      const res = await this.transport.request(
        item.method,
        resolvedPath,
        resolvedBody,
        headers,
      );

      if (res.success) {
        if (item.tempId && (res.data as any)?.id) {
          tempMap.set(item.tempId, String((res.data as any).id));
        }
        await offlineStore.deleteScopedValue("sync_queue", scope, item.id);
        this.pushHistory(key, {
          id: item.id,
          actionLabel: item.actionLabel,
          entityType: item.entityType,
          status: "SYNCED",
          message: "با موفقیت با سرور همگام شد.",
          timestamp: Date.now(),
        });
        synced++;
      } else if (res.status === 409) {
        conflicts++;
        const conflictItem: SyncQueueItem = {
          ...item,
          status: "CONFLICT",
          errorMessage:
            res.error?.message ||
            "این رکورد روی سرور تغییر یافته و نیازمند بررسی تعارض است.",
          serverRecord: (res.data as any)?.server_record || null,
          updatedAt: Date.now(),
        };
        await offlineStore.setScopedValue("sync_queue", scope, item.id, conflictItem);
        this.pushHistory(key, {
          id: item.id,
          actionLabel: item.actionLabel,
          entityType: item.entityType,
          status: "CONFLICT",
          message: conflictItem.errorMessage || undefined,
          timestamp: Date.now(),
        });
      } else if (res.status === 0 || (typeof res.status === "number" && res.status >= 500)) {
        // Network or transient server outage: keep PENDING for next retry
        const retryItem: SyncQueueItem = {
          ...item,
          status: "PENDING",
          retryCount: item.retryCount + 1,
          errorMessage: res.error?.message || "خطای موقت در ارتباط با سرور",
          updatedAt: Date.now(),
        };
        await offlineStore.setScopedValue("sync_queue", scope, item.id, retryItem);
        break;
      } else {
        failed++;
        const failedItem: SyncQueueItem = {
          ...item,
          status: "FAILED",
          retryCount: item.retryCount + 1,
          errorMessage: res.error?.message || "ارسال تغییر با خطا مواجه شد.",
          updatedAt: Date.now(),
        };
        await offlineStore.setScopedValue("sync_queue", scope, item.id, failedItem);
        this.pushHistory(key, {
          id: item.id,
          actionLabel: item.actionLabel,
          entityType: item.entityType,
          status: "FAILED",
          message: failedItem.errorMessage || undefined,
          timestamp: Date.now(),
        });
      }
    }

    if (synced > 0) {
      this.lastSyncByScope.set(key, Date.now());
      this.onSyncedCallback?.(scope, synced);
    }

    return { synced, failed, conflicts };
  }

  async retryItem(scope: OfflineScope, itemId: string, forceOverwrite = false) {
    const item = await offlineStore.getScopedValue<SyncQueueItem>(
      "sync_queue",
      scope,
      itemId,
    );
    if (!item) return;
    const updated: SyncQueueItem = {
      ...item,
      status: "PENDING",
      errorMessage: null,
      expectedUpdatedAt: forceOverwrite ? null : item.expectedUpdatedAt,
      updatedAt: Date.now(),
    };
    await offlineStore.setScopedValue("sync_queue", scope, itemId, updated);
    await this.emit(scope);
    return this.drainQueue(scope);
  }

  async discardItem(scope: OfflineScope, itemId: string) {
    await offlineStore.deleteScopedValue("sync_queue", scope, itemId);
    await this.emit(scope);
  }
}

export const offlineSync = new OfflineSyncManager();
