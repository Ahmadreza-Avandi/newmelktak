import React from "react";
import { ChevronDown, GitBranch, LogOut, RefreshCw, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext.tsx";

export const TopHeader: React.FC<{
  onOpenSearch: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  activeBranchId?: string;
  branches?: any[];
  onSelectBranch?: (branchId: string) => void;
}> = ({
  onOpenSearch,
  onRefresh,
  isRefreshing,
  activeBranchId = "ALL",
  branches = [],
  onSelectBranch,
}) => {
  const { user, tenant, logout } = useAuth();
  const isAdminOrOwner =
    user?.role_code === "ADMIN" || user?.role_code === "OWNER";

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0] shadow-xs px-3.5 py-2">
      <div className="max-w-md mx-auto space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="https://cdn.imgurl.ir/uploads/n255498_melktak1.png"
              alt="ملک تک"
              className="w-8 h-8 rounded-lg object-contain bg-white shadow-xs border border-slate-200 p-0.5 shrink-0"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#172033] line-clamp-1">
                  {user?.display_name || "مشاور"}
                </span>
                <span className="text-[10px] font-semibold text-[#145DB5] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                  {tenant?.agency_code}
                </span>
              </div>
              <p className="text-[10px] text-[#667085] line-clamp-1">
                {tenant?.name || "دفتر املاک"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenSearch}
              className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white text-[#172033] flex items-center justify-center hover:bg-slate-50 active:scale-95 transition"
              title="جستجوی سریع ملک و مشتری"
            >
              <Search className="w-4 h-4 text-[#145DB5]" />
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white text-[#172033] flex items-center justify-center hover:bg-slate-50 active:scale-95 transition ${
                  isRefreshing ? "animate-spin text-[#145DB5]" : ""
                }`}
                title="بروزرسانی داده‌ها"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => {
                if (window.confirm("آیا از خروج از حساب کاربری اطمینان دارید؟")) {
                  logout();
                }
              }}
              className="w-8 h-8 rounded-lg border border-rose-100 text-rose-600 bg-rose-50 flex items-center justify-center hover:bg-rose-100 active:scale-95 transition"
              title="خروج"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-600">
            <GitBranch className="w-3.5 h-3.5 text-[#145DB5]" />
            <span className="font-semibold text-slate-700">محدوده شعبه:</span>
          </div>
          {isAdminOrOwner && onSelectBranch && branches.length > 0 ? (
            <div className="relative flex items-center">
              <select
                value={activeBranchId}
                onChange={(e) => onSelectBranch(e.target.value)}
                className="appearance-none bg-slate-50 hover:bg-blue-50/50 text-[#145DB5] font-bold text-[11px] py-1 pr-2.5 pl-6 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#145DB5] cursor-pointer transition"
              >
                <option value="ALL">همه شعب دفتر (دید سراسری)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.is_main ? "★" : ""} ({b.branch_code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#145DB5] absolute left-1.5 pointer-events-none" />
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg font-medium text-[11px]">
              <span>{(user as any)?.branch_name || "شعبه مرکزی"}</span>
              {user?.role_code === "BRANCH_MANAGER" && (
                <span className="text-[9px] text-blue-700 bg-blue-50 px-1 rounded font-bold">
                  مدیر شعبه
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
