import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CloudOff,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type { SyncStatusState } from "../../services/offlineSync.ts";
import { formatJalaaliDateTime } from "../../utils/jalaali.ts";

export interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SyncStatusState;
  onSyncNow: () => void;
  onRetryItem: (itemId: string, forceOverwrite?: boolean) => void;
  onDiscardItem: (itemId: string) => void;
}

export const SyncStatusModal: React.FC<SyncStatusModalProps> = ({
  isOpen,
  onClose,
  status,
  onSyncNow,
  onRetryItem,
  onDiscardItem,
}) => {
  if (!isOpen) return null;

  const badgeForItem = (itemStatus: string) => {
    switch (itemStatus) {
      case "SYNCING":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#145DB5] border border-blue-200">
            در حال ارسال
          </span>
        );
      case "CONFLICT":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
            تعارض ویرایش
          </span>
        );
      case "FAILED":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
            ناموفق
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            در انتظار اتصال
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs select-none">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                status.isOnline
                  ? "bg-blue-50 text-[#145DB5]"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {status.isOnline ? (
                <UploadCloud className="w-4 h-4" />
              ) : (
                <CloudOff className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#172033]">
                وضعیت همگام‌سازی و صف آفلاین
              </h3>
              <p className="text-[11px] text-[#667085]">
                {status.isOnline
                  ? status.isSyncing
                    ? "در حال ارسال تغییرات با سرور..."
                    : "اتصال به سرور برقرار است"
                  : "در حالت آفلاین — تغییرات در صف محلی ذخیره می‌شوند"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
              <div className="text-lg font-black text-amber-800">
                {status.pendingCount + status.syncingCount}
              </div>
              <div className="text-[10px] font-bold text-amber-700">
                در انتظار
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
              <div className="text-lg font-black text-emerald-800">
                {status.syncedRecentCount}
              </div>
              <div className="text-[10px] font-bold text-emerald-700">
                موفق
              </div>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center">
              <div className="text-lg font-black text-rose-800">
                {status.failedCount + status.conflictCount}
              </div>
              <div className="text-[10px] font-bold text-rose-700">
                ناموفق / تعارض
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              {status.lastSyncAt
                ? `آخرین همگام‌سازی: ${formatJalaaliDateTime(
                    new Date(status.lastSyncAt).toISOString(),
                  )}`
                : "هنوز همگام‌سازی اخیر ثبت نشده است"}
            </span>
            <button
              type="button"
              disabled={!status.isOnline || status.isSyncing || status.items.length === 0}
              onClick={onSyncNow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#145DB5] text-white font-bold text-[11px] hover:bg-[#0F4383] disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${status.isSyncing ? "animate-spin" : ""}`}
              />
              <span>همگام‌سازی اکنون</span>
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="font-extrabold text-[#172033]">صف تغییرات محلی</h4>
            {status.items.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-1.5" />
                <p className="font-bold text-slate-700">
                  تمامی تغییرات با سرور همگام هستند
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {status.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#172033]">
                        {item.actionLabel}
                      </span>
                      {badgeForItem(item.status)}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatJalaaliDateTime(new Date(item.createdAt).toISOString())}
                      </span>
                      <span>تلاش: {item.retryCount}</span>
                    </div>
                    {item.errorMessage && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                        <span>{item.errorMessage}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      {item.status === "CONFLICT" && (
                        <button
                          type="button"
                          onClick={() => onRetryItem(item.id, true)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 cursor-pointer"
                        >
                          جایگزینی با نسخه من
                        </button>
                      )}
                      {item.status === "FAILED" && (
                        <button
                          type="button"
                          onClick={() => onRetryItem(item.id, false)}
                          className="px-2.5 py-1 rounded-lg bg-[#145DB5] text-white text-[11px] font-bold hover:bg-[#0F4383] cursor-pointer"
                        >
                          تلاش مجدد
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDiscardItem(item.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-rose-600 text-[11px] font-bold hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>لغو تغییر</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {status.history.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="font-extrabold text-[#172033]">
                گزارش عملیات اخیر
              </h4>
              <div className="space-y-1.5">
                {status.history.slice(0, 8).map((h, idx) => (
                  <div
                    key={`${h.id}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 block truncate">
                        {h.actionLabel}
                      </span>
                      {h.message && (
                        <span className="text-[10px] text-slate-500">
                          {h.message}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        h.status === "SYNCED"
                          ? "bg-emerald-100 text-emerald-800"
                          : h.status === "CONFLICT"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {h.status === "SYNCED"
                        ? "موفق"
                        : h.status === "CONFLICT"
                        ? "تعارض"
                        : "ناموفق"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
