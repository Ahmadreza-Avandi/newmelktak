import React, { useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { useInstallPrompt } from "../../utils/crmWorkflows.tsx";

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = useInstallPrompt();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-[#145DB5] text-white px-2.5 py-1.5 text-xs font-medium shadow-sm hover:bg-[#0F4383] active:scale-95 transition"
        title="نصب اپلیکیشن روی گوشی"
      >
        <Download className="w-3.5 h-3.5" />
        <span>نصب برنامه</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#172033] px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 transition"
        >
          <Share2 className="w-3.5 h-3.5 text-[#145DB5]" />
          <span>نصب در آیفون</span>
        </button>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-right">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-[#172033]">
                  نصب سامانه در Safari آیفون
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#667085] leading-relaxed mb-4">
                ۱. دکمه <strong>Share</strong> (اشتراک‌گذاری در نوار پایین مرورگر)
                را لمس کنید.
                <br />
                ۲. در منوی باز شده گزینه <strong>Add to Home Screen</strong>{" "}
                (افزودن به صفحه اصلی) را انتخاب فرمایید.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-[#145DB5] py-2.5 text-xs font-semibold text-white hover:bg-[#0F4383]"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
