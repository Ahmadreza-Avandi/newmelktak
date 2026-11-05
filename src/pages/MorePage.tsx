import React, { useState, useEffect } from "react";
import {
  ArrowLeftRight,
  Building,
  ChevronLeft,
  CircleCheck,
  Database,
  KeyRound,
  LogOut,
  PenLine,
  Server,
  Shield,
  SlidersHorizontal,
  Smartphone,
  User,
} from "lucide-react";
import { api } from "../services/apiClient.ts";
import { useAuth } from "../context/AuthContext.tsx";
import {
  canOpenModule,
  ManagementHub,
  ManagementPage,
  ManagementSettings,
  ManagementSecurity,
  ManagementAudit,
} from "../components/management/ManagementUI.tsx";
import { PWAInstallCard } from "../utils/crmWorkflows.tsx";
import { PWAInstallBanner } from "../components/common/PWAInstallBanner.tsx";
import { DocumentsArchiveView } from "./DocumentsArchiveView.tsx";
import { AgentsManagementView } from "./AgentsManagementView.tsx";
import { TransactionsView } from "./TransactionsView.tsx";
import { BranchesManagementView } from "./BranchesManagementView.tsx";
import { PerformanceReportView } from "./PerformanceReportView.tsx";
import { SubscriptionView } from "./SubscriptionView.tsx";

export interface MorePageProps {
  showToast?: (msg: string) => void;
  onRefreshAll?: () => void;
  onNavigateTab?: (tab: string) => void;
  activeModule?: string;
  onModuleChange: (module: string) => void;
}

