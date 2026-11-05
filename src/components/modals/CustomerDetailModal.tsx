import React, { useState, useEffect } from "react";
import {
  Lock,
  Users,
  X,
  Phone,
  MessageSquare,
  FileText,
  ChevronLeft,
  Shield,
  Check,
  Plus,
  Funnel,
  Clock,
  Sparkles,
  Building2,
  Send,
  Calendar,
  Share2,
  CircleCheck,
} from "lucide-react";
import { api } from "../../services/apiClient.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { formatCompactPrice, toWords } from "../../utils/jalaali.ts";
import { EntityDocumentsPanel } from "../common/EntityDocumentsPanel.tsx";
import { PropertyShareModal } from "./PropertyShareModal.tsx";

export const CustomerDetailModal: React.FC<{
  customer: any;
  properties: any[];
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onOpenQuickAddTask?: (customer: any) => void;
}> = ({
  customer: e,
  properties: t,
  isOpen: n,
  onClose: r,
  onRefresh: i,
  onOpenQuickAddTask: a,
}) => {
  const [o, s] = useState<
    "REQUIREMENTS" | "TIMELINE" | "MATCHES" | "TASKS" | "DOCUMENTS" | "EDIT"
  >("REQUIREMENTS");
  const [edFn, setEdFn] = useState(e.first_name || "");
  const [edLn, setEdLn] = useState(e.last_name || "");
  const [edPh, setEdPh] = useState(e.phone || "");
  const [edSPh, setEdSPh] = useState(e.secondary_phone || "");
  const [edCt, setEdCt] = useState(e.customer_type || "BUYER");
  const [edTp, setEdTp] = useState(e.temperature || "WARM");
  const [edLs, setEdLs] = useState(e.lead_status || "NEW");
  const [edBMax, setEdBMax] = useState<any>(e.budget_max || "");
  const [edBMin, setEdBMin] = useState<any>(e.budget_min || "");
  const [edAr, setEdAr] = useState(e.preferred_area_text || "");
  const [edNt, setEdNt] = useState(e.notes || "");
  const [edLdg, setEdLdg] = useState(false);

  const [c, l] = useState<any[]>([]);
  const [u, d] = useState<any[]>([]);
  const [f, p] = useState<any[]>([]);
  const [m, h] = useState<any[]>([]);
  const [g, v] = useState<any>(null);
  const [y, x] = useState(false);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [E, D] = useState("CALL");
  const [O, k] = useState("");
  const [A, j] = useState("");
  const [M, N] = useState(false);
  const [reqListingType, setReqListingType] = useState(
    e.customer_type === "TENANT" ? "RENT" : "SALE"
  );
  const [reqPropType, setReqPropType] = useState("APARTMENT");
  const [reqMaxBudget, setReqMaxBudget] = useState<any>(e.budget_max || "");
  const [reqMinArea, setReqMinArea] = useState<any>("");
  const [reqMaxArea] = useState<any>("");
  const [reqParking, setReqParking] = useState(true);
  const [reqElevator, setReqElevator] = useState(true);
  const [reqNotes, setReqNotes] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [, setLoading] = useState(false);

  const { user: currentUser } = useAuth();
  const isManager =
    currentUser?.role_code === "BRANCH_MANAGER" ||
    currentUser?.role_code === "ADMIN" ||
    currentUser?.role_code === "OWNER";

  const [ge, _e] = useState<string>(e.visibility || "AGENCY");
  const [ve, ye] = useState<string>(e.assigned_agent_id || "");
  const [, Se] = useState<string>(e.assigned_agent_name || "");
  const [Ce, Te] = useState<string>(e.assigned_agent_id || "");
  const [Ee, De] = useState<any[]>([]);
  const [Oe, ke] = useState(false);
  const [Ae, je] = useState(false);

  const Me = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    setEdFn(e.first_name || "");
    setEdLn(e.last_name || "");
    setEdPh(e.phone || "");
    setEdSPh(e.secondary_phone || "");
    setEdCt(e.customer_type || "BUYER");
    setEdTp(e.temperature || "WARM");
    setEdLs(e.lead_status || "NEW");
    setEdBMax(e.budget_max || "");
    setEdBMin(e.budget_min || "");
    setEdAr(e.preferred_area_text || "");
    setEdNt(e.notes || "");
    _e(e.visibility || "AGENCY");
    ye(e.assigned_agent_id || "");
    Se(e.assigned_agent_name || "");
    Te(e.assigned_agent_id || "");
  }, [e]);

  useEffect(() => {
    if (n && isManager) {
      api.get("/api/v1/agency/agents").then((res) => {
        if (res.success && res.data) {
          De(res.data.filter((item: any) => item.is_active));
        }
      });
    }
  }, [n, isManager]);

  const Le = async () => {
    if (!n) return;
    setLoading(true);
    try {
      const [reqRes, timeRes, matchRes, taskRes] = await Promise.all([
        api.get(`/api/v1/customers/${e.id}/requirements`),
        api.get(`/api/v1/customers/${e.id}/timeline`),
        api.get(`/api/v1/customers/${e.id}/matches`),
        api.get("/api/v1/tasks"),
      ]);
      if (reqRes.success && reqRes.data) l(reqRes.data);
      if (timeRes.success && timeRes.data) d(timeRes.data);
      if (matchRes.success && matchRes.data) p(matchRes.data);
      if (taskRes.success && taskRes.data) {
        h(taskRes.data.filter((task: any) => task.customer_id === e.id));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (n) Le();
  }, [n, e.id]);

  if (!n) return null;

  const onSaveCustomerEdit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (edLdg) return;
    if (!edFn.trim() || !edLn.trim()) {
      Me("نام و نام خانوادگی متقاضی الزامی است.");
      return;
    }
    setEdLdg(true);
    try {
      const payload = {
        first_name: edFn.trim(),
        last_name: edLn.trim(),
        phone: edPh.trim(),
        secondary_phone: edSPh.trim() || undefined,
        customer_type: edCt,
        temperature: edTp,
        lead_status: edLs,
        budget_max: edBMax ? Number(edBMax) : undefined,
        budget_min: edBMin ? Number(edBMin) : undefined,
        preferred_area_text: edAr.trim() || undefined,
        notes: edNt.trim() || undefined,
      };
      const res = await api.patch(`/api/v1/customers/${e.id}`, payload);
      if (res.success) {
        Object.assign(e, payload);
        e.display_name = `${edFn.trim()} ${edLn.trim()}`;
        Me("مشخصات متقاضی با موفقیت ویرایش و ذخیره شد.");
        s("REQUIREMENTS");
        if (i) i();
      } else {
        Me(res.error?.message || "خطا در ذخیره تغییرات مشتری.");
      }
    } catch {
      Me("خطا در برقراری ارتباط با سرور.");
    } finally {
      setEdLdg(false);
    }
  };

  const Pe = async (vis: string) => {
    if (vis !== ge) {
      ke(true);
      try {
        const res = await api.patch(`/api/v1/customers/${e.id}`, {
          visibility: vis,
        });
        if (res.success) {
          _e(vis);
          Me(
            vis === "PRIVATE"
              ? "متقاضی به عنوان «پرونده اختصاصی» تنظیم شد."
              : "متقاضی به عنوان «عمومی دفتر» تنظیم شد."
          );
          i();
        } else {
          Me(res.error?.message || "خطا در تغییر سطح دسترسی.");
        }
      } catch {
        Me("خطا در ارتباط با سرور.");
      } finally {
        ke(false);
      }
    }
  };

  const Fe = async () => {
    if (Ce && Ce !== ve) {
      je(true);
      try {
        const res = await api.patch(`/api/v1/customers/${e.id}/assign`, {
          assigned_to_user_id: Ce,
        });
        if (res.success) {
          ye(Ce);
          const found = Ee.find((item) => item.id === Ce);
          if (found) Se(found.display_name);
          Me("پرونده متقاضی با موفقیت به مشاور جدید واگذار شد.");
          i();
        } else {
          Me(res.error?.message || "خطا در واگذاری متقاضی.");
        }
      } catch {
        Me("خطا در ارتباط با سرور.");
      } finally {
        je(false);
      }
    }
  };

  const Re = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!O.trim()) return;
    const res = await api.post(`/api/v1/customers/${e.id}/interactions`, {
      interaction_type: E,
      title: O.trim(),
      description: A.trim() || undefined,
    });
    if (res.success) {
      Me("تعامل جدید با موفقیت ثبت شد.");
      k("");
      j("");
      setShowAddInteraction(false);
      Le();
      i();
    }
  };

  const ze = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const res = await api.post(`/api/v1/customers/${e.id}/requirements`, {
      property_type: reqPropType,
      listing_type: reqListingType,
      max_budget: reqMaxBudget ? Number(reqMaxBudget) : undefined,
      min_area: reqMinArea ? Number(reqMinArea) : undefined,
      max_area: reqMaxArea ? Number(reqMaxArea) : undefined,
      needs_parking: reqParking,
      needs_elevator: reqElevator,
      notes: reqNotes.trim() || undefined,
    });
    if (res.success) {
      Me("نیازمندی جدید ذخیره گردید.");
      N(false);
      Le();
      i();
    }
  };

  const Be = async (prop: any) => {
    try {
      const res = await api.post(`/api/v1/properties/${prop.id}/share`, {
        customer_id: e.id,
        channel: "WHATSAPP",
        notes: "ارسال خودکار فایل منطبق با بودجه متقاضی",
      });
      if (res.success && res.data) {
        const shareUrl = `${window.location.origin}#/p/${res.data.share_token}`;
        Me(`فایل کد ${prop.code} به تایم‌لاین مشتری اضافه شد.`);
        Le();
        i();
        let phone = e.phone.replace(/\D/g, "");
        if (phone.startsWith("0")) phone = "98" + phone.substring(1);
        const text = encodeURIComponent(
          `سلام و احترام ${e.display_name} عزیز،\nملک متناسب با درخواست شما (کد ${prop.code} - ${prop.title}):\nمشاهده تصاویر و جزئیات کامل:\n${shareUrl}`
        );
        window.open(
          `https://api.whatsapp.com/send?phone=${phone}&text=${text}`,
          "_blank"
        );
      }
    } catch (err) {
      console.error("Quick share error:", err);
    }
  };

  const Ue = (phone: string) => {
    let digits = phone.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = "98" + digits.substring(1);
    return digits;
  };

  const We = (type: string) => {
    switch (type) {
      case "CALL":
        return <Phone className="w-3.5 h-3.5 text-blue-600" />;
      case "PROPERTY_SENT":
        return <Share2 className="w-3.5 h-3.5 text-emerald-600" />;
      case "VISIT":
        return <Building2 className="w-3.5 h-3.5 text-indigo-600" />;
      case "FOLLOW_UP":
        return <CircleCheck className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 select-none">
      <div className="w-full max-w-lg max-h-[94vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom">
        <div className="p-4 border-b border-slate-100 bg-[#F7F9FC] rounded-t-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[#172033]">
                {e.display_name}
              </span>
              <span className="bg-blue-100 text-[#145DB5] text-[10px] font-bold px-2 py-0.5 rounded">
                {e.customer_type === "BUYER"
                  ? "متقاضی خرید"
                  : e.customer_type === "TENANT"
                  ? "مستأجر"
                  : "سرمایه‌گذار"}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  e.temperature === "HOT"
                    ? "bg-rose-100 text-rose-800"
                    : e.temperature === "WARM"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {e.temperature === "HOT"
                  ? "داغ (فوری)"
                  : e.temperature === "WARM"
                  ? "گرم"
                  : "سرد"}
              </span>
              {ge === "PRIVATE" ? (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  <span>متقاضی اختصاصی</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5" />
                  <span>عمومی دفتر</span>
                </span>
              )}
            </div>
            <button
              onClick={r}
              className="p-1 rounded text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="text-slate-600 font-medium" dir="ltr">
              {e.phone}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`tel:${e.phone}`}
                className="flex items-center gap-1 bg-[#145DB5] text-white px-2.5 py-1 rounded-lg font-bold hover:bg-[#0F4383] transition"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>تماس مستقیم</span>
              </a>
              <a
                href={`https://api.whatsapp.com/send?phone=${Ue(e.phone)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold hover:bg-emerald-800 transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>واتس‌اپ</span>
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={() => s(o === "EDIT" ? "REQUIREMENTS" : "EDIT")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border transition text-xs shrink-0 ${
              o === "EDIT"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white border-slate-300 text-slate-700 hover:border-[#145DB5] hover:text-[#145DB5]"
            }`}
          >
            <span>{o === "EDIT" ? "بازگشت" : "ویرایش متقاضی"}</span>
          </button>
        </div>

        {toastMsg && (
          <div className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 text-center">
            {toastMsg}
          </div>
        )}

        <div className="grid grid-cols-6 border-b border-slate-100 bg-slate-50 text-[11px] font-bold">
          <button
            onClick={() => s("REQUIREMENTS")}
            className={`py-2 text-center transition ${
              o === "REQUIREMENTS"
                ? "bg-white text-[#145DB5] border-b-2 border-[#145DB5]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            نیازمندی‌ها
          </button>
          <button
            onClick={() => s("TIMELINE")}
            className={`py-2 text-center transition flex items-center justify-center gap-1 ${
              o === "TIMELINE"
                ? "bg-white text-[#145DB5] border-b-2 border-[#145DB5]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>تایم‌لاین</span>
            {u.length > 0 && (
              <span className="bg-blue-100 text-[#145DB5] text-[10px] px-1.5 rounded-full">
                {u.length}
              </span>
            )}
          </button>
          <button
            onClick={() => s("MATCHES")}
            className={`py-2 text-center transition flex items-center justify-center gap-1 ${
              o === "MATCHES"
                ? "bg-white text-[#145DB5] border-b-2 border-[#145DB5]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>فایل‌ها</span>
            {f.length > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 rounded-full font-black">
                {f.length}
              </span>
            )}
          </button>
          <button
            onClick={() => s("TASKS")}
            className={`py-2 text-center transition flex items-center justify-center gap-1 ${
              o === "TASKS"
                ? "bg-white text-[#145DB5] border-b-2 border-[#145DB5]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>پیگیری</span>
            {m.length > 0 && (
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 rounded-full">
                {m.length}
              </span>
            )}
          </button>
          <button
            onClick={() => s("DOCUMENTS")}
            className={`py-2 text-center transition flex items-center justify-center gap-1 ${
              o === "DOCUMENTS"
                ? "bg-white text-[#145DB5] border-b-2 border-[#145DB5]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>اسناد</span>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {o === "EDIT" && (
            <form
              onSubmit={onSaveCustomerEdit}
              className="space-y-3.5 p-1 bg-white rounded-xl"
            >
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    نام
                  </label>
                  <input
                    type="text"
                    value={edFn}
                    onChange={(ev) => setEdFn(ev.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#145DB5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    نام خانوادگی
                  </label>
                  <input
                    type="text"
                    value={edLn}
                    onChange={(ev) => setEdLn(ev.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#145DB5]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    شماره تلفن همراه
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={edPh}
                    onChange={(ev) => setEdPh(ev.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#145DB5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    شماره دوم (اختیاری)
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={edSPh}
                    onChange={(ev) => setEdSPh(ev.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#145DB5]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    نوع متقاضی
                  </label>
                  <select
                    value={edCt}
                    onChange={(ev) => setEdCt(ev.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#145DB5]"
                  >
                    <option value="BUYER">متقاضی خرید</option>
                    <option value="TENANT">مستأجر</option>
                    <option value="INVESTOR">سرمایه‌گذار</option>
                    <option value="SELLER">فروشنده</option>
                    <option value="LANDLORD">موجر</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    دمای پیگیری
                  </label>
                  <select
                    value={edTp}
                    onChange={(ev) => setEdTp(ev.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#145DB5]"
                  >
                    <option value="HOT">داغ (فوری)</option>
                    <option value="WARM">گرم (معمولی)</option>
                    <option value="COLD">سرد</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  سقف بودجه اعلامی (تومان)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={edBMax}
                  onChange={(ev) => setEdBMax(ev.target.value)}
                  placeholder="مثلاً 5000000000"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#145DB5] font-mono"
                />
                {edBMax && toWords(edBMax) && (
                  <div className="mt-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                    {toWords(edBMax)}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  حداقل بودجه (تومان)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={edBMin}
                  onChange={(ev) => setEdBMin(ev.target.value)}
                  placeholder="مثلاً 3000000000"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#145DB5] font-mono"
                />
                {edBMin && toWords(edBMin) && (
                  <div className="mt-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                    {toWords(edBMin)}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  مناطق و محله‌های مورد نظر
                </label>
                <input
                  type="text"
                  value={edAr}
                  onChange={(ev) => setEdAr(ev.target.value)}
                  placeholder="مثلاً: عظیمیه، مهرشهر، گوهردشت"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#145DB5]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  یادداشت‌های پرونده
                </label>
                <textarea
                  rows={2}
                  value={edNt}
                  onChange={(ev) => setEdNt(ev.target.value)}
                  placeholder="توضیحات و اولویت‌های متقاضی..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-[#145DB5]"
                />
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={edLdg}
                  className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition disabled:opacity-50"
                >
                  {edLdg ? "در حال ذخیره..." : "ذخیره تغییرات مشخصات متقاضی"}
                </button>
                <button
                  type="button"
                  onClick={() => s("REQUIREMENTS")}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
                >
                  انصراف
                </button>
              </div>
            </form>
          )}

          {o === "REQUIREMENTS" && (
            <div className="space-y-3">
              <div className="bg-[#F7F9FC] border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">سقف بودجه اعلامی:</span>
                  <span className="font-black text-[#145DB5]">
                    {e.budget_max ? formatCompactPrice(e.budget_max) : "تعیین‌نشده"}
                  </span>
                </div>
                {e.preferred_area_text && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">مناطق مورد نظر:</span>
                    <span className="font-bold text-slate-700">
                      {e.preferred_area_text}
                    </span>
                  </div>
                )}
                {e.notes && (
                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-700 block mb-0.5">
                      یادداشت کلی:
                    </span>
                    {e.notes}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => s("DOCUMENTS")}
                className="w-full bg-blue-50/80 hover:bg-blue-100/90 text-blue-900 border border-blue-200/80 p-3 rounded-xl font-bold flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#145DB5] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-blue-950">
                      مدارک و اسناد هویتی متقاضی
                    </p>
                    <p className="text-[10px] text-blue-700 font-normal">
                      کارت شناسایی، مدارک مالی، قراردادها و پیوست‌ها
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-extrabold text-[#145DB5] bg-white px-2.5 py-1 rounded-lg border border-blue-200 shrink-0">
                  <span>مشاهده و ثبت مدارک</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </div>
              </button>

              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#145DB5]" />
                    <h4 className="font-extrabold text-slate-800 text-xs">
                      سطح دسترسی و مشاور مسئول پرونده
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                      ge === "PRIVATE"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-sky-50 text-sky-800 border border-sky-200"
                    }`}
                  >
                    {ge === "PRIVATE" ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <Users className="w-3 h-3" />
                    )}
                    {ge === "PRIVATE" ? "متقاضی اختصاصی" : "عمومی دفتر"}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    دسترسی به پرونده متقاضی:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={
                        Oe ||
                        (!isManager &&
                          e.assigned_agent_id !== currentUser?.id &&
                          e.created_by_user_id !== currentUser?.id)
                      }
                      onClick={() => Pe("AGENCY")}
                      className={`p-2 rounded-lg border text-right transition ${
                        ge === "AGENCY"
                          ? "bg-blue-50 border-[#145DB5] text-[#145DB5]"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>عمومی دفتر</span>
                        {ge === "AGENCY" && (
                          <Check className="w-3 h-3 text-[#145DB5]" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        مشاوران مجاز این دفتر نیز می‌توانند متقاضی را ببینند.
                      </p>
                    </button>
                    <button
                      type="button"
                      disabled={
                        Oe ||
                        (!isManager &&
                          e.assigned_agent_id !== currentUser?.id &&
                          e.created_by_user_id !== currentUser?.id)
                      }
                      onClick={() => Pe("PRIVATE")}
                      className={`p-2 rounded-lg border text-right transition ${
                        ge === "PRIVATE"
                          ? "bg-amber-50 border-amber-500 text-amber-800"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>متقاضی اختصاصی</span>
                        {ge === "PRIVATE" && (
                          <Check className="w-3 h-3 text-amber-600" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        فایل برای مشاور مسئول و مدیریت دفتر قابل مشاهده است.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="bg-[#F7F9FC] border border-slate-200 rounded-lg p-2.5 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">ثبت‌کننده اولیه:</span>
                      <span className="font-bold text-slate-800">
                        {e.created_by_name || "مشاور اولیه"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">مشاور مسئول فعلی:</span>
                      <span className="font-bold text-[#145DB5]">
                        {e.assigned_agent_name || "مشخص‌نشده"}
                      </span>
                    </div>
                  </div>
                  {isManager && (
                    <div className="pt-2 border-t border-slate-200/80 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-700">
                        واگذاری متقاضی به مشاور دیگر (ویژه مدیریت دفتر):
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={Ce}
                          onChange={(ev) => Te(ev.target.value)}
                          className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#145DB5]"
                        >
                          <option value="">انتخاب مشاور مقصد...</option>
                          {Ee.map((ag) => (
                            <option key={ag.id} value={ag.id}>
                              {ag.display_name} (
                              {ag.role_code === "BRANCH_MANAGER" ? "مدیریت" : "مشاور"})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!Ce || Ce === ve || Ae}
                          onClick={Fe}
                          className="px-3 py-2 bg-[#145DB5] text-white text-xs font-bold rounded-lg hover:bg-[#0F4383] disabled:bg-slate-200 disabled:text-slate-400 transition"
                        >
                          {Ae ? "در حال واگذاری..." : "واگذاری پرونده"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <h4 className="font-extrabold text-slate-800">
                  شرایط و جزئیات دقیق درخواستی:
                </h4>
                <button
                  onClick={() => N(true)}
                  className="flex items-center gap-1 text-xs font-bold text-[#145DB5] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت شرایط جدید</span>
                </button>
              </div>

              {c.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Funnel className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    هیچ درخواست مشخصی ثبت نشده است
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    با ثبت حداقل متراژ و بودجه، سامانه بهترین فایل‌های موجود را پیشنهاد می‌دهد.
                  </p>
                  <button
                    onClick={() => N(true)}
                    className="mt-3 bg-[#145DB5] text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                  >
                    ثبت مشخصات ملک درخواستی
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {c.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {req.listing_type === "SALE" ? "خرید" : "رهن و اجاره"}{" "}
                          {req.property_type === "APARTMENT"
                            ? "آپارتمان"
                            : req.property_type === "VILLA"
                            ? "ویلایی"
                            : req.property_type}
                        </span>
                        <span className="text-[11px] font-black text-[#145DB5]">
                          تا {formatCompactPrice(req.max_budget)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded-lg">
                        <div>
                          <span className="text-slate-500">متراژ: </span>
                          <span className="font-bold text-slate-800">
                            {req.min_area ? `از ${req.min_area} متر` : "بدون حداقل"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">امکانات: </span>
                          <span className="font-bold text-slate-800">
                            {[
                              req.needs_parking ? "پارکینگ" : null,
                              req.needs_elevator ? "آسانسور" : null,
                            ]
                              .filter(Boolean)
                              .join("، ") || "معمولی"}
                          </span>
                        </div>
                      </div>
                      {req.notes && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg">
                          {req.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {M && (
                <div className="bg-white border-2 border-[#145DB5] rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-[#145DB5]">
                      ثبت جزئیات نیازمندی جدید:
                    </h5>
                    <button
                      onClick={() => N(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={ze} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">
                          نوع معامله:
                        </label>
                        <select
                          value={reqListingType}
                          onChange={(ev) => setReqListingType(ev.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                        >
                          <option value="SALE">خرید (فروش)</option>
                          <option value="RENT">رهن و اجاره</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">
                          نوع ملک:
                        </label>
                        <select
                          value={reqPropType}
                          onChange={(ev) => setReqPropType(ev.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                        >
                          <option value="APARTMENT">آپارتمان</option>
                          <option value="VILLA">ویلایی</option>
                          <option value="OFFICE">اداری</option>
                          <option value="COMMERCIAL">تجاری</option>
                          <option value="LAND">زمین</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">
                          حداکثر بودجه (تومان):
                        </label>
                        <input
                          type="number"
                          value={reqMaxBudget}
                          onChange={(ev) =>
                            setReqMaxBudget(ev.target.value ? Number(ev.target.value) : "")
                          }
                          placeholder="مثلا: 4500000000"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                        />
                        {reqMaxBudget && toWords(reqMaxBudget) && (
                          <p className="mt-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                            {toWords(reqMaxBudget)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">
                          حداقل متراژ (متر):
                        </label>
                        <input
                          type="number"
                          value={reqMinArea}
                          onChange={(ev) =>
                            setReqMinArea(ev.target.value ? Number(ev.target.value) : "")
                          }
                          placeholder="مثلا: 100"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={reqParking}
                          onChange={(ev) => setReqParking(ev.target.checked)}
                          className="rounded text-[#145DB5]"
                        />
                        <span>حتما پارکینگ داشته باشد</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={reqElevator}
                          onChange={(ev) => setReqElevator(ev.target.checked)}
                          className="rounded text-[#145DB5]"
                        />
                        <span>حتما آسانسور داشته باشد</span>
                      </label>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={reqNotes}
                        onChange={(ev) => setReqNotes(ev.target.value)}
                        placeholder="یادداشت‌های خاص متقاضی (مثلا: نورگیر جنوبی، سند تک‌برگ)..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => N(false)}
                        className="px-3 py-1.5 text-slate-600 text-xs font-bold"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#145DB5] text-white rounded-lg text-xs font-bold hover:bg-[#0F4383]"
                      >
                        ذخیره شرایط
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {o === "TIMELINE" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-800">
                  تاریخچه تعاملات و ارتباطات:
                </h4>
                <button
                  onClick={() => setShowAddInteraction(true)}
                  className="flex items-center gap-1 bg-[#145DB5] text-white px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-[#0F4383]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت تعامل جدید</span>
                </button>
              </div>

              {showAddInteraction && (
                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#145DB5] text-xs">
                      ثبت گزارش ارتباط با مشتری:
                    </span>
                    <button
                      onClick={() => setShowAddInteraction(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={Re} className="space-y-2">
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: "CALL", label: "تماس تلفنی" },
                        { id: "VISIT", label: "بازدید حضوری" },
                        { id: "MEETING", label: "جلسه در آژانس" },
                        { id: "NOTE", label: "یادداشت داخلی" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => D(item.id)}
                          className={`p-1.5 rounded-lg text-[10px] font-bold border transition ${
                            E === item.id
                              ? "bg-[#145DB5] text-white border-[#145DB5]"
                              : "bg-white text-slate-700 border-slate-200"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      required={true}
                      value={O}
                      onChange={(ev) => k(ev.target.value)}
                      placeholder="عنوان تعامل (مثال: تماس در خصوص فایل گیشا)"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-[#172033]"
                    />
                    <textarea
                      rows={2}
                      value={A}
                      onChange={(ev) => j(ev.target.value)}
                      placeholder="توضیحات و نتیجه مکالمه یا بازدید..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-[#172033]"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddInteraction(false)}
                        className="px-3 py-1 text-slate-500 font-bold"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-[#145DB5] text-white rounded-lg font-bold hover:bg-[#0F4383]"
                      >
                        ثبت در سوابق
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {u.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    هنوز تعاملی ثبت نشده است
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    ارسال فایل ملکی یا ثبت تماس، به‌صورت خودکار در این تایم‌لاین ثبت خواهد شد.
                  </p>
                </div>
              ) : (
                <div className="relative pr-4 space-y-3 before:absolute before:right-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {u.map((item) => (
                    <div key={item.id} className="relative flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-white border-2 border-[#145DB5] flex items-center justify-center shrink-0 z-10 -mr-[11px]">
                        {We(item.interaction_type)}
                      </div>
                      <div className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-800 text-xs">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.occurred_at).toLocaleTimeString("fa-IR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        <span className="text-[10px] text-slate-400 block pt-0.5">
                          {new Date(item.occurred_at).toLocaleDateString("fa-IR")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {o === "MATCHES" && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span>تطبیق بلادرنگ فایل‌های ملکی با نیازمندی این متقاضی</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  با فشردن دکمه «ارسال به مشتری»، لینک امن و پیام واتس‌اپ آماده شده و سابقه آن به‌صورت خودکار در تایم‌لاین ثبت می‌شود.
                </p>
              </div>

              {f.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    فایل منطبق پیدا نشد
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    فایل جدیدی با بودجه و شرایط این متقاضی ثبت کنید تا فوراً در این بخش ظاهر گردد.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {f.map(({ property: prop, score, reasons }) => (
                    <div
                      key={prop.id}
                      className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 hover:border-[#145DB5] transition shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-[#145DB5] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            کد {prop.code}
                          </span>
                          <span className="font-extrabold text-[#172033] text-xs">
                            {prop.title}
                          </span>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                          {score}٪ همخوانی
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">
                          {prop.listing_type === "SALE"
                            ? formatCompactPrice(prop.price_total)
                            : `${formatCompactPrice(
                                prop.deposit_amount
                              )} / ${formatCompactPrice(prop.rent_amount)}`}
                        </span>
                        <span className="text-slate-500">
                          {prop.area_sqm} متر •{" "}
                          {prop.address.neighborhood || prop.address.city}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {reasons.map((reason: string, idx: number) => (
                          <span
                            key={idx}
                            className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded"
                          >
                            ✓ {reason}
                          </span>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          ثبت اتوماتیک در سوابق
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              v(prop);
                              x(true);
                            }}
                            className="text-xs font-bold text-[#145DB5] hover:underline px-2 py-1"
                          >
                            تنظیمات ارسال
                          </button>
                          <button
                            onClick={() => Be(prop)}
                            className="flex items-center gap-1 bg-[#145DB5] text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-[#0F4383] transition"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>ارسال به این مشتری</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {o === "TASKS" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-800">
                  پیگیری‌های اختصاصی متقاضی:
                </h4>
                <button
                  onClick={() => a?.(e)}
                  className="flex items-center gap-1 bg-[#145DB5] text-white px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-[#0F4383]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت پیگیری جدید</span>
                </button>
              </div>
              {m.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    پیگیری فعالی تنظیم نشده است
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    زمان تماس بعدی یا بازدید را تنظیم کنید تا سامانه در صفحه اول به شما یادآوری نماید.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {m.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-xl border space-y-1 ${
                        task.status === "COMPLETED"
                          ? "bg-slate-50 border-slate-200 opacity-75"
                          : "bg-white border-blue-200 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-800 text-xs">
                          {task.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            task.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {task.status === "COMPLETED" ? "انجام شد" : "در انتظار اقدام"}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-[11px] text-slate-600">{task.description}</p>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>
                          موعد: {new Date(task.due_at).toLocaleDateString("fa-IR")}
                        </span>
                        {task.property_code && <span>ملک کد {task.property_code}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {o === "DOCUMENTS" && (
            <EntityDocumentsPanel entityType="customer" entityId={e.id} />
          )}
        </div>

        <div className="p-3.5 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => a?.(e)}
              className="flex items-center gap-1 bg-slate-100 text-slate-800 px-3 py-2 rounded-xl font-bold text-xs hover:bg-slate-200 transition"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>تنظیم پیگیری</span>
            </button>
          </div>
          <button
            onClick={r}
            className="px-5 py-2 bg-[#145DB5] text-white rounded-xl font-bold text-xs hover:bg-[#0F4383] transition"
          >
            بستن پرونده
          </button>
        </div>
      </div>

      {y && g && (
        <PropertyShareModal
          property={g}
          customers={[e]}
          isOpen={y}
          onClose={() => {
            x(false);
            v(null);
          }}
          onShareComplete={() => {
            Me("فایل با موفقیت ارسال و در تایم‌لاین ثبت شد.");
            Le();
            i();
          }}
        />
      )}
    </div>
  );
};
