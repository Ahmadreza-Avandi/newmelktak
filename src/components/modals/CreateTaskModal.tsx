import React, { useState, useEffect } from "react";
import { Building2, SquareCheckBig, User, X } from "lucide-react";
import { api } from "../../services/apiClient.ts";
import { PersianDatePicker } from "../common/PersianDatePicker.tsx";

export const TASK_TYPE_OPTIONS = [
  { id: "FOLLOW_UP", label: "پیگیری عمومی" },
  { id: "CALL", label: "تماس تلفنی" },
  { id: "VISIT", label: "بازدید ملک" },
  { id: "MEETING", label: "جلسه حضوری" },
  { id: "NEGOTIATION", label: "مذاکره قرارداد" },
  { id: "PAYMENT_REMINDER", label: "یادآوری پرداخت" },
  { id: "OTHER", label: "سایر اقدامات" },
];

export const CreateTaskModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: any) => void;
  targetCustomer?: any;
}> = ({ isOpen, onClose, onSuccess, targetCustomer }) => {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("FOLLOW_UP");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [hasEndAt, setHasEndAt] = useState(false);
  const [endAt, setEndAt] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (targetCustomer) {
      setTitle(`پیگیری وضعیت فایل با ${targetCustomer.display_name}`);
      setCustomerId(targetCustomer.id);
    } else {
      setTitle("");
      setCustomerId("");
    }
    setPropertyId("");
    setDescription("");
    setType("FOLLOW_UP");
    setPriority("MEDIUM");
    setHasEndAt(false);
  }, [targetCustomer, isOpen]);

  useEffect(() => {
    if (isOpen) {
      api.get("/api/v1/customers").then((res) => {
        if (res.success && res.data) {
          setCustomers(res.data.filter((c: any) => !c.is_archived));
        }
      });
      api.get("/api/v1/properties").then((res) => {
        if (res.success && res.data) {
          setProperties(res.data.filter((p: any) => !p.is_archived));
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!title.trim()) {
      setError("عنوان پیگیری الزامی است.");
      return;
    }
    if (!dueAt) {
      setError("لطفاً تاریخ و ساعت موعد پیگیری را مشخص نمایید.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/api/v1/tasks", {
        title: title.trim(),
        description: description.trim() || undefined,
        customer_id: customerId || undefined,
        property_id: propertyId || undefined,
        due_at: dueAt,
        end_at: hasEndAt ? endAt : undefined,
        priority,
        type,
      });
      if (res.success && res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        setError(res.error?.message || "خطا در ثبت پیگیری در پایگاه داده.");
      }
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <SquareCheckBig className="w-4 h-4 text-[#145DB5]" />
            <h3 className="text-sm font-bold text-[#172033]">
              {targetCustomer
                ? `ثبت پیگیری برای ${targetCustomer.display_name}`
                : "ثبت پیگیری و فعالیت جدید"}
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

        <form
          onSubmit={handleSubmit}
          className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1"
        >
          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1.5">
              نوع فعالیت / اقدام
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={type}
                onChange={(e) => {
                  const val = e.target.value;
                  setType(val);
                  if (val === "VISIT" && !title) {
                    setTitle("بازدید ملک با متقاضی");
                  } else if (val === "CALL" && !title) {
                    setTitle("تماس تلفنی پیگیری");
                  }
                }}
                className="col-span-2 w-full rounded-lg border border-slate-300 p-2 text-xs text-[#172033] focus:border-[#145DB5] outline-none font-bold bg-white"
              >
                {TASK_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1">
              عنوان اقدام یا موضوع تماس <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً هماهنگی ساعت بازدید یا اعلام تخفیف مالک"
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-[#172033] focus:border-[#145DB5] outline-none font-semibold"
            />
          </div>

          {!targetCustomer && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-[#667085] mb-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>مشتری مرتبط (متقاضی)</span>
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-[#172033] focus:border-[#145DB5] outline-none bg-white font-medium"
                >
                  <option value="">-- بدون ارتباط با متقاضی --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-[#667085] mb-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>ملک مرتبط (فایل)</span>
                </label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-[#172033] focus:border-[#145DB5] outline-none bg-white font-medium"
                >
                  <option value="">-- بدون ارتباط با ملک --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      کد {p.code} - {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <PersianDatePicker
            valueIso={dueAt}
            onChange={(iso) => setDueAt(iso)}
            label="موعد شروع / تاریخ اقدام (تقویم شمسی)"
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[#667085]">
                تنظیم زمان پایان فعالیت
              </span>
              <button
                type="button"
                onClick={() => setHasEndAt(!hasEndAt)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  hasEndAt
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {hasEndAt ? "فعال - حذف زمان پایان" : "غیرفعال - افزودن"}
              </button>
            </div>
            {hasEndAt && (
              <PersianDatePicker
                valueIso={endAt}
                onChange={(iso) => setEndAt(iso)}
                label="زمان پایان فعالیت (تقویم شمسی)"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1.5">
              اولویت
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "LOW", label: "کم" },
                { id: "MEDIUM", label: "عادی" },
                { id: "HIGH", label: "مهم" },
                { id: "URGENT", label: "فوری" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPriority(item.id)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                    priority === item.id
                      ? item.id === "URGENT"
                        ? "bg-rose-600 text-white border-rose-600"
                        : item.id === "HIGH"
                        ? "bg-[#145DB5] text-white border-[#145DB5]"
                        : item.id === "MEDIUM"
                        ? "bg-slate-700 text-white border-slate-700"
                        : "bg-slate-400 text-white border-slate-400"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1">
              یادداشت تکمیلی
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="نکات توافق شده، پیش‌زمینه یا خواسته مشتری..."
              className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-[#145DB5]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#145DB5] py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#0F4383] active:scale-98 transition disabled:opacity-50"
            >
              {submitting ? "در حال ثبت در پایگاه داده..." : "ثبت پیگیری و اقدام"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