export const MorePage: React.FC<MorePageProps> = ({
  showToast,
  onRefreshAll,
  onNavigateTab,
  activeModule = "hub",
  onModuleChange,
}) => {
  const { user, tenant, logout, refreshAuth } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [localToast, setLocalToast] = useState<string | null>(null);
  const [_agentCount, setAgentCount] = useState<number | null>(null);
  const [_agencyStats, setAgencyStats] = useState<any>(null);

  const [agencyModalOpen, setAgencyModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [_subModalOpen, _setSubModalOpen] = useState(false);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [userPhone, setUserPhone] = useState(user?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [agencyName, setAgencyName] = useState(tenant?.name || "");
  const [agencyPhone, setAgencyPhone] = useState(tenant?.phone || "");
  const [agencyAddress, setAgencyAddress] = useState(tenant?.address || "");
  const [savingAgency, setSavingAgency] = useState(false);

  const notify =
    showToast ||
    ((msg: string) => {
      setLocalToast(msg);
      setTimeout(() => setLocalToast(null), 3500);
    });

  const isSuperAdmin = (user?.role_code as string) === "SUPER_ADMIN";
  const isManager =
    isSuperAdmin ||
    user?.role_code === "ADMIN" ||
    user?.role_code === "OWNER" ||
    user?.role_code === "BRANCH_MANAGER";

  const handleLogout = async () => {
    setLoggingOut(true);
    const res = await logout();
    if (!res.success && res.error) {
      notify(res.error);
      setLoggingOut(false);
      setLogoutConfirmOpen(false);
    }
  };

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setUserPhone(user.phone || "");
    }
    if (tenant) {
      setAgencyName(tenant.name || "");
      setAgencyPhone(tenant.phone || "");
      setAgencyAddress(tenant.address || "");
    }
  }, [user, tenant]);

  useEffect(() => {
    api
      .get("/api/v1/health")
      .then((res) => {
        if (res.success && res.data) {
          setHealth(res.data);
        } else {
          setHealth(res);
        }
      })
      .catch(() => setHealth({ status: "offline" }));

    api
      .get("/api/v1/agency/info")
      .then((res) => {
        if (res.success && res.data) {
          setAgencyStats(res.data.statistics);
          setAgentCount(res.data.statistics?.total_agents ?? null);
        }
      })
      .catch(() => {
        api
          .get("/api/v1/agency/agents")
          .then((res) => {
            if (res.success && Array.isArray(res.data)) {
              setAgentCount(res.data.length);
            }
          })
          .catch(() => {});
      });
  }, []);

  const handleSaveProfile = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.patch("/api/v1/auth/profile", {
        display_name: displayName,
        phone: userPhone,
      });
      if (res.success) {
        notify("پروفایل کاربری با موفقیت بروزرسانی شد.");
        setProfileModalOpen(false);
        refreshAuth?.();
        onRefreshAll?.();
      } else {
        notify(res.error?.message || "خطا در بروزرسانی پروفایل");
      }
    } catch (err: any) {
      notify(err.message || "خطا در ارتباط با سرور");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (newPassword !== confirmPassword) {
      notify("رمز عبور جدید و تکرار آن مطابقت ندارند.");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await api.post("/api/v1/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      if (res.success) {
        notify("رمز عبور با موفقیت تغییر یافت.");
        setPasswordModalOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        notify(res.error?.message || "خطا در تغییر رمز عبور");
      }
    } catch (err: any) {
      notify(err.message || "خطا در ارتباط با سرور");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveAgency = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSavingAgency(true);
    try {
      const res = await api.patch("/api/v1/agency/settings", {
        name: agencyName,
        phone: agencyPhone,
        address: agencyAddress,
      });
      if (res.success) {
        notify("تنظیمات دفتر با موفقیت بروزرسانی شد.");
        setAgencyModalOpen(false);
        onRefreshAll?.();
      } else {
        notify(res.error?.message || "خطا در بروزرسانی تنظیمات دفتر");
      }
    } catch (err: any) {
      notify(err.message || "خطا در ارتباط با سرور");
    } finally {
      setSavingAgency(false);
    }
  };

  const _openAuditModal = async () => {
    setAuditModalOpen(true);
    setAuditLoading(true);
    try {
      const res = await api.get("/api/v1/agency/audit-logs");
      if (res.success && Array.isArray(res.data)) {
        setAuditLogs(res.data);
      }
    } catch {
      // ignore
    } finally {
      setAuditLoading(false);
    }
  };

  if (!canOpenModule(activeModule, user?.role_code)) {
    return (
      <ManagementPage
        module={activeModule}
        onBack={() => onModuleChange("hub")}
      >
        <p role="alert">دسترسی به این بخش برای حساب شما فعال نیست.</p>
      </ManagementPage>
    );
  }

  if (activeModule === "documents") {
    return (
      <ManagementPage
        module={activeModule}
        onBack={() => onModuleChange("hub")}
      >
        <DocumentsArchiveView
          isOpen={true}
          embedded={true}
          onClose={() => onModuleChange("hub")}
          showToast={notify}
        />
      </ManagementPage>
    );
  }

  if (
    activeModule === "settings" ||
    activeModule === "security" ||
    activeModule === "audit"
  ) {
    return (
      <ManagementPage
        module={activeModule}
        onBack={() => onModuleChange("hub")}
      >
        {activeModule === "settings" ? (
          <ManagementSettings
            auth={{ tenant, refreshAuth }}
            onRefresh={onRefreshAll}
          />
        ) : activeModule === "security" ? (
          <ManagementSecurity auth={{ refreshAuth }} />
        ) : (
          <ManagementAudit />
        )}
      </ManagementPage>
    );
  }

  if (activeModule === "agents") {
    return (
      <ManagementPage
        module={activeModule}
        onBack={() => onModuleChange("hub")}
      >
        <AgentsManagementView
          onBack={() => onModuleChange("hub")}
          showToast={notify}
        />
      </ManagementPage>
    );
  }

  if (activeModule === "transactions") {
    return (
      <ManagementPage
        module={activeModule}
        onBack={() => onModuleChange("hub")}
      >
        <TransactionsView
          onBack={() => onModuleChange("hub")}
          showToast={notify}
          onDataChanged={onRefreshAll}
        />
      </ManagementPage>
    );
  }

  if (activeModule === "branches") {
    return (
      <ManagementPage
        module={activeModule}
        onBack={() => onModuleChange("hub")}
      >
        <BranchesManagementView
          onBack={() => onModuleChange("hub")}
          showToast={notify}
        />
      </ManagementPage>
    );
  }

  if (activeModule === "report") {
    return (
      <ManagementPage
        module={activeModule}
        onBack={() => onModuleChange("hub")}
      >
        <PerformanceReportView
          onBack={() => onModuleChange("hub")}
          showToast={notify}
        />
      </ManagementPage>
    );
  }

  if (activeModule === "subscription") {
    return (
      <ManagementPage
        module={activeModule}
        onBack={() => onModuleChange("hub")}
      >
        <SubscriptionView
          onBack={() => onModuleChange("hub")}
          showToast={notify}
        />
      </ManagementPage>
    );
  }

  if (activeModule === "platform") {
    return null;
  }

  const roleTitle =
    (user?.role_code as string) === "SUPER_ADMIN"
      ? "مدیر کل پلتفرم (Super Admin)"
      : user?.role_code === "ADMIN" || user?.role_code === "OWNER"
      ? "مدیر ارشد آژانس"
      : user?.role_code === "BRANCH_MANAGER"
      ? "مدیر شعبه"
      : "مشاور املاک";

  return (
    <div className="melktak-more-hub space-y-4 pb-24">
      {localToast && (
        <div className="p-3 rounded-xl bg-[#145DB5] text-white text-xs font-bold shadow-md flex items-center justify-between">
          <span>{localToast}</span>
          <button
            onClick={() => setLocalToast(null)}
            className="text-white/80 hover:text-white mr-2"
          >
            ✕
          </button>
        </div>
      )}

      <div>
        <h2 className="text-base font-extrabold text-[#172033]">
          بیشتر و امکانات سامانه
        </h2>
        <p className="text-xs text-[#667085]">
          مشخصات حساب کاربری، مدیریت آژانس و تنظیمات سیستم
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 rounded-2xl bg-[#145DB5] text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
              {user?.display_name ? user.display_name[0] : "ک"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-[#172033] truncate">
                  {user?.display_name || "کاربر سامانه"}
                </h3>
                <span className="text-[10px] font-bold bg-blue-50 text-[#145DB5] px-2 py-0.5 rounded border border-blue-100 shrink-0">
                  {roleTitle}
                </span>
              </div>
              <p className="text-xs text-[#667085] flex items-center gap-2 mt-1">
                <span>نام کاربری:</span>
                <strong className="font-mono text-slate-800">
                  {user?.username}
                </strong>
                {user?.phone && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-slate-700" dir="ltr">
                      {user.phone}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="p-2 rounded-xl bg-blue-50 text-[#145DB5] hover:bg-blue-100 transition cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
            title="ویرایش پروفایل"
          >
            <PenLine className="w-4 h-4" />
            <span className="hidden sm:inline">ویرایش</span>
          </button>
        </div>

        <div className="bg-[#F7F9FC] rounded-xl p-3 text-xs space-y-2 border border-slate-200/60">
          <div className="flex justify-between items-center">
            <span className="text-[#667085]">آژانس مسکن:</span>
            <span className="font-bold text-[#172033]">{tenant?.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#667085]">کد اختصاصی آژانس:</span>
            <span className="font-mono font-bold text-[#145DB5]">
              {tenant?.agency_code}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/50">
            <div className="flex items-center gap-1.5">
              <span className="text-[#667085]">پلن اشتراک:</span>
              <span className="font-bold text-slate-800">
                {tenant?.plan_code === "STARTER"
                  ? "پایه"
                  : tenant?.plan_code === "PROFESSIONAL"
                  ? "حرفه‌ای"
                  : tenant?.plan_code === "FREE_TRIAL"
                  ? "آزمایشی"
                  : "سازمانی پیشرفته"}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                  tenant?.subscription_status === "ACTIVE"
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : tenant?.subscription_status === "TRIAL"
                    ? "text-blue-700 bg-blue-50 border-blue-200"
                    : "text-rose-700 bg-rose-50 border-rose-200"
                }`}
              >
                {tenant?.subscription_status === "ACTIVE"
                  ? "فعال"
                  : tenant?.subscription_status === "TRIAL"
                  ? "آزمایشی"
                  : "منقضی شده"}
              </span>
            </div>
            {(isManager || isSuperAdmin) && (
              <button
                type="button"
                onClick={() => onModuleChange("subscription")}
                className="text-[11px] font-bold text-[#145DB5] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>مدیریت پلن</span>
                <ChevronLeft className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <PWAInstallCard />
        <ManagementHub
          role={user?.role_code}
          onOpen={onModuleChange}
          onTasks={onNavigateTab}
        />
      </div>

      <div>
        <span className="text-xs font-bold text-[#667085] block mb-2 px-1">
          تنظیمات و ابزارهای سامانه
        </span>
        <div className="space-y-2">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#145DB5]" />
                <h4 className="text-xs font-bold text-[#172033]">
                  نصب اپلیکیشن روی گوشی (PWA)
                </h4>
              </div>
              <PWAInstallBanner />
            </div>
            <p className="text-[11px] text-[#667085] leading-relaxed">
              این سامانه با استاندارد PWA طراحی شده و مستقیماً روی صفحه اصلی گوشی
              اندروید یا آیفون شما با حالت تمام‌صفحه نصب می‌شود.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#172033]">
              <Shield className="w-4 h-4 text-emerald-700" />
              <span>
                امنیت و تفکیک داده‌های چندمستأجری (Tenant Isolation)
              </span>
            </div>
            <ul className="text-[11px] text-[#667085] space-y-1.5 list-disc list-inside">
              <li>تفکیک کامل اطلاعات مشاوران و مشتریان بر مبنای سشن امن سروری.</li>
              <li>پایگاه داده PostgreSQL واقعی با ذخیره‌سازی رابطه‌ای پایدار.</li>
              <li>رمزنگاری و درهم‌سازی امن گذرواژه‌ها با الگوریتم استاندارد Bcrypt.</li>
              <li>سیاست امنیتی سطح ردیف فعال (Row-Level Security).</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#172033]">
                <Server className="w-4 h-4 text-[#145DB5]" />
                <span>وضعیت سرویس و پایگاه داده</span>
              </div>
              {health?.status === "healthy" ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CircleCheck className="w-3 h-3" />
                  متصل و فعال
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  در حال بررسی
                </span>
              )}
            </div>
            {health && (
              <div className="bg-[#F7F9FC] rounded-xl p-2.5 font-mono text-[10px] text-slate-700 space-y-1">
                <div className="flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-[#145DB5]" />
                  <span>
                    موتور پایگاه داده:{" "}
                    {health.database?.engine || "PostgreSQL 16"}
                  </span>
                </div>
                <div>نسخه سامانه: {health.version || "2.0.0-core"}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setLogoutConfirmOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 py-3 text-xs font-bold hover:bg-rose-100 active:scale-98 transition cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>خروج قطعی از سامانه</span>
      </button>

      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#145DB5] flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#172033]">
                  ویرایش پروفایل کاربری
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  نام و نام خانوادگی
                </label>
                <input
                  type="text"
                  required={true}
                  value={displayName}
                  onChange={(ev) => setDisplayName(ev.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#145DB5] outline-none text-slate-800 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  شماره تلفن همراه
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={userPhone}
                  onChange={(ev) => setUserPhone(ev.target.value)}
                  placeholder="09123456789"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#145DB5] outline-none text-slate-800 font-mono text-left"
                />
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl text-[11px] text-slate-500 space-y-1">
                <div>
                  نام کاربری:{" "}
                  <strong className="text-slate-800 font-mono">
                    {user?.username}
                  </strong>
                </div>
                <div>
                  نقش سامانه:{" "}
                  <strong className="text-[#145DB5]">{roleTitle}</strong>{" "}
                  (غیرقابل تغییر توسط کاربر)
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="py-2.5 rounded-xl bg-[#145DB5] text-white font-bold hover:bg-[#124d94] transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#172033]">
                  تغییر رمز عبور امن
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  رمز عبور فعلی
                </label>
                <input
                  type="password"
                  required={true}
                  value={currentPassword}
                  onChange={(ev) => setCurrentPassword(ev.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#145DB5] outline-none font-mono text-left"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  رمز عبور جدید (حداقل ۶ کاراکتر)
                </label>
                <input
                  type="password"
                  required={true}
                  minLength={6}
                  value={newPassword}
                  onChange={(ev) => setNewPassword(ev.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#145DB5] outline-none font-mono text-left"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  تکرار رمز عبور جدید
                </label>
                <input
                  type="password"
                  required={true}
                  minLength={6}
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#145DB5] outline-none font-mono text-left"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {changingPassword ? "در حال تغییر..." : "تایید و تغییر رمز"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {agencyModalOpen && isManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#145DB5] flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#172033]">
                  تنظیمات و مشخصات دفتر آژانس
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAgencyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveAgency} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  نام آژانس مسکن
                </label>
                <input
                  type="text"
                  required={true}
                  value={agencyName}
                  onChange={(ev) => setAgencyName(ev.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#145DB5] outline-none text-slate-800 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  تلفن دفتر
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={agencyPhone}
                  onChange={(ev) => setAgencyPhone(ev.target.value)}
                  placeholder="02188223344"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#145DB5] outline-none font-mono text-left"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  نشانی دفتر
                </label>
                <textarea
                  rows={2}
                  value={agencyAddress}
                  onChange={(ev) => setAgencyAddress(ev.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#145DB5] outline-none text-slate-800 resize-none"
                />
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl font-mono text-[11px] text-slate-600">
                کد اختصاصی آژانس (Tenant):{" "}
                <strong className="text-[#145DB5]">
                  {tenant?.agency_code}
                </strong>{" "}
                (غیرقابل تغییر)
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAgencyModalOpen(false)}
                  className="py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={savingAgency}
                  className="py-2.5 rounded-xl bg-[#145DB5] text-white font-bold hover:bg-[#124d94] transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingAgency ? "در حال ذخیره..." : "ذخیره تنظیمات دفتر"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#172033]">
                  تأیید خروج از حساب
                </h4>
                <p className="text-xs text-slate-500">
                  آیا مایل به خروج قطعی از نشست کاربری خود هستید؟
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => setLogoutConfirmOpen(false)}
                className="py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                {loggingOut ? (
                  <span>در حال خروج...</span>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>خروج از حساب</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {auditModalOpen && isManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#172033]">
                  گزارش ممیزی و ابزارهای نظارتی
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#145DB5]">
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>سازوکار انتقال امن فایل‌ها (Safe Asset Transfer)</span>
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  هنگام خروج یا تغییر مسئولیت مشاور، انتقال پرونده‌ها با تراکنش
                  پایگاه داده و حفظ تاریخچه انجام می‌پذیرد.
                </p>
              </div>
            </div>
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <span className="text-xs font-bold text-[#172033]">
                آخرین رخدادهای ممیزی آژانس
              </span>
              {auditLoading ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  در حال فراخوانی...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
                  رخدادی ثبت نشده است.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {auditLogs.slice(0, 10).map((log) => (
                    <div
                      key={log.id}
                      className="bg-[#F7F9FC] p-2.5 rounded-xl border border-slate-200 text-xs space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-[#172033] font-bold text-[11px]">
                          {log.title || log.action}
                        </strong>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {new Date(log.created_at).toLocaleDateString("fa-IR")}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#667085]">
                        {log.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setAuditModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      <DocumentsArchiveView
        isOpen={docsModalOpen}
        onClose={() => setDocsModalOpen(false)}
        showToast={notify}
      />
    </div>
  );
};
