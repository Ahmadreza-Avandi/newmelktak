import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

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

export const OfflineBanner: React.FC = () =>
  useOnlineStatus() ? null : (
    <div className="fixed top-2 left-2 right-2 z-50 flex items-center justify-between rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-md">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>اتصال اینترنت قطع است — اطلاعات آفلاین نمایش داده می‌شود.</span>
      </div>
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
    </div>
  );
