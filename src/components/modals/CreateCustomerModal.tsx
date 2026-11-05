import React, { useState } from "react";
import { Lock, ShieldCheck, UserPlus, X } from "lucide-react";
import { api } from "../../services/apiClient.ts";
import { toWords } from "../../utils/jalaali.ts";

export const CreateCustomerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: any) => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerType, setCustomerType] = useState("BUYER");
  const [visibility, setVisibility] = useState("AGENCY");
  const [budgetMax, setBudgetMax] = useState("");
  const [preferredAreaText, setPreferredAreaText] = useState("");
  const [temperature, setTemperature] = useState("WARM");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("نام و نام خانوادگی متقاضی الزامی است.");
      return;
    }

    let cleanedPhone = phone.trim();
    const persianNums = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
    const arabicNums = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    for (let i = 0; i < 10; i++) {
      cleanedPhone = cleanedPhone
        .replace(persianNums[i], String(i))
        .replace(arabicNums[i], String(i));
    }
    cleanedPhone = cleanedPhone.replace(/\D/g, "");
    if (cleanedPhone.startsWith("989")) {
      cleanedPhone = "0" + cleanedPhone.slice(2);
    } else if (cleanedPhone.startsWith("9") && cleanedPhone.length === 10) {
      cleanedPhone = "0" + cleanedPhone;
    }

    if (!/^09\d{9}$/.test(cleanedPhone)) {
      setError("شماره تلفن همراه باید ۱۱ رقم بوده و با ۰۹ شروع شود.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/api/v1/customers", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: cleanedPhone,
        customer_type: customerType,
        visibility,
        budget_max: budgetMax ? Number(budgetMax) : undefined,
        preferred_area_text: preferredAreaText.trim() || undefined,
        temperature,
        notes: notes.trim() || undefined,
      });
      if (res.success && res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        setError(res.error?.message || "خطا در ثبت اطلاعات مشتری در پایگاه داده.");
      }
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-[#172033]">
              ثبت سریع مشتری / متقاضی
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1.5">
              نوع متقاضی
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "BUYER", label: "خریدار" },
                { id: "TENANT", label: "مستأجر" },
                { id: "INVESTOR", label: "سرمایه‌گذار" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCustomerType(item.id)}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    customerType === item.id
                      ? "bg-[#145DB5] text-white border-[#145DB5]"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1.5">
              حریم خصوصی و رویت متقاضی
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("AGENCY")}
                className={`p-2.5 text-right rounded-xl border transition ${
                  visibility === "AGENCY"
                    ? "bg-blue-50 border-[#145DB5] text-[#145DB5]"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#145DB5]" />
                  <span>عمومی دفتر</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  مشاوران مجاز این دفتر نیز می‌توانند پرونده را ببینند.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setVisibility("PRIVATE")}
                className={`p-2.5 text-right rounded-xl border transition ${
                  visibility === "PRIVATE"
                    ? "bg-amber-50 border-amber-500 text-amber-900"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold mb-0.5">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>فایل اختصاصی</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  پرونده برای مشاور مسئول و مدیریت دفتر قابل مشاهده است.
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-[#667085] mb-1">
                نام <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="مثلاً محمد"
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-[#172033] focus:border-[#145DB5] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#667085] mb-1">
                نام خانوادگی <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="مثلاً رضایی"
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-[#172033] focus:border-[#145DB5] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1">
              شماره تلفن همراه <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              inputMode="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09121234567"
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-[#172033] focus:border-[#145DB5] outline-none font-mono text-left"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1">
              حداکثر سقف بودجه (تومان)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder="مثلاً 6000000000 (۶ میلیارد)"
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-[#172033] focus:border-[#145DB5] outline-none font-mono"
            />
            {budgetMax && toWords(budgetMax) && (
              <p className="mt-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                {toWords(budgetMax)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1">
              خواسته اولیه و منطقه مورد نظر
            </label>
            <input
              type="text"
              value={preferredAreaText}
              onChange={(e) => setPreferredAreaText(e.target.value)}
              placeholder="مثلاً گلشهر یا جهانشهر، ۲ خواب، پارکینگ‌دار"
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-[#172033] focus:border-[#145DB5] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1.5">
              میزان جدیت و فوریت (دما)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTemperature("HOT")}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  temperature === "HOT"
                    ? "bg-rose-500 text-white border-rose-500"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                داغ (فوری)
              </button>
              <button
                type="button"
                onClick={() => setTemperature("WARM")}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  temperature === "WARM"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                گرم (پیگیر)
              </button>
              <button
                type="button"
                onClick={() => setTemperature("COLD")}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  temperature === "COLD"
                    ? "bg-slate-700 text-white border-slate-700"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                سرد (مقدماتی)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1">
              یادداشت مشاور
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="نکات مهم مکالمه یا شرایط ویژه پرداخت..."
              className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-[#145DB5]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#145DB5] py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#0F4383] active:scale-98 transition disabled:opacity-50"
            >
              {submitting ? "در حال ثبت در پایگاه داده..." : "ثبت قطعی متقاضی"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
