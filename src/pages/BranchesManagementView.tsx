import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  Building,
  House,
  MapPin,
  Pen,
  Phone,
  Plus,
  RefreshCw,
  Star,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { api } from "../services/apiClient.ts";
import { useOfficeAdmin } from "../context/AuthContext.tsx";

export interface BranchesManagementViewProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const BranchesManagementView: React.FC<BranchesManagementViewProps> = ({
  onBack,
  showToast,
}) => {
  const canManageBranches = useOfficeAdmin();
  const [branches, setBranches] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newManagerId, setNewManagerId] = useState("");
  const [newIsMain, setNewIsMain] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editManagerId, setEditManagerId] = useState("");
  const [editIsMain, setEditIsMain] = useState(false);
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deactivatingBranch, setDeactivatingBranch] = useState<any>(null);
  const [targetBranchId, setTargetBranchId] = useState("");
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [branchesRes, agentsRes] = await Promise.all([
        api.get("/api/v1/agency/branches"),
        api.get("/api/v1/agency/agents"),
      ]);
      if (branchesRes.success && branchesRes.data) {
        setBranches(branchesRes.data);
      }
      if (agentsRes.success && agentsRes.data) {
        setAgents(agentsRes.data);
      }
    } catch {
      showToast("خطا در بارگذاری اطلاعات شعب و کاربران.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetCreateForm = () => {
    setNewName("");
    setNewCode("");
    setNewPhone("");
    setNewAddress("");
    setNewManagerId("");
    setNewIsMain(false);
    setCreateError(null);
  };

  const handleCreateSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!newName.trim() || !newCode.trim()) {
      setCreateError("نام و کد شعبه الزامی است.");
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const res = await api.post("/api/v1/agency/branches", {
        name: newName.trim(),
        branch_code: newCode.trim().toUpperCase(),
        phone: newPhone.trim() || undefined,
        address: newAddress.trim() || undefined,
        manager_user_id: newManagerId || undefined,
        is_main: newIsMain,
      });
      if (res.success && res.data) {
        showToast(res.message || `شعبه «${res.data.name}» با موفقیت افزوده شد.`);
        setCreateOpen(false);
        resetCreateForm();
        loadData();
      } else {
        setCreateError(res.error?.message || "خطا در ثبت شعبه.");
      }
    } catch {
      setCreateError("خطای ارتباط با سرور.");
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (branch: any) => {
    setEditingBranch(branch);
    setEditName(branch.name);
    setEditCode(branch.branch_code);
    setEditPhone(branch.phone || "");
    setEditAddress(branch.address || "");
    setEditManagerId(branch.manager_user_id || "");
    setEditIsMain(branch.is_main);
    setEditStatus(branch.status);
    setEditError(null);
  };

  const handleEditSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!editingBranch) return;
    if (!editName.trim() || !editCode.trim()) {
      setEditError("نام و کد شعبه الزامی است.");
      return;
    }
    setEditError(null);
    setSavingEdit(true);
    try {
      const res = await api.patch(`/api/v1/agency/branches/${editingBranch.id}`, {
        name: editName.trim(),
        branch_code: editCode.trim().toUpperCase(),
        phone: editPhone.trim() || null,
        address: editAddress.trim() || null,
        manager_user_id: editManagerId || null,
        is_main: editIsMain,
        status: editStatus,
      });
      if (res.success && res.data) {
        showToast(res.message || `شعبه «${res.data.name}» با موفقیت ویرایش شد.`);
        setEditingBranch(null);
        loadData();
      } else {
        setEditError(res.error?.message || "خطا در ویرایش شعبه.");
      }
    } catch {
      setEditError("خطای ارتباط با سرور.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeactivateSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!deactivatingBranch) return;
    setDeactivateError(null);
    setDeactivating(true);
    try {
      const res = await api.post(
        `/api/v1/agency/branches/${deactivatingBranch.id}/deactivate`,
        {
          target_branch_id: targetBranchId || undefined,
        }
      );
      if (res.success) {
        showToast(
          res.message || `شعبه «${deactivatingBranch.name}» با موفقیت غیرفعال شد.`
        );
        setDeactivatingBranch(null);
        setTargetBranchId("");
        loadData();
      } else {
        setDeactivateError(res.error?.message || "خطا در غیرفعال‌سازی شعبه.");
      }
    } catch {
      setDeactivateError("خطای ارتباط با سرور.");
    } finally {
      setDeactivating(false);
    }
  };

  const totalMembers = branches.reduce(
    (acc, b) => acc + (b.members_count || 0),
    0
  );
  const totalProperties = branches.reduce(
    (acc, b) => acc + (b.properties_count || 0),
    0
  );
  const mainBranch = branches.find((b) => b.is_main);

  return (
    <div
      className="space-y-4 pb-12 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="بازگشت به منو"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <Building className="w-5 h-5 text-[#145DB5]" />
              مدیریت شعب دفتر املاک
            </h1>
            <p className="text-[11px] text-slate-500">
              پیکربندی ساختار شعب، تخصیص مشاوران و تعریف شعبه اصلی دفتر
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 active:scale-95 transition"
            title="بروزرسانی لیست"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin text-[#145DB5]" : ""}`}
            />
          </button>
          {canManageBranches ? (
            <button
              onClick={() => {
                resetCreateForm();
                setCreateOpen(true);
              }}
              className="flex items-center gap-1.5 bg-[#145DB5] hover:bg-[#114d96] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>شعبه جدید</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500">تعداد کل شعب</span>
          <div className="text-lg font-black text-slate-800 mt-0.5">
            {branches.length} شعبه
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {branches.filter((b) => b.status === "ACTIVE").length} فعال
          </span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500">شعبه اصلی دفتر</span>
          <div className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">
            {mainBranch?.name || "تعریف نشده"}
          </div>
          <span className="text-[10px] text-blue-600 font-medium">
            کد: {mainBranch?.branch_code || "---"}
          </span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500">مجموع مشاوران</span>
          <div className="text-lg font-black text-slate-800 mt-0.5">
            {totalMembers} نفر
          </div>
          <span className="text-[10px] text-slate-400">توزیع در تمام شعب</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500">فایل‌های فعال</span>
          <div className="text-lg font-black text-slate-800 mt-0.5">
            {totalProperties} ملک
          </div>
          <span className="text-[10px] text-slate-400">
            تحت پوشش شبکه دفتر
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {loading && branches.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin text-[#145DB5] mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              در حال دریافت لیست شعب دفتر...
            </p>
          </div>
        ) : branches.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
            <Building className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">
              هیچ شعبه‌ای برای این دفتر ثبت نشده است.
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              با فشردن دکمه «شعبه جدید» اولین شعبه را اضافه کنید.
            </p>
          </div>
        ) : (
          branches.map((branch) => {
            const isActive = branch.status === "ACTIVE";
            return (
              <div
                key={branch.id}
                className={`bg-white rounded-xl border p-4 shadow-2xs transition relative overflow-hidden ${
                  branch.is_main
                    ? "border-blue-300 ring-1 ring-blue-100"
                    : isActive
                    ? "border-slate-200"
                    : "border-slate-200 opacity-70 bg-slate-50/70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        branch.is_main
                          ? "bg-blue-600 text-white"
                          : isActive
                          ? "bg-slate-100 text-slate-700"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-bold text-slate-900">
                          {branch.name}
                        </h2>
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {branch.branch_code}
                        </span>
                        {branch.is_main && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <Star className="w-3 h-3 fill-blue-600 text-blue-600" />
                            شعبه اصلی
                          </span>
                        )}
                        {!isActive && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            غیرفعال
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>مدیر شعبه:</span>
                        <span className="font-semibold text-slate-700">
                          {branch.manager_name || "تعیین نشده"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {canManageBranches ? (
                      <button
                        onClick={() => openEditModal(branch)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="ویرایش مشخصات شعبه"
                      >
                        <Pen className="w-4 h-4" />
                      </button>
                    ) : null}
                    {!branch.is_main &&
                      isActive &&
                      (canManageBranches ? (
                        <button
                          onClick={() => {
                            setDeactivatingBranch(branch);
                            setTargetBranchId(
                              branches.find(
                                (b) =>
                                  b.id !== branch.id && b.status === "ACTIVE"
                              )?.id || ""
                            );
                            setDeactivateError(null);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="غیرفعال‌سازی شعبه و انتقال پرونده‌ها"
                        >
                          <TriangleAlert className="w-4 h-4" />
                        </button>
                      ) : null)}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{branch.members_count || 0} مشاور فعال</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <House className="w-3.5 h-3.5 text-slate-400" />
                    <span>{branch.properties_count || 0} فایل ملکی</span>
                  </div>
                  {branch.phone && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span dir="ltr">{branch.phone}</span>
                    </div>
                  )}
                  {branch.address && (
                    <div className="flex items-center gap-1.5 text-slate-600 col-span-2 sm:col-span-1 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{branch.address}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[#145DB5]" />
                تعریف شعبه جدید
              </h2>
              <button
                onClick={() => setCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {createError && (
              <div className="my-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-1.5">
                <TriangleAlert className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}
            <form onSubmit={handleCreateSubmit} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  نام شعبه <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={true}
                  placeholder="مثال: شعبه شمال (ونک)"
                  value={newName}
                  onChange={(ev) => setNewName(ev.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-[#145DB5] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  کد یکتا شعبه (لاتین) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={true}
                  dir="ltr"
                  placeholder="NORTH یا BR-02"
                  value={newCode}
                  onChange={(ev) => setNewCode(ev.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono focus:border-[#145DB5] focus:outline-hidden text-left"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تلفن تماس شعبه
                </label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="02188889900"
                  value={newPhone}
                  onChange={(ev) => setNewPhone(ev.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-[#145DB5] focus:outline-hidden text-left"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  آدرس شعبه
                </label>
                <input
                  type="text"
                  placeholder="تهران، میدان ونک، برج نگار، طبقه ۵"
                  value={newAddress}
                  onChange={(ev) => setNewAddress(ev.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-[#145DB5] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  مدیر شعبه (اختیاری)
                </label>
                <select
                  value={newManagerId}
                  onChange={(ev) => setNewManagerId(ev.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-[#145DB5] focus:outline-hidden bg-white"
                >
                  <option value="">بدون مدیر (تعیین در آینده)</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.display_name} ({agent.username})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="create_is_main"
                  checked={newIsMain}
                  onChange={(ev) => setNewIsMain(ev.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label
                  htmlFor="create_is_main"
                  className="text-xs text-slate-700 font-medium"
                >
                  تعیین این شعبه به عنوان شعبه اصلی دفتر املاک
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-bold bg-[#145DB5] hover:bg-[#114d96] text-white rounded-xl shadow-xs disabled:opacity-50 transition"
                >
                  {creating ? "در حال ثبت..." : "ثبت شعبه"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingBranch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Pen className="w-4 h-4 text-blue-600" />
                ویرایش مشخصات شعبه «{editingBranch.name}»
              </h2>
              <button
                onClick={() => setEditingBranch(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {editError && (
              <div className="my-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-1.5">
                <TriangleAlert className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}
            <form onSubmit={handleEditSubmit} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  نام شعبه <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={true}
                  value={editName}
                  onChange={(ev) => setEditName(ev.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  کد شعبه (لاتین) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={true}
                  dir="ltr"
                  value={editCode}
                  onChange={(ev) => setEditCode(ev.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono focus:border-blue-600 focus:outline-hidden text-left"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تلفن تماس شعبه
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={editPhone}
                  onChange={(ev) => setEditPhone(ev.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden text-left"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  آدرس شعبه
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(ev) => setEditAddress(ev.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  مدیر شعبه
                </label>
                <select
                  value={editManagerId}
                  onChange={(ev) => setEditManagerId(ev.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden bg-white"
                >
                  <option value="">بدون مدیر</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.display_name} ({agent.username})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsMain}
                    onChange={(ev) => setEditIsMain(ev.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    شعبه اصلی دفتر
                  </span>
                </label>
                {!editingBranch.is_main && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">وضعیت:</span>
                    <select
                      value={editStatus}
                      onChange={(ev) => setEditStatus(ev.target.value)}
                      className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="ACTIVE">فعال</option>
                      <option value="INACTIVE">غیرفعال</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-50 transition"
                >
                  {savingEdit ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deactivatingBranch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
                <TriangleAlert className="w-4 h-4 text-rose-600" />
                غیرفعال‌سازی شعبه «{deactivatingBranch.name}»
              </h2>
              <button
                onClick={() => setDeactivatingBranch(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {deactivateError && (
              <div className="my-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-1.5">
                <TriangleAlert className="w-4 h-4 shrink-0" />
                <span>{deactivateError}</span>
              </div>
            )}
            <form
              onSubmit={handleDeactivateSubmit}
              className="space-y-3.5 mt-3"
            >
              <p className="text-xs text-slate-600 leading-relaxed">
                با غیرفعال شدن این شعبه، دسترسی‌های اختصاصی آن معلق خواهد شد.
                می‌توانید پرونده‌ها و مشاوران فعلی را به یک شعبه فعال دیگر
                منتقل نمایید.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
                  انتقال کلیه پرونده‌ها و مشاوران به شعبه:
                </label>
                <select
                  value={targetBranchId}
                  onChange={(ev) => setTargetBranchId(ev.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-rose-600 focus:outline-hidden bg-white"
                >
                  <option value="">
                    عدم انتقال خودکار (نگهداری در آرشیو شعبه)
                  </option>
                  {branches
                    .filter(
                      (b) =>
                        b.id !== deactivatingBranch.id &&
                        b.status === "ACTIVE"
                    )
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.branch_code}){" "}
                        {b.is_main ? "— شعبه اصلی" : ""}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  در صورت انتخاب، همه املاک، مشتریان، پیگیری‌ها و مشاوران به
                  شعبه مقصد منتقل می‌شوند.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeactivatingBranch(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={deactivating}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs disabled:opacity-50 transition"
                >
                  {deactivating ? "در حال پردازش..." : "تأیید و غیرفعال‌سازی"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
