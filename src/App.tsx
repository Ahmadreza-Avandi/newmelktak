import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ShieldAlert, RefreshCw, LogIn } from "lucide-react";
import { api } from "./services/apiClient.ts";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { offlineSync, type SyncStatusState } from "./services/offlineSync.ts";
import { tickClockWatermark } from "./services/offlineLicense.ts";
import {
  notificationEngine,
  type AppNotificationItem,
  type NotificationCenterState,
} from "./services/notificationEngine.ts";
import { OfflineBanner } from "./components/common/OfflineBanner.tsx";
import { TopHeader } from "./components/layout/TopHeader.tsx";
import { BottomNav } from "./components/layout/BottomNav.tsx";
import { MelktakSidebar } from "./components/layout/Sidebar.tsx";
import { QuickAddActionSheet } from "./components/modals/QuickAddActionSheet.tsx";
import { CreatePropertyModal } from "./components/modals/CreatePropertyModal.tsx";
import { CreateCustomerModal } from "./components/modals/CreateCustomerModal.tsx";
import { CreateTaskModal } from "./components/modals/CreateTaskModal.tsx";
import { EditTaskModal } from "./components/modals/EditTaskModal.tsx";
import { CreateTransactionModal } from "./components/modals/CreateTransactionModal.tsx";
import { GlobalSearchModal } from "./components/modals/GlobalSearchModal.tsx";
import { NotificationCenterModal } from "./components/modals/NotificationCenterModal.tsx";
import { SyncStatusModal } from "./components/modals/SyncStatusModal.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { SharedPropertyPublicView } from "./pages/SharedPropertyPublicView.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { PropertiesPage } from "./pages/PropertiesPage.tsx";
import { CustomersPage } from "./pages/CustomersPage.tsx";
import { TasksPage } from "./pages/TasksPage.tsx";
import { MorePage } from "./pages/MorePage.tsx";
import { DbAdminPage } from "./pages/DbAdminPage.tsx";

export function isDbAdminPath(): boolean {
  const pathname = window.location.pathname;
  const hash = window.location.hash;
  return (
    pathname === "/db-admin" ||
    pathname.startsWith("/db-admin/") ||
    hash.startsWith("#/db-admin")
  );
}

export function getSharedPropertyToken(): string | null {
  const hash = window.location.hash;
  if (hash.startsWith("#/p/")) {
    return hash.replace("#/p/", "").split("?")[0];
  }
  const pathname = window.location.pathname;
  return pathname.startsWith("/shared/property/")
    ? pathname.replace("/shared/property/", "").split("/")[0]
    : null;
}

