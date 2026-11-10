import React from "react";
import {
  Building,
  Building2,
  ChartColumn,
  Ellipsis,
  FileText,
  Handshake,
  House,
  KeyRound,
  Plus,
  SquareCheckBig,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.tsx";
import { canOpenModule } from "../management/ManagementUI.tsx";

export const MelktakSidebar: React.FC<{
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenQuickAdd: () => void;
  overdueCount?: number;
  activeModule?: string;
  onOpenModule: (module: string) => void;
}> = ({
  activeTab,
  onSelectTab,
  onOpenQuickAdd,
  overdueCount = 0,
  activeModule = "hub",
  onOpenModule,
}) => {
  const { user, tenant, logout } = useAuth();
  const roleTitle =
    (user?.role_code as string) === "SUPER_ADMIN"
      ? "مدیر ارشد سامانه"
      : user?.role_code === "ADMIN" || user?.role_code === "OWNER"
      ? "مدیر آژانس"
      : "مشاور املاک";
  const isManager =
    user?.role_code === "ADMIN" ||
    user?.role_code === "OWNER" ||
    user?.role_code === "BRANCH_MANAGER";

  const itemClass = (isActive: boolean) =>
    `w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
      isActive
        ? "bg-blue-50 text-[#145DB5] shadow-2xs"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;

  return (
    <aside className="melktak-desktop-sidebar hidden md:flex flex-col fixed top-0 right-0 w-64 h-screen bg-white border-l border-[#E2E8F0] z-50 shadow-sm select-none justify-between">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="p-4 pb-3 border-b border-slate-100 flex items-center gap-2.5 shrink-0">
          <img
            src="https://cdn.imgurl.ir/uploads/n255498_melktak1.png"
            alt="ملک تک"
            className="w-10 h-10 rounded-xl object-contain bg-blue-50 p-1 border border-blue-100 shadow-2xs shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs font-black text-[#172033] truncate">
                {tenant?.name || "ملک تک"}
              </h1>
              <span className="text-[9px] font-bold text-[#145DB5] bg-blue-50 px-1 rounded border border-blue-100 shrink-0">
                ویندوز
              </span>
            </div>
            <p className="text-[10px] text-[#667085] truncate mt-0.5">
              {tenant?.agency_code
                ? `کد دفتر: ${tenant.agency_code}`
                : "سامانه مدیریت املاک"}
            </p>
          </div>
        </div>
        <div className="p-3 pb-2 shrink-0">
          <button
            onClick={onOpenQuickAdd}
            className="w-full flex items-center justify-center gap-2 bg-[#145DB5] text-white py-2 px-3 rounded-xl text-xs font-bold shadow-md hover:bg-[#0F4383] active:scale-98 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>ثبت سریع (ملک / متقاضی)</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-4 py-1 no-scrollbar">
          <div>
            <span className="text-[10px] font-black text-slate-400 block px-2 mb-1 uppercase tracking-wider">
              میز کار و فایلینگ
            </span>
            <div className="space-y-0.5">
              <button
                onClick={() => onSelectTab("home")}
                className={itemClass(activeTab === "home")}
              >
                <div className="flex items-center gap-2.5">
                  <House
                    className={`w-4 h-4 ${
                      activeTab === "home" ? "text-[#145DB5]" : "text-slate-400"
                    }`}
                  />
                  <span>امروز (میز کار)</span>
                </div>
              </button>
              <button
                onClick={() => onSelectTab("properties")}
                className={itemClass(activeTab === "properties")}
              >
                <div className="flex items-center gap-2.5">
                  <Building2
                    className={`w-4 h-4 ${
                      activeTab === "properties"
                        ? "text-[#145DB5]"
                        : "text-slate-400"
                    }`}
                  />
                  <span>فایل‌های املاک</span>
                </div>
              </button>
              <button
                onClick={() => onSelectTab("customers")}
                className={itemClass(activeTab === "customers")}
              >
                <div className="flex items-center gap-2.5">
                  <Users
                    className={`w-4 h-4 ${
                      activeTab === "customers"
                        ? "text-[#145DB5]"
                        : "text-slate-400"
                    }`}
                  />
                  <span>مشتریان و متقاضیان</span>
                </div>
              </button>
              <button
                onClick={() => onSelectTab("tasks")}
                className={itemClass(activeTab === "tasks")}
              >
                <div className="flex items-center gap-2.5">
                  <SquareCheckBig
                    className={`w-4 h-4 ${
                      activeTab === "tasks" ? "text-[#145DB5]" : "text-slate-400"
                    }`}
                  />
                  <span>پیگیری‌ها و وظایف</span>
                </div>
                {overdueCount > 0 ? (
                  <span className="bg-rose-600 text-white rounded-full text-[10px] font-bold px-1.5 py-0.2">
                    {overdueCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 block px-2 mb-1 uppercase tracking-wider">
              اسناد و معاملات
            </span>
            <div className="space-y-0.5">
              <button
                onClick={() => onOpenModule("documents")}
                aria-current={
                  activeTab === "more" && activeModule === "documents"
                    ? "page"
                    : undefined
                }
                className={itemClass(
                  activeTab === "more" && activeModule === "documents"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <FileText
                    className={`w-4 h-4 ${
                      activeTab === "more" && activeModule === "documents"
                        ? "text-[#145DB5]"
                        : "text-slate-400"
                    }`}
                  />
                  <span>اسناد و مدارک</span>
                </div>
              </button>
              <button
                onClick={() => onOpenModule("transactions")}
                aria-current={
                  activeTab === "more" && activeModule === "transactions"
                    ? "page"
                    : undefined
                }
                className={itemClass(
                  activeTab === "more" && activeModule === "transactions"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Handshake
                    className={`w-4 h-4 ${
                      activeTab === "more" && activeModule === "transactions"
                        ? "text-[#145DB5]"
                        : "text-slate-400"
                    }`}
                  />
                  <span>مدیریت قراردادها</span>
                </div>
              </button>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 block px-2 mb-1 uppercase tracking-wider">
              مدیریت آژانس و نظارت
            </span>
            <div className="space-y-0.5">
              {isManager ? (
                <button
                  onClick={() => onOpenModule("report")}
                  aria-current={
                    activeTab === "more" && activeModule === "report"
                      ? "page"
                      : undefined
                  }
                  className={itemClass(
                    activeTab === "more" && activeModule === "report"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <ChartColumn
                      className={`w-4 h-4 ${
                        activeTab === "more" && activeModule === "report"
                          ? "text-[#145DB5]"
                          : "text-slate-400"
                      }`}
                    />
                    <span>گزارش عملکرد</span>
                  </div>
                </button>
              ) : null}
              {isManager ? (
                <button
                  onClick={() => onOpenModule("branches")}
                  aria-current={
                    activeTab === "more" && activeModule === "branches"
                      ? "page"
                      : undefined
                  }
                  className={itemClass(
                    activeTab === "more" && activeModule === "branches"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Building
                      className={`w-4 h-4 ${
                        activeTab === "more" && activeModule === "branches"
                          ? "text-[#145DB5]"
                          : "text-slate-400"
                      }`}
                    />
                    <span>مدیریت شعب</span>
                  </div>
                </button>
              ) : null}
              {isManager ? (
                <button
                  onClick={() => onOpenModule("agents")}
                  aria-current={
                    activeTab === "more" && activeModule === "agents"
                      ? "page"
                      : undefined
                  }
                  className={itemClass(
                    activeTab === "more" && activeModule === "agents"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Users
                      className={`w-4 h-4 ${
                        activeTab === "more" && activeModule === "agents"
                          ? "text-[#145DB5]"
                          : "text-slate-400"
                      }`}
                    />
                    <span>مدیریت مشاورین</span>
                  </div>
                </button>
              ) : null}
              {canOpenModule("settings", user?.role_code) ? (
                <button
                  onClick={() => onOpenModule("settings")}
                  aria-current={
                    activeTab === "more" && activeModule === "settings"
                      ? "page"
                      : undefined
                  }
                  className={itemClass(
                    activeTab === "more" && activeModule === "settings"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Ellipsis
                      className={`w-4 h-4 ${
                        activeTab === "more" && activeModule === "settings"
                          ? "text-[#145DB5]"
                          : "text-slate-400"
                      }`}
                    />
                    <span>تنظیمات دفتر</span>
                  </div>
                </button>
              ) : null}
              {isManager ? (
                <button
                  onClick={() => onOpenModule("audit")}
                  aria-current={
                    activeTab === "more" && activeModule === "audit"
                      ? "page"
                      : undefined
                  }
                  className={itemClass(
                    activeTab === "more" && activeModule === "audit"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <KeyRound
                      className={`w-4 h-4 ${
                        activeTab === "more" && activeModule === "audit"
                          ? "text-[#145DB5]"
                          : "text-slate-400"
                      }`}
                    />
                    <span>گزارش ممیزی</span>
                  </div>
                </button>
              ) : null}
              <button
                onClick={() => onOpenModule("security")}
                aria-current={
                  activeTab === "more" && activeModule === "security"
                    ? "page"
                    : undefined
                }
                className={itemClass(
                  activeTab === "more" && activeModule === "security"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <KeyRound
                    className={`w-4 h-4 ${
                      activeTab === "more" && activeModule === "security"
                        ? "text-[#145DB5]"
                        : "text-slate-400"
                    }`}
                  />
                  <span>امنیت و گذرواژه</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="p-3 border-t border-slate-100 space-y-2 shrink-0 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 shadow-2xs">
          <div className="flex-1 min-w-0 pr-1">
            <p className="text-xs font-bold text-[#172033] truncate">
              {user?.display_name || "کاربر سیستم"}
            </p>
            <p className="text-[10px] text-[#667085] truncate">{roleTitle}</p>
          </div>
          <button
            type="button"
            onClick={() => logout && logout()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition cursor-pointer"
            title="خروج از حساب"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>متصل به سرور</span>
          </div>
          <span>ملک تک ویندوز</span>
        </div>
      </div>
    </aside>
  );
};
