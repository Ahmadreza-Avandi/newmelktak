import React, { useState, useRef } from "react";
import {
  ShieldCheck,
  KeyRound,
  User,
  Lock,
  EyeOff,
  Eye,
  ArrowLeft,
  Loader2,
  AlertCircle,
  WifiOff,
} from "lucide-react";
import { useAuth, type LoginResult } from "../context/AuthContext.tsx";
import { useOnlineStatus } from "../components/common/OfflineBanner.tsx";

export function formatLoginErrorMessage(res: LoginResult): string {
  const code = res.code || "";
  const status = res.status;

  if (code === "OFFLINE_NO_CACHED_CREDENTIALS") {
    return res.error || "برای ورود آفلاین، ابتدا باید یک‌بار با اینترنت به این حساب وارد شده باشید.";
  }
  if (code === "OFFLINE_SECURITY_BLOCK") {
    return res.error || "به دلیل مغایرت ساعت یا دستکاری اطلاعات، دسترسی آفلاین مسدود شده است. لطفاً به اینترنت متصل شوید.";
  }
  if (code === "NETWORK_ERROR" || status === 0) {
    return res.error || "ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.";
  }
  if (
    (typeof status === "number" && status >= 500) ||
    code === "SERVER_UNAVAILABLE" ||
    code === "INTERNAL_SERVER_ERROR" ||
    code === "SERVER_ERROR"
  ) {
    return "سرور موقتاً در دسترس نیست یا خطای داخلی رخ داده است. لطفاً چند لحظه بعد دوباره تلاش کنید.";
  }
  if (code === "RATE_LIMITED" || status === 429) {
    return "تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً کمی صبر کرده و دوباره تلاش کنید.";
  }
  if (code === "INVALID_CREDENTIALS" || code === "UNAUTHORIZED" || status === 401) {
    return "کد آژانس، نام کاربری یا رمز عبور اشتباه است.";
  }
  if (code === "SUBSCRIPTION_EXPIRED" || status === 402) {
    return res.error || "اشتراک دفتر املاک منقضی شده است. لطفاً با پشتیبانی تماس بگیرید.";
  }
  if (code === "AGENCY_SUSPENDED" || code === "ACCOUNT_DISABLED" || code === "CSRF_DETECTED" || status === 403) {
    return res.error || "امکان ورود به این حساب در حال حاضر وجود ندارد.";
  }
  return res.error || "کد آژانس، نام کاربری یا رمز عبور اشتباه است.";
}

export const LoginPage: React.FC = () => {
  const { login, offlineBlockMessage } = useAuth();
  const isOnline = useOnlineStatus();
  const [agencyCode, setAgencyCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submittingRef.current) return;

    const trimmedAgency = agencyCode.trim();
    const trimmedUser = username.trim();
    if (!trimmedAgency || !trimmedUser || !password) {
      setError("لطفاً کد آژانس، نام کاربری و رمز عبور را وارد کنید.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await login(trimmedAgency, trimmedUser, password);
      if (!res.success) {
        setError(formatLoginErrorMessage(res));
      }
    } catch {
      setError("ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-center px-4 py-8 select-none">
      <div className="max-w-sm w-full mx-auto">
        <div className="text-center mb-6">
          <img
            src="https://cdn.imgurl.ir/uploads/n255498_melktak1.png"
            alt="ملک تک"
            className="w-16 h-16 rounded-2xl mx-auto shadow-md mb-3 object-contain bg-white p-1 border border-slate-200"
          />
          <h1 className="text-xl font-black text-[#172033]">ملک تک</h1>
          <p className="text-xs text-[#667085] mt-1 font-medium">
            سامانه جامع و هوشمند مدیریت معاملات و املاک
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <span className="text-xs font-bold text-[#172033]">
              ورود به پرتال کاری
            </span>
            <div className="flex items-center gap-1 text-[11px] text-[#145DB5] bg-blue-50 px-2 py-0.5 rounded">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>اتصال ایمن</span>
            </div>
          </div>

          <div role="status" aria-live="polite" className="sr-only">
            {isSubmitting ? "در حال ورود..." : ""}
          </div>

          {!isOnline && (
            <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 leading-relaxed flex items-start gap-2">
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                اتصال اینترنت قطع است. در صورت ورود موفق قبلی، می‌توانید با مشخصات حساب خود به‌صورت آفلاین وارد شوید.
              </span>
            </div>
          )}

          {offlineBlockMessage && !error && (
            <div
              role="alert"
              className="mb-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 leading-relaxed flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{offlineBlockMessage}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 leading-relaxed flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5" aria-busy={isSubmitting}>
            <div>
              <label
                htmlFor="login-agency-code"
                className="block text-xs font-semibold text-[#172033] mb-1"
              >
                کد آژانس املاک
              </label>
              <div className="relative">
                <input
                  id="login-agency-code"
                  name="agency_code"
                  type="text"
                  required={true}
                  autoComplete="organization"
                  disabled={isSubmitting}
                  value={agencyCode}
                  onChange={(ev) => setAgencyCode(ev.target.value.toUpperCase())}
                  placeholder=""
                  className="w-full rounded-xl border border-slate-300 pr-10 pl-3 py-2.5 text-xs text-[#172033] focus:border-[#145DB5] focus:ring-1 focus:ring-[#145DB5] outline-none font-mono uppercase disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
                  dir="ltr"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" aria-hidden="true" />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-semibold text-[#172033] mb-1"
              >
                نام کاربری یا ایمیل
              </label>
              <div className="relative">
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  required={true}
                  autoComplete="username"
                  disabled={isSubmitting}
                  value={username}
                  onChange={(ev) => setUsername(ev.target.value)}
                  placeholder=""
                  className="w-full rounded-xl border border-slate-300 pr-10 pl-3 py-2.5 text-xs text-[#172033] focus:border-[#145DB5] focus:ring-1 focus:ring-[#145DB5] outline-none font-mono disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
                  dir="ltr"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" aria-hidden="true" />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-[#172033] mb-1"
              >
                رمز عبور
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required={true}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-300 pr-10 pl-9 py-2.5 text-xs text-[#172033] focus:border-[#145DB5] focus:ring-1 focus:ring-[#145DB5] outline-none font-mono disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" aria-hidden="true" />
                <button
                  type="button"
                  disabled={isSubmitting}
                  aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="w-full min-h-[42px] rounded-xl bg-[#145DB5] py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#0F4383] active:scale-98 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                  <span>در حال ورود...</span>
                </>
              ) : (
                <>
                  <span>ورود به سامانه</span>
                  <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
