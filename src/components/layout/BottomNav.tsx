import React from "react";
import {
  Building2,
  Ellipsis,
  House,
  Plus,
  SquareCheckBig,
  Users,
} from "lucide-react";

export const BottomNav: React.FC<{
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenQuickAdd: () => void;
  overdueCount?: number;
}> = ({ activeTab, onSelectTab, onOpenQuickAdd, overdueCount = 0 }) => (
  <nav className="melktak-bottom-nav fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E8F0] shadow-lg pb-safe md:hidden md:hidden">
    <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around relative">
      <button
        onClick={() => onSelectTab("home")}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
          activeTab === "home"
            ? "text-[#145DB5] font-bold"
            : "text-[#667085] hover:text-[#172033]"
        }`}
      >
        <House className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">امروز</span>
      </button>
      <button
        onClick={() => onSelectTab("properties")}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
          activeTab === "properties"
            ? "text-[#145DB5] font-bold"
            : "text-[#667085] hover:text-[#172033]"
        }`}
      >
        <Building2 className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">املاک</span>
      </button>
      <div className="flex-1 flex justify-center -mt-5">
        <button
          onClick={onOpenQuickAdd}
          className="w-12 h-12 rounded-full bg-[#145DB5] text-white flex items-center justify-center shadow-lg hover:bg-[#0F4383] active:scale-95 transition"
          aria-label="افزودن سریع"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>
      <button
        onClick={() => onSelectTab("customers")}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
          activeTab === "customers"
            ? "text-[#145DB5] font-bold"
            : "text-[#667085] hover:text-[#172033]"
        }`}
      >
        <Users className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">مشتریان</span>
      </button>
      <button
        onClick={() => onSelectTab("tasks")}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
          activeTab === "tasks"
            ? "text-[#145DB5] font-bold"
            : "text-[#667085] hover:text-[#172033]"
        }`}
      >
        <div className="relative">
          <SquareCheckBig className="w-5 h-5 mb-0.5" />
          {overdueCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-rose-600 text-white rounded-full text-[9px] font-bold min-w-4 h-4 flex items-center justify-center px-1">
              {overdueCount}
            </span>
          )}
        </div>
        <span className="text-[10px]">پیگیری</span>
      </button>
      <button
        onClick={() => onSelectTab("more")}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
          activeTab === "more"
            ? "text-[#145DB5] font-bold"
            : "text-[#667085] hover:text-[#172033]"
        }`}
      >
        <Ellipsis className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">بیشتر</span>
      </button>
    </div>
  </nav>
);
