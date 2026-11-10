import React, { useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  User,
  Lock,
  EyeOff,
  Eye,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [agencyCode, setAgencyCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    const res = await login(agencyCode, username, password);
    if (!res.success) {
      setError(res.error || "کد آژانس، نام کاربری یا رمز عبور اشتباه است.");
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
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>اتصال ایمن</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                کد آژانس املاک
              </label>
              <div className="relative">
                <input
                  type="text"
                  required={true}
                  value={agencyCode}
                  onChange={(ev) => setAgencyCode(ev.target.value.toUpperCase())}
                  placeholder=""
                  className="w-full rounded-xl border border-slate-300 pr-10 pl-3 py-2.5 text-xs text-[#172033] focus:border-[#145DB5] focus:ring-1 focus:ring-[#145DB5] outline-none font-mono uppercase"
                  dir="ltr"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                نام کاربری یا ایمیل
              </label>
              <div className="relative">
                <input
                  type="text"
                  required={true}
                  value={username}
                  onChange={(ev) => setUsername(ev.target.value)}
                  placeholder=""
                  className="w-full rounded-xl border border-slate-300 pr-10 pl-3 py-2.5 text-xs text-[#172033] focus:border-[#145DB5] focus:ring-1 focus:ring-[#145DB5] outline-none font-mono"
                  dir="ltr"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                رمز عبور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required={true}
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-300 pr-10 pl-9 py-2.5 text-xs text-[#172033] focus:border-[#145DB5] focus:ring-1 focus:ring-[#145DB5] outline-none font-mono"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#145DB5] py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#0F4383] active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <span>{isLoading ? "در حال تایید هویت..." : "ورود به سامانه"}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
