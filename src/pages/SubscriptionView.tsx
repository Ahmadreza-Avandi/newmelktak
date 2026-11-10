import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  Building,
  Calendar,
  CircleCheck,
  Clock,
  CreditCard,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  X,
  Zap,
} from "lucide-react";
import { api } from "../services/apiClient.ts";
import { formatJalaaliDate, formatTomanWords } from "../utils/jalaali.ts";

export interface SubscriptionViewProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  onBack,
  showToast,
}) => {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("ENTERPRISE_PRO");
  const [durationMonths, setDurationMonths] = useState(12);
  const [renewing, setRenewing] = useState(false);

  const loadSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/agency/subscription");
      if (res.success && res.data) {
        setSubscription(res.data);
        setSelectedPlan(res.data.plan_code || "ENTERPRISE_PRO");
      } else {
        showToast(res.error?.message || "خطا در بارگذاری اطلاعات اشتراک.");
      }
    } catch (err) {
      console.error("Fetch subscription error:", err);
      showToast("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const handleRenew = async () => {
    if (renewing) return;
    setRenewing(true);
    try {
      const res = await api.post("/api/v1/agency/subscription/renew", {
        plan_code: selectedPlan,
        duration_months: durationMonths,
      });
      if (res.success && res.data) {
        setSubscription(res.data);
        showToast(
          res.message || "اشتراک دفتر املاک با موفقیت تمدید و فعال گردید."
        );
        setModalOpen(false);
      } else {
        showToast(res.error?.message || "خطا در تمدید اشتراک.");
      }
    } catch (err) {
      console.error("Renew error:", err);
      showToast("خطا در ارسال درخواست تمدید اشتراک.");
    } finally {
      setRenewing(false);
    }
  };

  const calculatePrice = () => {
    const annualPrice =
      (
        {
          STARTER: 12e6,
          PROFESSIONAL: 28e6,
          ENTERPRISE_PRO: 49e6,
        } as Record<string, number>
      )[selectedPlan] || 49e6;
    const monthly = annualPrice / 12;
    if (durationMonths === 1) return Math.round(monthly * 1.2);
    if (durationMonths === 3) return Math.round(monthly * 3 * 1.1);
    if (durationMonths === 6) return Math.round(monthly * 6 * 1.05);
    return annualPrice;
  };

  if (loading && !subscription) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 my-4 max-w-lg mx-auto">
        <RefreshCw className="w-8 h-8 text-[#145DB5] animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-700">
          در حال دریافت وضعیت اشتراک آژانس...
        </p>
      </div>
    );
  }

  const daysRemaining = subscription?.days_remaining ?? 0;
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = subscription?.is_expired || daysRemaining <= 0;

  return (
    <div className="space-y-4 pb-12 max-w-lg mx-auto animate-in fade-in duration-200">
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition active:scale-95"
            title="بازگشت"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-black text-[#172033] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#145DB5]" />
              مدیریت اشتراک و سهمیه آژانس
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              دفتر املاک {subscription?.name} ({subscription?.agency_code})
            </p>
          </div>
        </div>
        <button
          onClick={loadSubscription}
          disabled={loading}
          className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition"
          title="بروزرسانی"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              loading ? "animate-spin text-[#145DB5]" : ""
            }`}
          />
        </button>
      </div>

      <div
        className={`p-4 rounded-2xl border transition shadow-xs text-white ${
          isExpired
            ? "bg-gradient-to-r from-rose-700 to-rose-900 border-rose-800"
            : isExpiringSoon
            ? "bg-gradient-to-r from-amber-600 to-amber-700 border-amber-600"
            : "bg-gradient-to-r from-[#145DB5] to-[#0A3D7A] border-blue-900"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-xs">
              {subscription?.plan_title || "پلن سازمانی نامحدود"}
            </span>
            <h2 className="text-lg font-black mt-2">
              {isExpired
                ? "اشتراک دفتر املاک منقضی شده است"
                : isExpiringSoon
                ? `تنها ${daysRemaining} روز تا پایان اشتراک باقیست`
                : `${daysRemaining} روز اعتبار فعال`}
            </h2>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            {isExpired ? (
              <TriangleAlert className="w-6 h-6 text-rose-200" />
            ) : isExpiringSoon ? (
              <Clock className="w-6 h-6 text-amber-200" />
            ) : (
              <Sparkles className="w-6 h-6 text-blue-200" />
            )}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 opacity-80" />
            <span>
              تاریخ پایان:{" "}
              {subscription?.subscription_expires_at
                ? formatJalaaliDate(subscription.subscription_expires_at)
                : "نامشخص"}
            </span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 bg-white text-[#145DB5] hover:bg-slate-100 rounded-xl text-xs font-black shadow-xs transition active:scale-95"
          >
            {isExpired ? "تمدید فوری اشتراک" : "ارتقا یا تمدید پلن"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-[#145DB5]" />
              ظرفیت شعب
            </span>
            <span className="text-xs font-black text-[#172033]">
              {subscription?.active_branches_count} از{" "}
              {subscription?.max_branches}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (subscription?.active_branches_count || 0) >=
                (subscription?.max_branches || 1)
                  ? "bg-rose-500"
                  : "bg-[#145DB5]"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    ((subscription?.active_branches_count || 1) /
                      (subscription?.max_branches || 1)) *
                      100
                  )
                )}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">
            {subscription?.max_branches &&
            subscription.active_branches_count >= subscription.max_branches
              ? "سقف شعب تکمیل شده است. نیاز به ارتقای پلن."
              : `${
                  (subscription?.max_branches || 0) -
                  (subscription?.active_branches_count || 0)
                } شعبه دیگر قابل تعریف است.`}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#145DB5]" />
              ظرفیت مشاوران
            </span>
            <span className="text-xs font-black text-[#172033]">
              {subscription?.active_agents_count} از{" "}
              {subscription?.max_agents}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (subscription?.active_agents_count || 0) >=
                (subscription?.max_agents || 1)
                  ? "bg-rose-500"
                  : "bg-emerald-600"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    ((subscription?.active_agents_count || 1) /
                      (subscription?.max_agents || 1)) *
                      100
                  )
                )}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">
            {subscription?.max_agents &&
            subscription.active_agents_count >= subscription.max_agents
              ? "سقف مشاوران تکمیل است."
              : `${
                  (subscription?.max_agents || 0) -
                  (subscription?.active_agents_count || 0)
                } حساب کاربری مشاور باقیست.`}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-3">
        <h3 className="text-xs font-black text-[#172033] flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          امکانات فعال در پلن جاری دفتر
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {subscription?.features?.map((feat: string, idx: number) => (
            <div
              key={idx}
              className="flex items-start gap-2 text-xs text-slate-700 font-medium"
            >
              <CircleCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-black text-[#172033] flex items-center gap-1.5 px-1">
          <Layers className="w-3.5 h-3.5 text-[#145DB5]" />
          پلن‌های اشتراک ملک تک
        </h3>
        <div className="space-y-2.5">
          {subscription?.plans_catalog?.map((plan: any) => {
            const isCurrent = subscription.plan_code === plan.code;
            return (
              <div
                key={plan.code}
                className={`bg-white p-3.5 rounded-2xl border transition-all ${
                  isCurrent
                    ? "border-[#145DB5] ring-2 ring-blue-50 bg-blue-50/20"
                    : "border-[#E2E8F0] hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#172033]">
                        {plan.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-[#145DB5] text-white px-1.5 py-0.2 rounded-md font-bold">
                          پلن فعلی
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {plan.max_branches} شعبه • حداکثر {plan.max_agents} مشاور
                    </p>
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-black text-[#145DB5]">
                      {plan.price_annual.toLocaleString("fa-IR")}
                    </span>
                    <span className="text-[10px] text-slate-400 mr-1">
                      تومان / سالانه
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-600">
                    {plan.features.slice(0, 3).map((f: string, idx: number) => (
                      <span
                        key={idx}
                        className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  {!isCurrent && (
                    <button
                      onClick={() => {
                        setSelectedPlan(plan.code);
                        setModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-[#145DB5] hover:bg-blue-50 rounded-lg transition"
                    >
                      انتخاب این پلن
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#145DB5]" />
                <h3 className="text-sm font-black text-[#172033]">
                  تمدید و ارتقای اشتراک دفتر
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">
                انتخاب پلن مورد نظر:
              </label>
              <div className="grid grid-cols-1 gap-2">
                {subscription?.plans_catalog?.map((plan: any) => (
                  <button
                    key={plan.code}
                    type="button"
                    onClick={() => setSelectedPlan(plan.code)}
                    className={`p-2.5 rounded-xl border text-right transition flex items-center justify-between ${
                      selectedPlan === plan.code
                        ? "border-[#145DB5] bg-blue-50/60 font-bold"
                        : "border-slate-200 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <div>
                      <div className="text-xs text-[#172033]">{plan.title}</div>
                      <div className="text-[10px] text-slate-500">
                        {plan.max_branches} شعبه • {plan.max_agents} مشاور
                      </div>
                    </div>
                    <div className="text-xs font-black text-[#145DB5]">
                      {plan.price_annual.toLocaleString("fa-IR")} ت
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">
                مدت دوره اشتراک:
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[
                  { m: 1, label: "۱ ماهه" },
                  { m: 3, label: "۳ ماهه" },
                  { m: 6, label: "۶ ماهه" },
                  { m: 12, label: "۱ ساله (تخفیف ویژه)" },
                ].map((opt) => (
                  <button
                    key={opt.m}
                    type="button"
                    onClick={() => setDurationMonths(opt.m)}
                    className={`py-1.5 px-1 rounded-xl text-[11px] border font-bold transition ${
                      durationMonths === opt.m
                        ? "bg-[#145DB5] text-white border-[#145DB5]"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>مبلغ قابل پرداخت:</span>
                <span className="font-black text-[#145DB5] text-sm">
                  {calculatePrice().toLocaleString("fa-IR")} تومان
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium text-left">
                {formatTomanWords(calculatePrice())} تومان
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleRenew}
                disabled={renewing}
                className="flex-2 py-2.5 rounded-xl bg-[#145DB5] hover:bg-[#0E4990] text-white text-xs font-black shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {renewing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    در حال ثبت تمدید...
                  </>
                ) : (
                  <>
                    <CircleCheck className="w-3.5 h-3.5" />
                    تأیید و پرداخت آنی
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
