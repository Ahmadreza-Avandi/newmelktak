import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  ChevronLeft,
  CircleCheck,
  CircleX,
  Eye,
  EyeOff,
  FolderSync,
  KeyRound,
  Phone,
  Search,
  TriangleAlert,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { api } from "../services/apiClient.ts";
import { useAuth } from "../context/AuthContext.tsx";

export interface AgentsManagementViewProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const AgentsManagementView: React.FC<AgentsManagementViewProps> = ({
  onBack,
  showToast,
}) => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [workload, setWorkload] = useState<any>(null);
  const [workloadLoading, setWorkloadLoading] = useState(false);
  const [workloadTab, setWorkloadTab] = useState("properties");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleCode, setRoleCode] = useState("AGENT");

  const [editOpen, setEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRoleCode, setEditRoleCode] = useState("AGENT");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [toggleTarget, setToggleTarget] = useState<any>(null);
  const [toggling, setToggling] = useState(false);

  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resettingPwd, setResettingPwd] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState("");
  const [transferProperties, setTransferProperties] = useState(true);
  const [transferCustomers, setTransferCustomers] = useState(true);
  const [transferTasks, setTransferTasks] = useState(true);
  const [transferring, setTransferring] = useState(false);

  const isManager =
    user?.role_code === "BRANCH_MANAGER" ||
    user?.role_code === "ADMIN" ||
    user?.role_code === "OWNER";

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/agency/agents");
      if (res.success && res.data) {
        setAgents(res.data);
      } else {
        showToast(res.error?.message || "خطا در بارگذاری فهرست مشاوران.");
      }
    } catch {
      showToast("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const loadWorkload = useCallback(
    async (agentId: string) => {
      setWorkloadLoading(true);
      try {
        const res = await api.get(`/api/v1/agency/agents/${agentId}/workload`);
        if (res.success && res.data) {
          setWorkload(res.data);
        } else {
          showToast(res.error?.message || "خطا در بارگذاری پرونده کاری مشاور.");
        }
      } catch {
        showToast("خطا در برقراری ارتباط با سرور.");
      } finally {
        setWorkloadLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (selectedAgentId) {
      loadWorkload(selectedAgentId);
    } else {
      setWorkload(null);
    }
  }, [selectedAgentId, loadWorkload]);

  const handleCreateSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const res = await api.post("/api/v1/agency/agents", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim().toLowerCase(),
        phone: phone.trim(),
        password: password.trim(),
        role_code: roleCode,
      });
      if (res.success && res.data) {
        showToast(`مشاور «${res.data.display_name}» با موفقیت اضافه شد.`);
        setCreateOpen(false);
        setFirstName("");
        setLastName("");
        setUsername("");
        setPhone("");
        setPassword("");
        setRoleCode("AGENT");
        loadAgents();
      } else {
        setCreateError(res.error?.message || "خطا در ثبت مشاور جدید.");
      }
    } catch {
      setCreateError("خطای سیستمی در ارتباط با سرور.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    const nextActive = !toggleTarget.is_active;
    try {
      const res = await api.patch(
        `/api/v1/agency/agents/${toggleTarget.id}/status`,
        {
          is_active: nextActive,
        }
      );
      if (res.success) {
        showToast(
          nextActive
            ? `حساب مشاور «${toggleTarget.display_name}» با موفقیت فعال شد.`
            : `حساب مشاور «${toggleTarget.display_name}» غیرفعال و نشست‌های فعال آن باطل گردید.`
        );
        setToggleTarget(null);
        loadAgents();
        if (selectedAgentId === toggleTarget.id) {
          loadWorkload(selectedAgentId);
        }
      } else {
        showToast(res.error?.message || "خطا در تغییر وضعیت مشاور.");
      }
    } catch {
      showToast("خطا در ارسال درخواست به سرور.");
    } finally {
      setToggling(false);
    }
  };

  const handleResetPassword = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedAgentId || resetPassword.length < 6) return;
    setResettingPwd(true);
    try {
      const res = await api.post(
        `/api/v1/agency/agents/${selectedAgentId}/reset-password`,
        {
          password: resetPassword,
        }
      );
      if (res.success) {
        showToast(
          "رمز عبور مشاور با موفقیت تغییر یافت و نشست‌های قبلی باطل شدند."
        );
        setResetPwdOpen(false);
        setResetPassword("");
      } else {
        showToast(res.error?.message || "خطا در بازنشانی رمز عبور.");
      }
    } catch {
      showToast("خطا در ارسال درخواست به سرور.");
    } finally {
      setResettingPwd(false);
    }
  };

  const handleEditSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedAgentId) return;
    setEditError(null);
    setSavingEdit(true);
    try {
      const res = await api.patch(`/api/v1/agency/agents/${selectedAgentId}`, {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        username: editUsername.trim().toLowerCase(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        role_code: editRoleCode,
      });
      if (res.success && res.data) {
        showToast("اطلاعات مشاور با موفقیت ویرایش شد.");
        setEditOpen(false);
        loadAgents();
        loadWorkload(selectedAgentId);
      } else {
        setEditError(res.error?.message || "خطا در بروزرسانی اطلاعات مشاور.");
      }
    } catch {
      setEditError("خطای سیستمی در ارتباط با سرور.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleTransferSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedAgentId || !targetAgentId) return;
    setTransferring(true);
    try {
      const res = await api.post(
        `/api/v1/agency/agents/${selectedAgentId}/transfer-assets`,
        {
          target_agent_id: targetAgentId,
          transfer_properties: transferProperties,
          transfer_customers: transferCustomers,
          transfer_tasks: transferTasks,
        }
      );
      if (res.success) {
        showToast(
          res.message || "انتقال پرونده‌ها و فایل‌ها با موفقیت انجام شد."
        );
        setTransferOpen(false);
        setTargetAgentId("");
        loadAgents();
        loadWorkload(selectedAgentId);
      } else {
        showToast(res.error?.message || "خطا در انتقال پرونده‌ها.");
      }
    } catch {
      showToast("خطا در اجرای فرآیند انتقال.");
    } finally {
      setTransferring(false);
    }
  };

  const filteredAgents = agents.filter((agent) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      agent.display_name.toLowerCase().includes(q) ||
      agent.username.toLowerCase().includes(q) ||
      (agent.phone && agent.phone.includes(q))
    );
  });

  const activeCount = agents.filter((a) => a.is_active).length;
  const inactiveCount = agents.filter((a) => !a.is_active).length;
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const transferTargets = agents.filter(
    (a) => a.id !== selectedAgentId && a.is_active
  );

  if (selectedAgentId && selectedAgent) {
    const isSelf = selectedAgent.id === user?.id;
    const roleLabel =
      selectedAgent.role_code === "ADMIN" || selectedAgent.role_code === "OWNER"
        ? "مدیر ارشد آژانس"
        : selectedAgent.role_code === "BRANCH_MANAGER"
        ? "مدیر شعبه"
        : "مشاور املاک";

    return (
      <div className="space-y-4 pb-24 select-none animate-in fade-in">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 -mx-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedAgentId(null)}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              aria-label="بازگشت به فهرست مشاوران"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-extrabold text-[#172033]">
                پرونده و مدیریت مشاور
              </h2>
              <p className="text-[11px] text-[#667085]">
                {selectedAgent.display_name} • {roleLabel}
              </p>
            </div>
          </div>
          <div>
            {selectedAgent.is_active ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <CircleCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>فعال</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-300">
                <CircleX className="w-3.5 h-3.5 text-slate-500" />
                <span>غیرفعال</span>
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base text-white shrink-0 shadow-xs ${
                selectedAgent.is_active ? "bg-[#145DB5]" : "bg-slate-400"
              }`}
            >
              {selectedAgent.first_name
                ? selectedAgent.first_name[0]
                : selectedAgent.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-[#172033] truncate">
                  {selectedAgent.display_name}
                </h3>
                {isSelf && (
                  <span className="text-[10px] font-bold text-[#145DB5] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shrink-0">
                    حساب شما
                  </span>
                )}
              </div>
              <p className="text-xs text-[#667085] mt-0.5 flex items-center gap-2">
                <span>نام کاربری:</span>
                <strong className="font-mono text-slate-800">
                  {selectedAgent.username}
                </strong>
              </p>
            </div>
          </div>
          {selectedAgent.phone && (
            <div className="flex items-center justify-between text-xs bg-[#F7F9FC] px-3 py-2 rounded-xl border border-slate-200/70">
              <span className="text-[#667085]">شماره همراه:</span>
              <a
                href={`tel:${selectedAgent.phone}`}
                className="font-mono font-bold text-[#145DB5] flex items-center gap-1.5"
                dir="ltr"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{selectedAgent.phone}</span>
              </a>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 border border-slate-200 text-center shadow-2xs">
            <span className="text-[10px] text-[#667085] block mb-0.5">
              املاک مسئول
            </span>
            <div className="text-lg font-black text-[#145DB5]">
              {workload?.metrics.total_properties ??
                selectedAgent.properties_count}
            </div>
            <span className="text-[9px] text-slate-500">
              {workload
                ? `${workload.metrics.private_properties} اختصاصی`
                : "فایل"}
            </span>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200 text-center shadow-2xs">
            <span className="text-[10px] text-[#667085] block mb-0.5">
              متقاضیان
            </span>
            <div className="text-lg font-black text-emerald-700">
              {workload?.metrics.total_customers ??
                selectedAgent.customers_count}
            </div>
            <span className="text-[9px] text-slate-500">
              {workload
                ? `${workload.metrics.private_customers} اختصاصی`
                : "پرونده"}
            </span>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200 text-center shadow-2xs">
            <span className="text-[10px] text-[#667085] block mb-0.5">
              پیگیری جاری
            </span>
            <div className="text-lg font-black text-amber-600">
              {workload?.metrics.active_tasks_count ??
                selectedAgent.active_tasks_count}
            </div>
            <span className="text-[9px] text-slate-500">اقدام فعال</span>
          </div>
        </div>

        {isManager && (
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-2">
            <span className="text-[11px] font-bold text-[#667085] block mb-1">
              عملیات مدیریتی مسئول
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEditFirstName(selectedAgent.first_name || "");
                  setEditLastName(selectedAgent.last_name || "");
                  setEditUsername(selectedAgent.username || "");
                  setEditPhone(selectedAgent.phone || "");
                  setEditEmail(selectedAgent.email || "");
                  setEditRoleCode(selectedAgent.role_code || "AGENT");
                  setEditError(null);
                  setEditOpen(true);
                }}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-blue-50 text-[#145DB5] text-[10px] font-bold border border-blue-200 hover:bg-blue-100 active:scale-98 transition cursor-pointer"
              >
                <User className="w-4 h-4 text-[#145DB5]" />
                <span>ویرایش مشخصات</span>
              </button>
              <button
                type="button"
                onClick={() => setTransferOpen(true)}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-blue-50 text-[#145DB5] text-[10px] font-bold border border-blue-200 hover:bg-blue-100 active:scale-98 transition cursor-pointer"
              >
                <FolderSync className="w-4 h-4 text-[#145DB5]" />
                <span>انتقال فایل‌ها</span>
              </button>
              <button
                type="button"
                onClick={() => setResetPwdOpen(true)}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-slate-50 text-slate-700 text-[10px] font-bold border border-slate-200 hover:bg-slate-100 active:scale-98 transition cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-slate-500" />
                <span>رمز عبور</span>
              </button>
            </div>
            {!isSelf && (
              <button
                type="button"
                onClick={() => setToggleTarget(selectedAgent)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold border transition active:scale-98 cursor-pointer ${
                  selectedAgent.is_active
                    ? "text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100"
                    : "text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                {selectedAgent.is_active
                  ? "غیرفعال‌سازی دسترسی مشاور"
                  : "فعال‌سازی مجدد حساب مشاور"}
              </button>
            )}
          </div>
        )}

        <div className="bg-slate-200/70 p-1 rounded-xl flex text-xs font-bold text-slate-600">
          <button
            onClick={() => setWorkloadTab("properties")}
            className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
              workloadTab === "properties"
                ? "bg-white text-[#145DB5] shadow-xs"
                : "hover:text-slate-800"
            }`}
          >
            املاک ({workload?.properties.length ?? 0})
          </button>
          <button
            onClick={() => setWorkloadTab("customers")}
            className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
              workloadTab === "customers"
                ? "bg-white text-[#145DB5] shadow-xs"
                : "hover:text-slate-800"
            }`}
          >
            متقاضیان ({workload?.customers.length ?? 0})
          </button>
          <button
            onClick={() => setWorkloadTab("activity")}
            className={`flex-1 py-1.5 rounded-lg transition text-center cursor-pointer ${
              workloadTab === "activity"
                ? "bg-white text-[#145DB5] shadow-xs"
                : "hover:text-slate-800"
            }`}
          >
            فعالیت‌ها ({workload?.recent_activities.length ?? 0})
          </button>
        </div>

        {workloadLoading ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-[#145DB5] border-t-transparent animate-spin mx-auto" />
            <p>در حال فراخوانی فایل‌ها و پرونده‌های مشاور...</p>
          </div>
        ) : workloadTab === "properties" ? (
          <div className="space-y-2">
            {workload?.properties && workload.properties.length > 0 ? (
              workload.properties.map((prop: any) => (
                <div
                  key={prop.id}
                  className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-[10px] font-bold text-[#145DB5] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                        {prop.code}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                          prop.visibility === "PRIVATE"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {prop.visibility === "PRIVATE"
                          ? "اختصاصی"
                          : "عمومی دفتر"}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {prop.listing_type === "SALE" ? "فروش" : "اجاره"}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#172033] truncate">
                      {prop.title}
                    </h4>
                    <p className="text-[11px] text-[#667085] mt-0.5">
                      {prop.address.neighborhood || prop.city} •{" "}
                      {prop.area_sqm} متر
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                هیچ ملکی تحت مسئولیت این مشاور ثبت نشده است.
              </div>
            )}
          </div>
        ) : workloadTab === "customers" ? (
          <div className="space-y-2">
            {workload?.customers && workload.customers.length > 0 ? (
              workload.customers.map((cust: any) => (
                <div
                  key={cust.id}
                  className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      {cust.code && (
                        <span className="font-mono text-[10px] font-bold text-[#145DB5] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                          {cust.code}
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                          cust.visibility === "PRIVATE"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {cust.visibility === "PRIVATE"
                          ? "اختصاصی"
                          : "عمومی دفتر"}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {cust.customer_type === "BUYER" ? "خریدار" : "مستأجر"}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#172033] truncate">
                      {cust.display_name}
                    </h4>
                    <p
                      className="text-[11px] text-[#667085] font-mono mt-0.5"
                      dir="ltr"
                    >
                      {cust.phone}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                هیچ متقاضی تحت مسئولیت این مشاور ثبت نشده است.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {workload?.recent_activities &&
            workload.recent_activities.length > 0 ? (
              workload.recent_activities.map((act: any) => (
                <div
                  key={act.id}
                  className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#172033]">
                      {act.action}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(act.created_at).toLocaleDateString("fa-IR")}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    نوع: {act.entity_type}{" "}
                    {act.entity_id ? `(${act.entity_id.slice(0, 8)}...)` : ""}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                سابقه فعالیتی برای این مشاور ثبت نشده است.
              </div>
            )}
          </div>
        )}

        {transferOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#145DB5] flex items-center justify-center">
                    <FolderSync className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#172033]">
                      انتقال امن پرونده‌ها
                    </h3>
                    <p className="text-[11px] text-[#667085]">
                      واگذاری مسئولیت فایل‌ها به مشاور دیگر
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTransferOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#172033] mb-1">
                    مشاور مقصد (دریافت‌کننده):
                  </label>
                  <select
                    value={targetAgentId}
                    onChange={(ev) => setTargetAgentId(ev.target.value)}
                    required={true}
                    className="w-full bg-[#F7F9FC] rounded-xl border border-slate-300 p-2.5 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
                  >
                    <option value="">انتخاب مشاور فعال...</option>
                    {transferTargets.map((target) => (
                      <option key={target.id} value={target.id}>
                        {target.display_name} ({target.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
                  <span className="font-bold text-[#172033] block">
                    پرونده‌ها و رکوردهای در حال انتقال:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200/70">
                    <div>
                      <span className="text-slate-500 block">
                        فایل‌های اختصاصی:
                      </span>
                      <strong className="text-amber-800 font-bold">
                        {(workload?.metrics.private_properties ?? 0) +
                          (workload?.metrics.private_customers ?? 0)}{" "}
                        رکورد
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">
                        فایل‌های عمومی دفتر:
                      </span>
                      <strong className="text-emerald-700 font-bold">
                        {(workload?.metrics.agency_properties ?? 0) +
                          (workload?.metrics.agency_customers ?? 0)}{" "}
                        رکورد
                      </strong>
                    </div>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={transferProperties}
                      onChange={(ev) => setTransferProperties(ev.target.checked)}
                      className="rounded text-[#145DB5] mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-[#172033]">
                        املاک تحت مسئولیت ({workload?.properties.length ?? 0}{" "}
                        فایل)
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {workload?.metrics.private_properties ?? 0} فایل اختصاصی
                        • {workload?.metrics.agency_properties ?? 0} فایل عمومی
                        دفتر
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transferCustomers}
                      onChange={(ev) => setTransferCustomers(ev.target.checked)}
                      className="rounded text-[#145DB5] mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-[#172033]">
                        متقاضیان و خریداران ({workload?.customers.length ?? 0}{" "}
                        پرونده)
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {workload?.metrics.private_customers ?? 0} پرونده
                        اختصاصی • {workload?.metrics.agency_customers ?? 0} عمومی
                        دفتر
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transferTasks}
                      onChange={(ev) => setTransferTasks(ev.target.checked)}
                      className="rounded text-[#145DB5] mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-[#172033]">
                        پیگیری‌ها و وظایف باز ({workload?.tasks.length ?? 0}{" "}
                        وظیفه)
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        تمام وظایف در انتظار انجام به مشاور جدید واگذار می‌شود
                      </span>
                    </div>
                  </label>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                  ✓ ثبت‌کننده اولیه و تاریخچه تعاملات حفظ شده و تنها مسئول
                  پیگیری به مشاور جدید واگذار می‌شود.
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={transferring || !targetAgentId}
                    className="flex-1 py-2.5 bg-[#145DB5] hover:bg-[#0F4383] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition active:scale-98 cursor-pointer"
                  >
                    {transferring
                      ? "در حال انتقال امن..."
                      : "تأیید و اجرای انتقال"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#145DB5] flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#172033]">
                      ویرایش مشخصات مشاور
                    </h3>
                    <p className="text-[11px] text-[#667085]">
                      {selectedAgent.display_name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {editError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-150 text-[11px] text-rose-800 font-bold">
                  {editError}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[#172033] mb-1">
                      نام:
                    </label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(ev) => setEditFirstName(ev.target.value)}
                      required={true}
                      className="w-full bg-[#F7F9FC] rounded-xl border border-slate-300 px-3 py-2 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#172033] mb-1">
                      نام خانوادگی:
                    </label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(ev) => setEditLastName(ev.target.value)}
                      required={true}
                      className="w-full bg-[#F7F9FC] rounded-xl border border-slate-300 px-3 py-2 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#172033] mb-1">
                    نام کاربری (انگلیسی):
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(ev) => setEditUsername(ev.target.value)}
                    required={true}
                    className="w-full bg-[#F7F9FC] rounded-xl border border-slate-300 px-3 py-2 text-xs text-[#172033] outline-none focus:border-[#145DB5] font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#172033] mb-1">
                    شماره همراه:
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(ev) => setEditPhone(ev.target.value)}
                    required={true}
                    placeholder="09123456789"
                    className="w-full bg-[#F7F9FC] rounded-xl border border-slate-300 px-3 py-2 text-xs text-[#172033] outline-none focus:border-[#145DB5] font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#172033] mb-1">
                    ایمیل (اختیاری):
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(ev) => setEditEmail(ev.target.value)}
                    placeholder="info@agency.ir"
                    className="w-full bg-[#F7F9FC] rounded-xl border border-slate-300 px-3 py-2 text-xs text-[#172033] outline-none focus:border-[#145DB5] font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#172033] mb-1">
                    نقش کاربری:
                  </label>
                  <select
                    value={editRoleCode}
                    onChange={(ev) => setEditRoleCode(ev.target.value)}
                    className="w-full bg-[#F7F9FC] rounded-xl border border-slate-300 p-2 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
                  >
                    <option value="AGENT">مشاور املاک</option>
                    <option value="BRANCH_MANAGER">مدیر شعبه</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex-1 py-2.5 bg-[#145DB5] hover:bg-[#0F4383] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition active:scale-98 cursor-pointer"
                  >
                    {savingEdit ? "در حال ثبت تغییرات..." : "ذخیره تغییرات"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {resetPwdOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#145DB5] flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#172033]">
                      تغییر رمز عبور مشاور
                    </h3>
                    <p className="text-[11px] text-[#667085]">
                      {selectedAgent.display_name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResetPwdOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#172033] mb-1">
                    رمز عبور جدید (حداقل ۶ کاراکتر):
                  </label>
                  <div className="relative">
                    <input
                      type={showResetPwd ? "text" : "password"}
                      value={resetPassword}
                      onChange={(ev) => setResetPassword(ev.target.value)}
                      required={true}
                      minLength={6}
                      placeholder="••••••••"
                      className="w-full bg-[#F7F9FC] rounded-xl border border-slate-300 pr-3 pl-9 py-2.5 text-xs text-[#172033] outline-none focus:border-[#145DB5] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPwd(!showResetPwd)}
                      className="absolute left-2.5 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showResetPwd ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                  ⚠️ پس از تغییر رمز عبور، تمامی نشست‌های فعال این مشاور به صورت
                  آنی باطل خواهند شد.
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={resettingPwd || resetPassword.length < 6}
                    className="flex-1 py-2.5 bg-[#145DB5] hover:bg-[#0F4383] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition active:scale-98 cursor-pointer"
                  >
                    {resettingPwd ? "در حال ذخیره‌سازی..." : "ثبت رمز جدید"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetPwdOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 select-none">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 -mx-1">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
            aria-label="بازگشت به بخش بیشتر"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-[#172033]">
              مدیریت مشاوران و اعضای دفتر
            </h2>
            <p className="text-[11px] text-[#667085]">
              ساماندهی دسترسی‌ها، پرونده کاری و وضعیت فعال بودن مشاوران
            </p>
          </div>
        </div>
        {isManager && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#145DB5] text-white text-xs font-bold shadow-xs hover:bg-[#0F4383] active:scale-95 transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>مشاور جدید</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 border border-slate-200 text-center shadow-2xs">
          <span className="text-[11px] text-[#667085] block mb-1">
            کل همکاران
          </span>
          <span className="text-lg font-black text-[#172033]">
            {agents.length}
          </span>
        </div>
        <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200 text-center">
          <span className="text-[11px] text-emerald-800 block mb-1">
            مشاور فعال
          </span>
          <span className="text-lg font-black text-emerald-700">
            {activeCount}
          </span>
        </div>
        <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 text-center">
          <span className="text-[11px] text-slate-600 block mb-1">غیرفعال</span>
          <span className="text-lg font-black text-slate-700">
            {inactiveCount}
          </span>
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
          placeholder="جستجوی مشاور با نام، نام کاربری یا شماره همراه..."
          className="w-full bg-white rounded-xl border border-slate-300 pr-9 pl-3 py-2 text-xs text-[#172033] focus:border-[#145DB5] focus:ring-1 focus:ring-[#145DB5] outline-none"
        />
        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
      </div>

      {loading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#145DB5] border-t-transparent animate-spin mx-auto" />
          <p>در حال بارگذاری اطلاعات مشاوران آژانس...</p>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-700">هیچ مشاوری یافت نشد.</p>
          <p className="text-[11px]">
            با کلیک روی «مشاور جدید» می‌توانید اولین همکار خود را ثبت کنید.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAgents.map((agent) => {
            const isSelf = agent.id === user?.id;
            const roleLabel =
              agent.role_code === "ADMIN" || agent.role_code === "OWNER"
                ? "مدیر ارشد آژانس"
                : agent.role_code === "BRANCH_MANAGER"
                ? "مدیر شعبه"
                : "مشاور املاک";

            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`bg-white rounded-2xl border transition shadow-2xs p-3.5 space-y-2.5 cursor-pointer hover:border-[#145DB5] ${
                  agent.is_active
                    ? "border-slate-200"
                    : "border-slate-300 bg-slate-50/60 opacity-85"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-xs ${
                        agent.is_active ? "bg-[#145DB5]" : "bg-slate-400"
                      }`}
                    >
                      {agent.first_name
                        ? agent.first_name[0]
                        : agent.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-[#172033]">
                          {agent.display_name}
                        </h4>
                        {isSelf && (
                          <span className="text-[10px] font-bold text-[#145DB5] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                            حساب شما
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#667085] flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{agent.username}@</span>
                        <span>•</span>
                        <span>{roleLabel}</span>
                      </p>
                    </div>
                  </div>
                  <div>
                    {agent.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CircleCheck className="w-3 h-3 text-emerald-600" />
                        <span>فعال</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md border border-slate-300">
                        <CircleX className="w-3 h-3 text-slate-500" />
                        <span>غیرفعال</span>
                      </span>
                    )}
                  </div>
                </div>

                {agent.phone && (
                  <div
                    className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono bg-[#F7F9FC] px-2.5 py-1.5 rounded-lg border border-slate-200/60"
                    dir="ltr"
                  >
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{agent.phone}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
                  <div className="bg-[#F7F9FC] rounded-lg p-1.5 border border-slate-100">
                    <span className="text-[10px] text-[#667085] block">
                      املاک مسئول
                    </span>
                    <strong className="text-xs text-[#172033]">
                      {agent.properties_count || 0} فایل
                    </strong>
                  </div>
                  <div className="bg-[#F7F9FC] rounded-lg p-1.5 border border-slate-100">
                    <span className="text-[10px] text-[#667085] block">
                      متقاضیان
                    </span>
                    <strong className="text-xs text-[#172033]">
                      {agent.customers_count || 0} نفر
                    </strong>
                  </div>
                  <div className="bg-[#F7F9FC] rounded-lg p-1.5 border border-slate-100">
                    <span className="text-[10px] text-[#667085] block">
                      پیگیری جاری
                    </span>
                    <strong className="text-xs text-[#172033]">
                      {agent.active_tasks_count || 0} وظیفه
                    </strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-[#145DB5] font-bold flex items-center gap-0.5">
                    <span>مشاهده پرونده و مدیریت</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                  {isManager && !isSelf && (
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setToggleTarget(agent);
                      }}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition active:scale-95 cursor-pointer ${
                        agent.is_active
                          ? "text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                          : "text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                      }`}
                    >
                      {agent.is_active ? "غیرفعال‌سازی" : "فعال‌سازی"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#145DB5] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#172033]">
                    تعریف و افزودن مشاور جدید
                  </h3>
                  <p className="text-[11px] text-[#667085]">
                    صدور حساب و تعیین دسترسی کاری در آژانس
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#172033] mb-1">
                    نام
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(ev) => setFirstName(ev.target.value)}
                    required={true}
                    placeholder="مثال: علیرضا"
                    className="w-full bg-[#F7F9FC] rounded-xl border border-slate-300 p-2.5 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#172033] mb-1">
                    نام خانوادگی
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(ev) => setLastName(ev.target.value)}
                    required={true}
                    placeholder="مثال: رادمنش"
                    className="w-full bg-[#F7F9FC] rounded-xl border border-slate-300 p-2.5 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#172033] mb-1">
                  نام کاربری ورود (حروف انگلیسی/اعداد)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(ev) => setUsername(ev.target.value)}
                  required={true}
                  dir="ltr"
                  placeholder="radmanesh"
                  className="w-full bg-[#F7F9FC] rounded-xl border border-slate-300 p-2.5 text-xs text-[#172033] outline-none focus:border-[#145DB5] font-mono text-left"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#172033] mb-1">
                  شماره همراه (جهت تماس و بازیابی)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(ev) => setPhone(ev.target.value)}
                  required={true}
                  dir="ltr"
                  placeholder="09123456789"
                  className="w-full bg-[#F7F9FC] rounded-xl border border-slate-300 p-2.5 text-xs text-[#172033] outline-none focus:border-[#145DB5] font-mono text-left"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#172033] mb-1">
                  رمز عبور اولیه
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    required={true}
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full bg-[#F7F9FC] rounded-xl border border-slate-300 pr-3 pl-9 py-2.5 text-xs text-[#172033] outline-none focus:border-[#145DB5] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-2.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#172033] mb-1">
                  نقش سازمانی
                </label>
                <select
                  value={roleCode}
                  onChange={(ev) => setRoleCode(ev.target.value)}
                  className="w-full bg-[#F7F9FC] rounded-xl border border-slate-300 p-2.5 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
                >
                  <option value="AGENT">مشاور املاک</option>
                  <option value="BRANCH_MANAGER">
                    مدیر شعبه (دسترسی نظارتی)
                  </option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-[#145DB5] hover:bg-[#0F4383] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition active:scale-98 cursor-pointer shadow-xs"
                >
                  {creating ? "در حال ثبت..." : "ایجاد مشاور"}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toggleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-3.5 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  toggleTarget.is_active
                    ? "bg-rose-50 text-rose-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <TriangleAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#172033]">
                  {toggleTarget.is_active
                    ? "غیرفعال‌سازی حساب مشاور"
                    : "فعال‌سازی مجدد حساب"}
                </h3>
                <p className="text-[11px] text-[#667085]">
                  {toggleTarget.display_name}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {toggleTarget.is_active
                ? "با غیرفعال‌سازی، دسترسی مشاور به سامانه فوراً مسدود شده و تمامی نشست‌های فعال آن باطل می‌گردد. فایل‌ها و سوابق کاری مشاور در سیستم باقی می‌ماند و قابل انتقال خواهد بود."
                : "با فعال‌سازی مجدد، این مشاور می‌تواند مجدداً با رمز عبور خود وارد سامانه شود."}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={toggling}
                onClick={handleToggleStatus}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-98 cursor-pointer ${
                  toggleTarget.is_active
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {toggling
                  ? "در حال پردازش..."
                  : toggleTarget.is_active
                  ? "تأیید غیرفعال‌سازی"
                  : "تأیید فعال‌سازی"}
              </button>
              <button
                type="button"
                onClick={() => setToggleTarget(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
