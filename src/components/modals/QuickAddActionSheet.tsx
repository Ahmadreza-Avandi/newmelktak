import React from "react";
import {
  Building2,
  Handshake,
  SquareCheckBig,
  UserPlus,
  X,
} from "lucide-react";

export const QuickAddActionSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: "property" | "customer" | "task" | "transaction") => void;
}> = ({ isOpen, onClose, onSelectAction }) =>
  isOpen ? (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs transition">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#145DB5]" />
            <h3 className="text-sm font-bold text-[#172033]">
              افزودن سریع به سامانه
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
          <button
            onClick={() => {
              onClose();
              onSelectAction("property");
            }}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-[#145DB5] hover:bg-blue-50/40 active:scale-95 transition group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#145DB5] flex items-center justify-center mb-1.5 group-hover:bg-[#145DB5] group-hover:text-white transition">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#172033]">فایل ملک</span>
            <span className="text-[10px] text-[#667085] mt-0.5">
              فروش / رهن
            </span>
          </button>
          <button
            onClick={() => {
              onClose();
              onSelectAction("customer");
            }}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 active:scale-95 transition group"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:bg-emerald-700 group-hover:text-white transition">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#172033]">مشتری جدید</span>
            <span className="text-[10px] text-[#667085] mt-0.5">
              ثبت متقاضی
            </span>
          </button>
          <button
            onClick={() => {
              onClose();
              onSelectAction("task");
            }}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-amber-600 hover:bg-amber-50/40 active:scale-95 transition group"
          >
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mb-1.5 group-hover:bg-amber-700 group-hover:text-white transition">
              <SquareCheckBig className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#172033]">پیگیری</span>
            <span className="text-[10px] text-[#667085] mt-0.5">
              یادآوری تماس
            </span>
          </button>
          <button
            onClick={() => {
              onClose();
              onSelectAction("transaction");
            }}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-purple-600 hover:bg-purple-50/40 active:scale-95 transition group"
          >
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center mb-1.5 group-hover:bg-purple-700 group-hover:text-white transition">
              <Handshake className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#172033]">ثبت معامله</span>
            <span className="text-[10px] text-[#667085] mt-0.5">
              بستن قرارداد
            </span>
          </button>
        </div>
        <p className="text-[11px] text-center text-[#667085]">
          برای صرفه‌جویی در زمان، فقط اطلاعات اولیه را وارد فرمایید؛ جزئیات تکمیلی
          بعداً قابل ویرایش است.
        </p>
      </div>
    </div>
  ) : null;
