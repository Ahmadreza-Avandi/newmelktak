import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  Building,
  CircleCheck,
  DollarSign,
  House,
  Lock,
  LockOpen,
  Pen,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { api } from "../services/apiClient.ts";

export interface PlatformAdminViewProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const PlatformAdminView: React.FC<PlatformAdminViewProps> = ({
  onBack,
  showToast,
}) => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);

  const [agencyCode, setAgencyCode] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [planCode, setPlanCode] = useState("ENTERPRISE_PRO");
  const [trialDays, setTrialDays] = useState(30);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [subPlanCode, setSubPlanCode] = useState("ENTERPRISE_PRO");
  const [maxBranches, setMaxBranches] = useState(5);
  const [maxAgents, setMaxAgents] = useState(20);
  const [extendDays, setExtendDays] = useState(30);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, tenantsRes] = await Promise.all([
        api.get("/api/v1/platform/metrics"),
        api.get("/api/v1/platform/tenants"),
      ]);
      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
      if (tenantsRes.success && tenantsRes.data) {
        setTenants(tenantsRes.data);
      }
    } catch (err) {
      console.error("Fetch platform data error:", err);
      showToast("خطا در دریافت اطلاعات پلتفرم.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTenant = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!agencyCode.trim() || !agencyName.trim()) {
      showToast("کد آژانس و نام دفتر املاک الزامی است.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/api/v1/platform/tenants", {
        agency_code: agencyCode.trim().toUpperCase(),
        name: agencyName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        plan_code: planCode,
        trial_days: Number(trialDays),
        admin_username: adminUsername.trim() || "admin",
        admin_password: adminPassword,
      });
      if (res.success) {
        showToast(res.message || "دفتر املاک جدید با موفقیت ایجاد شد.");
        setCreateOpen(false);
        setAgencyCode("");
        setAgencyName("");
        setPhone("");
        setEmail("");
        setAddress("");
        setAdminUsername("");
        setAdminPassword("");
        loadData();
      } else {
        showToast(res.error?.message || "خطا در ایجاد دفتر املاک.");
      }
    } catch (err) {
      console.error("Create tenant error:", err);
      showToast("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (tenant: any) => {
    const nextStatus = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const confirmMsg =
      nextStatus === "SUSPENDED"
        ? `آیا از تعلیق دسترسی دفتر املاک «${tenant.name}» اطمینان دارید؟ مشاوران این دفتر قادر به ثبت اطلاعات نخواهند بود.`
        : `آیا مایل به فعال‌سازی مجدد دفتر املاک «${tenant.name}» هستید؟`;
    if (!window.confirm(confirmMsg)) return;
    try {
      const res = await api.patch(`/api/v1/platform/tenants/${tenant.id}/status`, {
        status: nextStatus,
      });
      if (res.success) {
        showToast(res.message || "وضعیت دفتر با موفقیت تغییر کرد.");
        loadData();
      } else {
        showToast(res.error?.message || "خطا در تغییر وضعیت دفتر.");
      }
    } catch (err) {
      console.error("Toggle status error:", err);
      showToast("خطا در اعمال تغییر وضعیت.");
    }
  };

  const openSubModal = (tenant: any) => {
    setEditingTenant(tenant);
    setSubPlanCode(tenant.plan_code || "ENTERPRISE_PRO");
    setMaxBranches(tenant.max_branches || 5);
    setMaxAgents(tenant.max_agents || 20);
    setExtendDays(30);
    setSubModalOpen(true);
  };

  const handleSaveSubscription = async () => {
    if (!editingTenant || saving) return;
    setSaving(true);
    try {
      const baseDate = editingTenant.subscription_expires_at
        ? new Date(editingTenant.subscription_expires_at)
        : new Date();
      const startTime =
        baseDate > new Date() ? baseDate.getTime() : new Date().getTime();
      const nextExpiry = new Date(
        startTime + extendDays * 864e5
      ).toISOString();
      const res = await api.patch(
        `/api/v1/platform/tenants/${editingTenant.id}/subscription`,
        {
          plan_code: subPlanCode,
          max_branches: maxBranches,
          max_agents: maxAgents,
          subscription_expires_at: nextExpiry,
          subscription_status: "ACTIVE",
        }
      );
      if (res.success) {
        showToast("مشخصات اشتراک با موفقیت بروزرسانی شد.");
        setSubModalOpen(false);
        loadData();
      } else {
        showToast(res.error?.message || "خطا در بروزرسانی اشتراک.");
      }
    } catch (err) {
      console.error("Save sub error:", err);
      showToast("خطا در ذخیره تغییرات اشتراک.");
    } finally {
      setSaving(false);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    if (
      (statusFilter !== "ALL" && t.status !== statusFilter) ||
      (planFilter !== "ALL" && t.plan_code !== planFilter)
    ) {
      return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (
        !(
          t.name.toLowerCase().includes(q) ||
          t.agency_code.toLowerCase().includes(q) ||
          (t.phone && t.phone.includes(q)) ||
          (t.email && t.email.toLowerCase().includes(q))
        )
      ) {
        return false;
      }
    }
    return true;
  });

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
              <Server className="w-4 h-4 text-[#145DB5]" />
              پنل مدیریت کلان SaaS پلتفرم
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              نظارت بر تمامی آژانس‌ها، پلن‌ها و ترافیک سراسری پلتفرم
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCreateOpen(true)}
            className="px-2.5 py-1.5 bg-[#145DB5] hover:bg-[#0E4990] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>آژانس جدید</span>
          </button>
          <button
            onClick={loadData}
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
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>کل دفاتر املاک</span>
            <Building className="w-4 h-4 text-[#145DB5]" />
          </div>
          <div className="text-lg font-black text-[#172033] mt-1">
            {metrics?.total_tenants || 0}
            <span className="text-[10px] text-emerald-600 font-bold mr-1.5">
              ({metrics?.active_tenants || 0} فعال)
            </span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>کل شعب و مشاوران</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-[#172033] mt-1">
            {metrics?.total_branches || 0} شعبه
            <span className="text-[10px] text-slate-400 font-bold mr-1.5">
              • {metrics?.total_agents || 0} مشاور
            </span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>کل فایل‌های ملکی</span>
            <House className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-black text-[#172033] mt-1">
            {metrics?.total_properties || 0}
            <span className="text-[10px] text-slate-400 font-bold mr-1.5">
              • {metrics?.total_customers || 0} متقاضی
            </span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>حجم معاملات پلتفرم</span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-black text-[#172033] mt-1">
            {metrics?.total_transactions || 0} قرارداد
            <div className="text-[10px] text-purple-700 font-bold">
              {Math.round((metrics?.total_transaction_volume || 0) / 1e9)} میلیارد
              تومان
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            placeholder="جستجو بر اساس نام دفتر، کد آژانس یا تلفن..."
            className="w-full bg-slate-50 pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#145DB5]"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(ev) => setStatusFilter(ev.target.value)}
            className="bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-xs focus:outline-hidden"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="ACTIVE">فعال</option>
            <option value="SUSPENDED">معلق شده</option>
          </select>
          <select
            value={planFilter}
            onChange={(ev) => setPlanFilter(ev.target.value)}
            className="bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-xs focus:outline-hidden"
          >
            <option value="ALL">همه پلن‌ها</option>
            <option value="ENTERPRISE_PRO">سازمانی پیشرفته</option>
            <option value="PROFESSIONAL">حرفه‌ای</option>
            <option value="STARTER">پایه</option>
          </select>
        </div>
      </div>

      <div className="space-y-2.5">
        {filteredTenants.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 font-medium">
            هیچ دفتر املاکی با این مشخصات یافت نشد.
          </div>
        ) : (
          filteredTenants.map((tenant) => {
            const isSuspended = tenant.status === "SUSPENDED";
            const isExpired = tenant.days_remaining <= 0;
            return (
              <div
                key={tenant.id}
                className={`bg-white p-3.5 rounded-2xl border shadow-2xs transition-all ${
                  isSuspended
                    ? "border-rose-200 bg-rose-50/20"
                    : "border-[#E2E8F0] hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#172033]">
                        {tenant.name}
                      </span>
                      <span className="text-[10px] font-bold text-[#145DB5] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                        {tenant.agency_code}
                      </span>
                      {isSuspended && (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                          معلق
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {tenant.phone || "بدون شماره"} •{" "}
                      {tenant.address || "آدرس ثبت نشده"}
                    </p>
                  </div>
                  <div className="text-left">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isExpired
                          ? "bg-rose-100 text-rose-700"
                          : tenant.days_remaining <= 7
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isExpired
                        ? "منقضی شده"
                        : `${tenant.days_remaining} روز اعتبار`}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 grid grid-cols-4 gap-1 text-center text-[10px] font-medium text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[9px]">شعب</span>
                    <span className="font-bold text-slate-800">
                      {tenant.branches_count}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">
                      مشاوران
                    </span>
                    <span className="font-bold text-slate-800">
                      {tenant.agents_count}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">
                      املاک
                    </span>
                    <span className="font-bold text-slate-800">
                      {tenant.properties_count}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">
                      معاملات
                    </span>
                    <span className="font-bold text-purple-700">
                      {tenant.transactions_count}
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[10px] text-slate-500">
                    پلن:{" "}
                    <span className="font-bold text-slate-700">
                      {tenant.plan_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openSubModal(tenant)}
                      className="px-2 py-1 text-xs font-bold text-[#145DB5] bg-blue-50/60 hover:bg-blue-100 rounded-lg transition flex items-center gap-1"
                    >
                      <Pen className="w-3 h-3" />
                      <span>تمدید / اشتراک</span>
                    </button>
                    <button
                      onClick={() => handleToggleStatus(tenant)}
                      className={`px-2 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                        isSuspended
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                      }`}
                      title={
                        isSuspended ? "فعال‌سازی مجدد" : "تعلیق دسترسی"
                      }
                    >
                      {isSuspended ? (
                        <LockOpen className="w-3 h-3" />
                      ) : (
                        <Lock className="w-3 h-3" />
                      )}
                      <span>{isSuspended ? "فعال‌سازی" : "تعلیق"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-[#145DB5]" />
                <h3 className="text-sm font-black text-[#172033]">
                  ثبت آژانس املاک جدید در پلتفرم
                </h3>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTenant} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  کد اختصاصی آژانس (لاتین):{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={true}
                  placeholder="مثال: AMLAK_TABRIZ"
                  value={agencyCode}
                  onChange={(ev) =>
                    setAgencyCode(ev.target.value.toUpperCase())
                  }
                  className="w-full bg-slate-50 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#145DB5] font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  نام دفتر املاک: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={true}
                  placeholder="مثال: املاک مهرگان تبریز"
                  value={agencyName}
                  onChange={(ev) => setAgencyName(ev.target.value)}
                  className="w-full bg-slate-50 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#145DB5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    شماره تماس دفتر:
                  </label>
                  <input
                    type="text"
                    placeholder="02188..."
                    value={phone}
                    onChange={(ev) => setPhone(ev.target.value)}
                    className="w-full bg-slate-50 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#145DB5]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    ایمیل رسمی:
                  </label>
                  <input
                    type="email"
                    placeholder="info@..."
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    className="w-full bg-slate-50 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#145DB5]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  آدرس دفتر مرکزی:
                </label>
                <input
                  type="text"
                  placeholder="شهر، خیابان، پلاک..."
                  value={address}
                  onChange={(ev) => setAddress(ev.target.value)}
                  className="w-full bg-slate-50 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#145DB5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    پلن اشتراک:
                  </label>
                  <select
                    value={planCode}
                    onChange={(ev) => setPlanCode(ev.target.value)}
                    className="w-full bg-slate-50 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                  >
                    <option value="ENTERPRISE_PRO">سازمانی نامحدود</option>
                    <option value="PROFESSIONAL">حرفه‌ای (۳ شعبه)</option>
                    <option value="STARTER">پایه (۱ شعبه)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    دوره تست رایگان:
                  </label>
                  <select
                    value={trialDays}
                    onChange={(ev) => setTrialDays(Number(ev.target.value))}
                    className="w-full bg-slate-50 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                  >
                    <option value={14}>۱۴ روز آزمایشی</option>
                    <option value={30}>۳۰ روز (یک ماه)</option>
                    <option value={90}>۹۰ روز (سه ماه)</option>
                    <option value={365}>۳۶۵ روز (یکسال کامل)</option>
                  </select>
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-700 block text-[11px]">
                  مشخصات اولین مدیر آژانس:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required={true}
                    placeholder="نام کاربری مدیر"
                    value={adminUsername}
                    onChange={(ev) => setAdminUsername(ev.target.value)}
                    className="bg-white px-2.5 py-1.5 text-xs rounded-lg border border-slate-200"
                  />
                  <input
                    type="password"
                    required={true}
                    minLength={6}
                    placeholder="رمز عبور اولیه"
                    value={adminPassword}
                    onChange={(ev) => setAdminPassword(ev.target.value)}
                    className="bg-white px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-2 py-2 rounded-xl bg-[#145DB5] hover:bg-[#0E4990] text-white text-xs font-black shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      در حال ایجاد...
                    </>
                  ) : (
                    <>
                      <CircleCheck className="w-3.5 h-3.5" />
                      ثبت و راه‌اندازی دفتر
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {subModalOpen && editingTenant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#145DB5]" />
                <h3 className="text-sm font-black text-[#172033]">
                  تنظیم اشتراک: {editingTenant.name}
                </h3>
              </div>
              <button
                onClick={() => setSubModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  پلن اشتراک:
                </label>
                <select
                  value={subPlanCode}
                  onChange={(ev) => {
                    const val = ev.target.value;
                    setSubPlanCode(val);
                    if (val === "STARTER") {
                      setMaxBranches(1);
                      setMaxAgents(5);
                    } else if (val === "PROFESSIONAL") {
                      setMaxBranches(3);
                      setMaxAgents(15);
                    } else {
                      setMaxBranches(10);
                      setMaxAgents(50);
                    }
                  }}
                  className="w-full bg-slate-50 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                >
                  <option value="ENTERPRISE_PRO">
                    سازمانی پیشرفته (ENTERPRISE_PRO)
                  </option>
                  <option value="PROFESSIONAL">حرفه‌ای (PROFESSIONAL)</option>
                  <option value="STARTER">پایه (STARTER)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    سقف شعب:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxBranches}
                    onChange={(ev) => setMaxBranches(Number(ev.target.value))}
                    className="w-full bg-slate-50 px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    سقف مشاوران:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxAgents}
                    onChange={(ev) => setMaxAgents(Number(ev.target.value))}
                    className="w-full bg-slate-50 px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  تمدید اعتبار به میزان:
                </label>
                <select
                  value={extendDays}
                  onChange={(ev) => setExtendDays(Number(ev.target.value))}
                  className="w-full bg-slate-50 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                >
                  <option value={30}>+ ۳۰ روز (یک ماه اضافه)</option>
                  <option value={90}>+ ۹۰ روز (سه ماه اضافه)</option>
                  <option value={180}>+ ۱۸۰ روز (شش ماه اضافه)</option>
                  <option value={365}>+ ۳۶۵ روز (یکسال کامل)</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSaveSubscription}
                  disabled={saving}
                  className="flex-2 py-2 rounded-xl bg-[#145DB5] hover:bg-[#0E4990] text-white text-xs font-black shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {saving ? "در حال ذخیره..." : "ذخیره و تمدید اشتراک"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