export const AppShell: React.FC = () => {
  const [managementModule, setManagementModule] = useState("hub");
  const {
    user,
    tenant,
    isAuthenticated,
    isLoading,
    isOfflineMode,
    offlineBlockReason,
    offlineBlockMessage,
    clearOfflineBlock,
    refreshAuth,
  } = useAuth();

  const scope = useMemo(
    () => (tenant?.id && user?.id ? { tenantId: tenant.id, userId: user.id } : null),
    [tenant?.id, user?.id],
  );

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && ["home", "properties", "customers", "tasks", "more"].includes(tab)) {
      return tab;
    }
    return "home";
  });
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get("taskId");
  });
  const [shareToken, setShareToken] = useState<string | null>(
    getSharedPropertyToken
  );
  const [dbAdminMode, setDbAdminMode] = useState<boolean>(isDbAdminPath);

  const navigateTab = useCallback((tab: string) => {
    setManagementModule("hub");
    setActiveTab(tab);
  }, []);

  const openManagementModule = (module: string) => {
    setManagementModule(module);
    setActiveTab("more");
  };

  useEffect(() => {
    const handleLocationChange = () => {
      setShareToken(getSharedPropertyToken());
      setDbAdminMode(isDbAdminPath());
    };
    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const [homeData, setHomeData] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [activeBranchId, setActiveBranchId] = useState("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [createPropOpen, setCreatePropOpen] = useState(false);
  const [createCustOpen, setCreateCustOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [createTransactionOpen, setCreateTransactionOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusState | null>(null);
  const [notifState, setNotifState] = useState<NotificationCenterState>(() =>
    notificationEngine.getState(null),
  );

  const tasksRef = useRef<any[]>([]);
  tasksRef.current = tasks;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const applyTargetUrl = useCallback(
    (targetUrl: string) => {
      try {
        const parsed = new URL(targetUrl, window.location.origin);
        const tab = parsed.searchParams.get("tab") || "tasks";
        const taskId = parsed.searchParams.get("taskId");
        const customerId = parsed.searchParams.get("customerId");
        if (["home", "properties", "customers", "tasks", "more"].includes(tab)) {
          navigateTab(tab);
        }
        if (taskId) {
          setHighlightedTaskId(taskId);
        } else if (customerId) {
          navigateTab("customers");
        }
      } catch {
        navigateTab("tasks");
      }
    },
    [navigateTab],
  );

  const loadFromOfflineCache = useCallback(async () => {
    if (!scope) return;
    const [cachedHome, cachedProps, cachedCusts, cachedTasks, cachedBranches] =
      await Promise.all([
        offlineSync.loadSnapshot<any>(scope, "homeData", activeBranchId),
        offlineSync.loadSnapshot<any[]>(scope, "properties", activeBranchId),
        offlineSync.loadSnapshot<any[]>(scope, "customers", activeBranchId),
        offlineSync.loadSnapshot<any[]>(scope, "tasks", activeBranchId),
        offlineSync.loadSnapshot<any[]>(scope, "branches", "ALL"),
      ]);
    if (cachedHome) setHomeData(cachedHome);
    if (cachedProps) setProperties(cachedProps);
    if (cachedCusts) setCustomers(cachedCusts);
    if (cachedTasks) {
      setTasks(cachedTasks);
      void notificationEngine.evaluateLocalTasks(scope, cachedTasks);
    }
    if (cachedBranches) setBranches(cachedBranches);
    await notificationEngine.loadCachedState(scope);
    setSyncStatus(await offlineSync.getSyncStatus(scope));
  }, [scope, activeBranchId]);

  const refreshData = useCallback(async () => {
    if (!isAuthenticated || !scope) return;
    setIsRefreshing(true);
    try {
      const online = typeof navigator === "undefined" || navigator.onLine;
      if (!online) {
        await loadFromOfflineCache();
        return;
      }

      const branchQuery =
        activeBranchId === "ALL" ? "" : `?branch_id=${activeBranchId}`;
      const [homeRes, propsRes, custsRes, tasksRes, branchesRes] =
        await Promise.all([
          api.get(`/api/v1/agent/home${branchQuery}`),
          api.get(`/api/v1/properties${branchQuery}`),
          api.get(`/api/v1/customers${branchQuery}`),
          api.get(`/api/v1/tasks${branchQuery}`),
          api.get("/api/v1/agency/branches"),
        ]);

      let anyNetworkFail = false;
      if (homeRes.success && homeRes.data) {
        await offlineSync.saveSnapshot(scope, "homeData", homeRes.data, activeBranchId);
        const overlaidHome = await offlineSync.loadSnapshot(scope, "homeData", activeBranchId);
        setHomeData(overlaidHome || homeRes.data);
      } else if (homeRes.status === 0) {
        anyNetworkFail = true;
      }

      if (propsRes.success && propsRes.data) {
        await offlineSync.saveSnapshot(scope, "properties", propsRes.data, activeBranchId);
        const overlaidProps = await offlineSync.applyDomainOverlay(
          scope,
          "properties",
          propsRes.data,
        );
        setProperties(overlaidProps);
      } else if (propsRes.status === 0) {
        anyNetworkFail = true;
      }

      if (custsRes.success && custsRes.data) {
        await offlineSync.saveSnapshot(scope, "customers", custsRes.data, activeBranchId);
        const overlaidCusts = await offlineSync.applyDomainOverlay(
          scope,
          "customers",
          custsRes.data,
        );
        setCustomers(overlaidCusts);
      } else if (custsRes.status === 0) {
        anyNetworkFail = true;
      }

      if (tasksRes.success && tasksRes.data) {
        await offlineSync.saveSnapshot(scope, "tasks", tasksRes.data, activeBranchId);
        const overlaidTasks = await offlineSync.applyDomainOverlay(
          scope,
          "tasks",
          tasksRes.data,
        );
        setTasks(overlaidTasks);
        void notificationEngine.evaluateLocalTasks(scope, overlaidTasks);
      } else if (tasksRes.status === 0) {
        anyNetworkFail = true;
      }

      if (branchesRes.success && branchesRes.data) {
        await offlineSync.saveSnapshot(scope, "branches", branchesRes.data, "ALL");
        setBranches(branchesRes.data);
      }

      if (anyNetworkFail) {
        await loadFromOfflineCache();
      } else {
        await notificationEngine.syncFromServer(scope, true);
      }
    } catch (err) {
      console.error("Data fetch error:", err);
      await loadFromOfflineCache();
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, scope, activeBranchId, loadFromOfflineCache]);

  useEffect(() => {
    if (!isAuthenticated || !scope) return;
    void offlineSync.getSyncStatus(scope).then(setSyncStatus);
    setNotifState(notificationEngine.getState(scope));
    const unsubSync = offlineSync.subscribe(setSyncStatus);
    const unsubNotif = notificationEngine.subscribe(setNotifState);
    void loadFromOfflineCache();
    void refreshData();
    return () => {
      unsubSync();
      unsubNotif();
    };
  }, [isAuthenticated, scope, refreshData, loadFromOfflineCache]);

  const handleDrainSync = useCallback(async () => {
    if (!scope) return;
    const res = await offlineSync.drainQueue(scope);
    if (res.synced > 0) {
      showToast(`${res.synced} تغییر آفلاین با موفقیت همگام‌سازی شد.`);
      await notificationEngine.addSyncAlert(
        scope,
        "همگام‌سازی تغییرات آفلاین",
        `${res.synced} تغییر ثبت‌شده در حالت آفلاین با موفقیت به سرور منتقل شد.`,
      );
      await refreshData();
    }
    if (res.conflicts > 0 || res.failed > 0) {
      showToast(
        `${res.conflicts + res.failed} مورد در همگام‌سازی نیازمند بررسی دارد.`,
      );
    }
  }, [scope, refreshData, showToast]);

  useEffect(() => {
    if (!isAuthenticated || !scope) return;

    const onOnline = async () => {
      await refreshAuth();
      await handleDrainSync();
    };
    window.addEventListener("online", onOnline);

    const interval = window.setInterval(() => {
      void tickClockWatermark(scope);
      void notificationEngine.evaluateLocalTasks(scope, tasksRef.current);
    }, 30000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(interval);
    };
  }, [isAuthenticated, scope, handleDrainSync, refreshAuth]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "MELKTAK_NAVIGATE" && msg.targetUrl) {
        applyTargetUrl(msg.targetUrl);
      } else if (msg.type === "MELKTAK_RUN_SYNC") {
        void handleDrainSync();
      } else if (msg.type === "MELKTAK_CHECK_REMINDERS" && scope) {
        void notificationEngine.evaluateLocalTasks(scope, tasksRef.current);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [applyTargetUrl, handleDrainSync, scope]);

  const handleCompleteTask = async (taskId: string, visitResult?: string) => {
    if (!scope) return;
    try {
      const targetTask = tasks.find((t) => t.id === taskId);
      const res = await offlineSync.mutate(scope, {
        method: "PATCH",
        path: `/api/v1/tasks/${taskId}/complete`,
        body: { visit_result: visitResult },
        entityType: "TASK",
        entityId: taskId,
        expectedUpdatedAt: targetTask?.updated_at || null,
        actionLabel: `تکمیل پیگیری «${targetTask?.title || "وظیفه"}»`,
      });
      if (res.success) {
        showToast(
          res.queuedOffline
            ? "تکمیل پیگیری در صف آفلاین ثبت شد."
            : "پیگیری با موفقیت انجام و بایگانی شد.",
        );
        await loadFromOfflineCache();
        if (!res.queuedOffline) void refreshData();
      } else {
        showToast(res.error?.message || "خطا در ثبت انجام پیگیری.");
      }
    } catch (err) {
      console.error("Task complete error:", err);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    if (!scope) return;
    try {
      const targetTask = tasks.find((t) => t.id === taskId);
      const res = await offlineSync.mutate(scope, {
        method: "PATCH",
        path: `/api/v1/tasks/${taskId}/cancel`,
        entityType: "TASK",
        entityId: taskId,
        expectedUpdatedAt: targetTask?.updated_at || null,
        actionLabel: `لغو پیگیری «${targetTask?.title || "وظیفه"}»`,
      });
      if (res.success) {
        showToast(
          res.queuedOffline
            ? "لغو پیگیری در صف آفلاین ثبت شد."
            : "پیگیری با موفقیت لغو و بایگانی شد.",
        );
        await loadFromOfflineCache();
        if (!res.queuedOffline) void refreshData();
      } else {
        showToast(res.error?.message || "خطا در لغو پیگیری.");
      }
    } catch (err) {
      console.error("Task cancel error:", err);
    }
  };

  const handleSaveEditedTask = async (
    taskId: string,
    patch: {
      title: string;
      type: string;
      priority: string;
      due_at: string;
      end_at?: string | null;
      description?: string;
    },
    expectedUpdatedAt?: string | null,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!scope) return { success: false, error: "نشست کاربری معتبر نیست." };
    const res = await offlineSync.mutate(scope, {
      method: "PATCH",
      path: `/api/v1/tasks/${taskId}`,
      body: patch,
      entityType: "TASK",
      entityId: taskId,
      expectedUpdatedAt: expectedUpdatedAt || null,
      actionLabel: `ویرایش پیگیری «${patch.title}»`,
    });
    if (res.success) {
      showToast(
        res.queuedOffline
          ? "ویرایش پیگیری در صف آفلاین ذخیره شد."
          : "پیگیری با موفقیت ویرایش شد.",
      );
      await loadFromOfflineCache();
      if (!res.queuedOffline) void refreshData();
      return { success: true };
    }
    return {
      success: false,
      error: res.error?.message || "خطا در ذخیره تغییرات پیگیری.",
    };
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!scope) return;
    if (!window.confirm("آیا از حذف این پیگیری اطمینان دارید؟")) return;
    const targetTask = tasks.find((t) => t.id === taskId);
    const res = await offlineSync.mutate(scope, {
      method: "DELETE",
      path: `/api/v1/tasks/${taskId}`,
      entityType: "TASK",
      entityId: taskId,
      expectedUpdatedAt: targetTask?.updated_at || null,
      actionLabel: `حذف پیگیری «${targetTask?.title || "وظیفه"}»`,
    });
    if (res.success) {
      showToast(
        res.queuedOffline
          ? "حذف پیگیری در صف آفلاین ثبت شد."
          : "پیگیری با موفقیت حذف شد.",
      );
      await loadFromOfflineCache();
      if (!res.queuedOffline) void refreshData();
    } else {
      showToast(res.error?.message || "خطا در حذف پیگیری.");
    }
  };

  if (dbAdminMode) {
    return (
      <DbAdminPage
        onBackToApp={() => {
          if (window.location.pathname.startsWith("/db-admin")) {
            window.history.pushState({}, "", "/");
          } else {
            window.location.hash = "";
          }
          setDbAdminMode(false);
        }}
      />
    );
  }

  if (shareToken) {
    return (
      <SharedPropertyPublicView
        shareToken={shareToken}
        onBackToApp={() => {
          window.location.hash = "";
          setShareToken(null);
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-4">
        <img
          src="https://cdn.imgurl.ir/uploads/n255498_melktak1.png"
          alt="ملک تک"
          className="w-12 h-12 rounded-2xl shadow-md animate-pulse mb-3 object-contain bg-white p-1 border border-slate-200"
        />
        <p className="text-xs font-semibold text-[#172033]">
          در حال ارزیابی نشست و اتصال به سامانه...
        </p>
      </div>
    );
  }

  if (!isAuthenticated && offlineBlockReason) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-2xl border border-rose-200 shadow-lg p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
              {offlineBlockReason === "CLOCK_TAMPERED"
                ? "مغایرت ساعت دستگاه"
                : offlineBlockReason === "DATA_TAMPERED"
                ? "عدم تطابق امضای اعتبار آفلاین"
                : offlineBlockReason === "SUSPENDED"
                ? "حساب آژانس مسدود است"
                : offlineBlockReason === "LEASE_EXPIRED"
                ? "نیاز به بررسی آنلاین اشتراک"
                : "پایان اعتبار اشتراک"}
            </span>
            <h2 className="text-base font-black text-[#172033]">
              دسترسی آفلاین مسدود شده است
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {offlineBlockMessage ||
                "اعتبار اشتراک آژانس شما منقضی شده یا نیاز به تأیید آنلاین مجدد دارد."}
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => void refreshAuth()}
              className="w-full py-2.5 rounded-xl bg-[#145DB5] text-white text-xs font-bold hover:bg-[#0F4383] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>تلاش برای اتصال مجدد و بررسی اشتراک</span>
            </button>
            <button
              type="button"
              onClick={() => clearOfflineBlock?.()}
              className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>بازگشت به صفحه ورود</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const overdueCount = homeData?.metrics?.overdue_count || 0;

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-between">
      <OfflineBanner
        syncStatus={syncStatus}
        onOpenSyncModal={() => setSyncModalOpen(true)}
      />
      <TopHeader
        onOpenSearch={() => setSearchOpen(true)}
        onRefresh={refreshData}
        isRefreshing={isRefreshing}
        activeBranchId={activeBranchId}
        branches={branches}
        onSelectBranch={(id) => setActiveBranchId(id)}
        unreadNotificationsCount={notifState.unreadCount}
        syncStatus={syncStatus}
        isOfflineMode={isOfflineMode}
        onOpenNotifications={() => setNotifModalOpen(true)}
        onOpenSyncModal={() => setSyncModalOpen(true)}
      />

      {toastMessage && (
        <div className="fixed top-14 left-4 right-4 z-50 max-w-sm mx-auto bg-[#145DB5] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg flex items-center justify-between animate-in slide-in-from-top">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white mr-2"
          >
            ✕
          </button>
        </div>
      )}

      <main className="flex-1 max-w-md w-full mx-auto px-3.5 pt-3 md:max-w-4xl md:mr-64 md:ml-auto md:px-8 md:pt-6">
        {activeTab === "home" &&
          (homeData ? (
            <HomePage
              data={homeData}
              onOpenQuickAdd={(type) => {
                if (type === "property") setCreatePropOpen(true);
                if (type === "customer") setCreateCustOpen(true);
                if (type === "task") {
                  setTargetCustomer(null);
                  setCreateTaskOpen(true);
                }
              }}
              onOpenSearch={() => setSearchOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onCompleteTask={handleCompleteTask}
              onSelectProperty={() => setActiveTab("properties")}
              onSelectCustomer={() => setActiveTab("customers")}
            />
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 my-4">
              <p className="text-xs text-slate-600 mb-3">
                در حال بارگذاری اطلاعات اولویت‌های کاری...
              </p>
              <button
                onClick={refreshData}
                className="px-3 py-1.5 bg-[#145DB5] text-white text-xs rounded-lg font-bold"
              >
                تلاش مجدد
              </button>
            </div>
          ))}

        {activeTab === "properties" && (
          <PropertiesPage
            properties={properties}
            customers={customers}
            onOpenQuickAdd={() => setCreatePropOpen(true)}
            onRefresh={refreshData}
            activeBranchId={activeBranchId}
          />
        )}

        {activeTab === "customers" && (
          <CustomersPage
            customers={customers}
            properties={properties}
            onOpenQuickAdd={() => setCreateCustOpen(true)}
            onFollowUpCustomer={(cust) => {
              setTargetCustomer(cust);
              setCreateTaskOpen(true);
            }}
            onRefresh={refreshData}
          />
        )}

        {activeTab === "tasks" && (
          <TasksPage
            tasks={tasks}
            onOpenQuickAdd={() => {
              setTargetCustomer(null);
              setCreateTaskOpen(true);
            }}
            onCompleteTask={handleCompleteTask}
            onCancelTask={handleCancelTask}
            onEditTask={(task) => setEditingTask(task)}
            onDeleteTask={handleDeleteTask}
            highlightedTaskId={highlightedTaskId}
          />
        )}

        {activeTab === "more" && (
          <MorePage
            showToast={showToast}
            onRefreshAll={refreshData}
            onNavigateTab={navigateTab}
            activeModule={managementModule}
            onModuleChange={setManagementModule}
            unreadNotificationsCount={notifState.unreadCount}
            syncStatus={syncStatus}
            isOfflineMode={isOfflineMode}
            onOpenNotifications={() => setNotifModalOpen(true)}
            onOpenSyncModal={() => setSyncModalOpen(true)}
          />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={navigateTab}
        onOpenQuickAdd={() => setQuickAddOpen(true)}
        overdueCount={overdueCount}
      />

      <MelktakSidebar
        activeTab={activeTab}
        onSelectTab={navigateTab}
        activeModule={managementModule}
        onOpenModule={openManagementModule}
        onOpenQuickAdd={() => setQuickAddOpen(true)}
        overdueCount={overdueCount}
        unreadNotificationsCount={notifState.unreadCount}
        syncStatus={syncStatus}
        isOfflineMode={isOfflineMode}
        onOpenNotifications={() => setNotifModalOpen(true)}
        onOpenSyncModal={() => setSyncModalOpen(true)}
      />

      <QuickAddActionSheet
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSelectAction={(action) => {
          if (action === "property") setCreatePropOpen(true);
          if (action === "customer") setCreateCustOpen(true);
          if (action === "task") {
            setTargetCustomer(null);
            setCreateTaskOpen(true);
          }
          if (action === "transaction") setCreateTransactionOpen(true);
        }}
      />

      <CreatePropertyModal
        isOpen={createPropOpen}
        onClose={() => setCreatePropOpen(false)}
        onSuccess={(created) => {
          showToast(
            created._offlinePending
              ? `ملک «${created.title}» در صف همگام‌سازی آفلاین ذخیره شد.`
              : `ملک جدید با کد ${created.code} ثبت شد.`,
          );
          void loadFromOfflineCache();
          if (!created._offlinePending) void refreshData();
          setActiveTab("properties");
        }}
      />

      <CreateCustomerModal
        isOpen={createCustOpen}
        onClose={() => setCreateCustOpen(false)}
        onSuccess={(created) => {
          showToast(
            created._offlinePending
              ? `متقاضی «${created.display_name}» در صف همگام‌سازی آفلاین ذخیره شد.`
              : `متقاضی «${created.display_name}» با موفقیت ثبت شد.`,
          );
          void loadFromOfflineCache();
          if (!created._offlinePending) void refreshData();
          setActiveTab("customers");
        }}
      />

      <CreateTaskModal
        isOpen={createTaskOpen}
        onClose={() => {
          setCreateTaskOpen(false);
          setTargetCustomer(null);
        }}
        targetCustomer={targetCustomer}
        onSuccess={(created) => {
          showToast(
            created?._offlinePending
              ? "پیگیری جدید در صف همگام‌سازی آفلاین ذخیره شد."
              : "پیگیری جدید با موفقیت ثبت شد.",
          );
          void loadFromOfflineCache();
          if (!created?._offlinePending) void refreshData();
          setActiveTab("tasks");
        }}
      />

      <EditTaskModal
        isOpen={Boolean(editingTask)}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveEditedTask}
      />

      <CreateTransactionModal
        isOpen={createTransactionOpen}
        onClose={() => setCreateTransactionOpen(false)}
        onSuccess={() => {
          showToast("معامله جدید با موفقیت ثبت و پرونده نهایی شد.");
          refreshData();
        }}
        showToast={showToast}
      />

      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectProperty={() => setActiveTab("properties")}
        onSelectCustomer={() => setActiveTab("customers")}
        onFollowUpCustomer={(cust) => {
          setTargetCustomer(cust);
          setCreateTaskOpen(true);
        }}
        onNeighborhoodDeleted={refreshData}
      />

      {scope && (
        <NotificationCenterModal
          isOpen={notifModalOpen}
          onClose={() => setNotifModalOpen(false)}
          state={notifState}
          onMarkRead={(id) => void notificationEngine.markRead(scope, id)}
          onMarkAllRead={() => void notificationEngine.markAllRead(scope)}
          onDelete={(id) => void notificationEngine.deleteNotification(scope, id)}
          onClearRead={() => void notificationEngine.clearRead(scope)}
          onSelectNotification={(item: AppNotificationItem) => {
            if (!item.is_read) {
              void notificationEngine.markRead(scope, item.id);
            }
            setNotifModalOpen(false);
            applyTargetUrl(item.target_url);
          }}
          onUpdatePreference={(key, value) =>
            notificationEngine.updatePreferences(scope, { [key]: value })
          }
          onTogglePush={async (enable) => {
            if (enable) {
              return notificationEngine.enablePushNotifications(scope);
            }
            await notificationEngine.disablePushNotifications(scope);
            return { success: true, message: "اعلان‌های پس‌زمینه غیرفعال شد." };
          }}
        />
      )}

      {scope && syncStatus && (
        <SyncStatusModal
          isOpen={syncModalOpen}
          onClose={() => setSyncModalOpen(false)}
          status={syncStatus}
          onSyncNow={() => void handleDrainSync()}
          onRetryItem={(id, forceOverwrite) => {
            void offlineSync.retryItem(scope, id, forceOverwrite).then(() => {
              void loadFromOfflineCache();
              void refreshData();
            });
          }}
          onDiscardItem={(id) => {
            void offlineSync.discardItem(scope, id).then(() => {
              void loadFromOfflineCache();
            });
          }}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
};

export default App;

