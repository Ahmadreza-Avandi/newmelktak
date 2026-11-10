import React, { useState, useEffect, useCallback } from "react";
import { api } from "./services/apiClient.ts";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { OfflineBanner } from "./components/common/OfflineBanner.tsx";
import { TopHeader } from "./components/layout/TopHeader.tsx";
import { BottomNav } from "./components/layout/BottomNav.tsx";
import { MelktakSidebar } from "./components/layout/Sidebar.tsx";
import { QuickAddActionSheet } from "./components/modals/QuickAddActionSheet.tsx";
import { CreatePropertyModal } from "./components/modals/CreatePropertyModal.tsx";
import { CreateCustomerModal } from "./components/modals/CreateCustomerModal.tsx";
import { CreateTaskModal } from "./components/modals/CreateTaskModal.tsx";
import { CreateTransactionModal } from "./components/modals/CreateTransactionModal.tsx";
import { GlobalSearchModal } from "./components/modals/GlobalSearchModal.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { SharedPropertyPublicView } from "./pages/SharedPropertyPublicView.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { PropertiesPage } from "./pages/PropertiesPage.tsx";
import { CustomersPage } from "./pages/CustomersPage.tsx";
import { TasksPage } from "./pages/TasksPage.tsx";
import { MorePage } from "./pages/MorePage.tsx";

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
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [shareToken, setShareToken] = useState<string | null>(
    getSharedPropertyToken
  );

  const navigateTab = (tab: string) => {
    setManagementModule("hub");
    setActiveTab(tab);
  };

  const openManagementModule = (module: string) => {
    setManagementModule(module);
    setActiveTab("more");
  };

  useEffect(() => {
    const handleHashChange = () => {
      setShareToken(getSharedPropertyToken());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
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
  const [createTransactionOpen, setCreateTransactionOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const refreshData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsRefreshing(true);
    try {
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
      if (homeRes.success && homeRes.data) setHomeData(homeRes.data);
      if (propsRes.success && propsRes.data) setProperties(propsRes.data);
      if (custsRes.success && custsRes.data) setCustomers(custsRes.data);
      if (tasksRes.success && tasksRes.data) setTasks(tasksRes.data);
      if (branchesRes.success && branchesRes.data) setBranches(branchesRes.data);
    } catch (err) {
      console.error("Data fetch error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, activeBranchId]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated, refreshData]);

  const handleCompleteTask = async (taskId: string, visitResult: string) => {
    try {
      const res = await api.patch(`/api/v1/tasks/${taskId}/complete`, {
        visit_result: visitResult,
      });
      if (res.success) {
        showToast("پیگیری با موفقیت انجام و بایگانی شد.");
        refreshData();
      } else {
        showToast(res.error?.message || "خطا در ثبت انجام پیگیری.");
      }
    } catch (err) {
      console.error("Task complete error:", err);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      const res = await api.patch(`/api/v1/tasks/${taskId}/cancel`);
      if (res.success) {
        showToast("پیگیری با موفقیت لغو و بایگانی شد.");
        refreshData();
      } else {
        showToast(res.error?.message || "خطا در لغو پیگیری.");
      }
    } catch (err) {
      console.error("Task cancel error:", err);
    }
  };

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

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const overdueCount = homeData?.metrics?.overdue_count || 0;

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-between">
      <OfflineBanner />
      <TopHeader
        onOpenSearch={() => setSearchOpen(true)}
        onRefresh={refreshData}
        isRefreshing={isRefreshing}
        activeBranchId={activeBranchId}
        branches={branches}
        onSelectBranch={(id) => setActiveBranchId(id)}
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
          />
        )}

        {activeTab === "more" && (
          <MorePage
            showToast={showToast}
            onRefreshAll={refreshData}
            onNavigateTab={navigateTab}
            activeModule={managementModule}
            onModuleChange={setManagementModule}
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
          showToast(`ملک جدید با کد ${created.code} ثبت شد.`);
          refreshData();
          setActiveTab("properties");
        }}
      />

      <CreateCustomerModal
        isOpen={createCustOpen}
        onClose={() => setCreateCustOpen(false)}
        onSuccess={(created) => {
          showToast(`متقاضی «${created.display_name}» با موفقیت ثبت شد.`);
          refreshData();
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
        onSuccess={() => {
          showToast("پیگیری جدید با موفقیت ثبت شد.");
          refreshData();
          setActiveTab("tasks");
        }}
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
      />
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
