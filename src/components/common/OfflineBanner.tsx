import React, { useState, useEffect } from "react";
import { AlertTriangle, CloudUpload, RefreshCw, WifiOff } from "lucide-react";
import type { SyncStatusState } from "../../services/offlineSync.ts";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return online;
}

export const OfflineBanner: React.FC<{
  syncStatus?: SyncStatusState | null;
  onOpenSyncModal?: () => void;
}> = ({ syncStatus, onOpenSyncModal }) => {
  const isOnline = useOnlineStatus();
  const pendingCount = syncStatus?.pendingCount || 0;
  const issueCount = (syncStatus?.failedCount || 0) + (syncStatus?.conflictCount || 0);
  const isSyncing = Boolean(syncStatus?.isSyncing);

  if (isOnline && pendingCount === 0 && issueCount === 0 && !isSyncing) {
    return null;
  }

  const toneClass = !isOnline
    ? "bg-amber-600 text-white"
    : issueCount > 0
    ? "bg-rose-600 text-white"
    : "bg-[#145DB5] text-white";

  return (
    <div
      className={`fixed top-2 left-2 right-2 z-50 max-w-md mx-auto flex items-center justify-between gap-2 rounded-xl px-3.5 py-2 text-xs font-medium shadow-md ${toneClass}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {!isOnline ? (
          <WifiOff className="w-4 h-4 shrink-0" />
        ) : issueCount > 0 ? (
          <AlertTriangle className="w-4 h-4 shrink-0" />
        ) : isSyncing ? (
          <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
        ) : (
          <CloudUpload className="w-4 h-4 shrink-0" />
        )}
        <span className="truncate">
          {!isOnline
            ? pendingCount > 0
              ? `حالت آفلاین فعال است (${pendingCount} تغییر در انتظار همگام‌سازی)`
              : "اتصال اینترنت قطع است — اطلاعات ذخیره شده آفلاین نمایش داده می‌شود."
            : issueCount > 0
            ? `${issueCount} مورد نیازمند بررسی همگام‌سازی است.`
            : isSyncing
            ? "در حال همگام‌سازی تغییرات آفلاین با سرور..."
            : `${pendingCount} تغییر در صف ارسال قرار دارد.`}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onOpenSyncModal && (
          <button
            type="button"
            onClick={onOpenSyncModal}
            className="bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
          >
            وضعیت صف
          </button>
        )}
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    </div>
  );
};

