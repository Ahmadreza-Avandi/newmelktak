import React, { useState, useEffect } from "react";
import {
  Building2,
  CircleCheck,
  DollarSign,
  FileText,
  Handshake,
  Search,
  User,
  Users,
  X,
} from "lucide-react";
import { api } from "../../services/apiClient.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { getPropertyChoices } from "../../utils/crmWorkflows.tsx";
import { CurrencyInput } from "../common/CurrencyInput.tsx";

export const CreateTransactionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tx: any) => void;
  showToast?: (msg: string, type?: "success" | "error") => void;
  defaultPropertyId?: string;
  defaultCustomerId?: string;
  editingTransaction?: any;
}> = ({
  isOpen,
  onClose,
  onSuccess,
  showToast,
  defaultPropertyId,
  defaultCustomerId,
  editingTransaction,
}) => {
  const { user } = useAuth();
  const [editStatus, setEditStatus] = useState(
    editingTransaction?.status || "COMPLETED"
  );
  const canAssignAgent = ["BRANCH_MANAGER", "ADMIN", "OWNER"].includes(
    user?.role_code || ""
  );

  const [propertyId, setPropertyId] = useState(defaultPropertyId || "");
  const [transactionType, setTransactionType] = useState("SALE");
  const [customerId, setCustomerId] = useState(defaultCustomerId || "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [finalPrice, setFinalPrice] = useState<number | undefined>(undefined);
  const [depositAmount, setDepositAmount] = useState<number | undefined>(
    undefined
  );
  const [rentAmount, setRentAmount] = useState<number | undefined>(undefined);
  const [contractDate, setContractDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [agentId, setAgentId] = useState(user?.id || "");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("CONTRACT");
  const [properties, setProperties] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [propertySearch, setPropertySearch] = useState("");

  useEffect(() => {
    if (isOpen && editingTransaction) {
      setPropertyId(editingTransaction.property_id);
      setTransactionType(editingTransaction.transaction_type);
      setCustomerId(editingTransaction.customer_id || "");
      setCustomerName(editingTransaction.customer_name || "");
      setCustomerPhone(editingTransaction.customer_phone || "");
      setOwnerName(editingTransaction.owner_name || "");
      setOwnerPhone(editingTransaction.owner_phone || "");
      setFinalPrice(editingTransaction.final_price);
      setDepositAmount(editingTransaction.deposit_amount);
      setRentAmount(editingTransaction.rent_amount);
      setContractDate(
        new Date(editingTransaction.contract_date).toISOString().slice(0, 10)
      );
      setAgentId(editingTransaction.agent_id || user?.id || "");
      setNotes(editingTransaction.notes || "");
      setEditStatus(editingTransaction.status);
      setFile(null);
    }
  }, [isOpen, editingTransaction]);

  useEffect(() => {
    if (!isOpen) return;
    let current = true;
    setLoadingSources(true);
    Promise.all([
      getPropertyChoices(),
      api.get("/api/v1/customers?limit=50"),
      canAssignAgent
        ? api.get("/api/v1/agency/agents")
        : Promise.resolve({ success: true, data: [] }),
    ])
      .then(([propRes, custRes, agentRes]) => {
        if (!current) return;
        if (propRes.success && propRes.data) {
          setProperties(propRes.data);
          if (defaultPropertyId) {
            const found = propRes.data.find(
              (p: any) => p.id === defaultPropertyId
            );
            if (found) {
              setPropertyId(found.id);
              setTransactionType(
                found.listing_type === "RENT" ? "RENT" : "SALE"
              );
              if (found.price_total) setFinalPrice(found.price_total);
              if (found.deposit_amount) setDepositAmount(found.deposit_amount);
              if (found.rent_amount) setRentAmount(found.rent_amount);
            }
          }
        }
        if (custRes.success && custRes.data) {
          setCustomers(custRes.data);
          if (defaultCustomerId) {
            const found = custRes.data.find(
              (c: any) => c.id === defaultCustomerId
            );
            if (found) {
              setCustomerId(found.id);
              setCustomerName(found.display_name);
              setCustomerPhone(found.phone || "");
            }
          }
        }
        if (agentRes.success && agentRes.data) {
          setAgents(agentRes.data);
        }
      })
      .catch((err) => {
        console.error("Error loading transaction sources:", err);
      })
      .finally(() => {
        if (current) setLoadingSources(false);
      });

    return () => {
      current = false;
    };
  }, [isOpen, defaultPropertyId, defaultCustomerId, canAssignAgent]);

  const handlePropertyChange = (id: string) => {
    setPropertyId(id);
    const prop = properties.find((p) => p.id === id);
    if (prop) {
      const txType = prop.listing_type === "RENT" ? "RENT" : "SALE";
      setTransactionType(txType);
      if (txType === "RENT") {
        setDepositAmount(prop.deposit_amount || undefined);
        setRentAmount(prop.rent_amount || undefined);
        setFinalPrice(undefined);
      } else {
        setFinalPrice(prop.price_total || undefined);
        setDepositAmount(undefined);
        setRentAmount(undefined);
      }
    }
  };

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    const cust = customers.find((c) => c.id === id);
    if (cust) {
      setCustomerName(cust.display_name);
      setCustomerPhone(cust.phone || "");
    }
  };

  if (!isOpen) return null;

  const filteredProperties = properties.filter(
    (p) =>
      (editingTransaction?.property_id === p.id ||
        (!p.is_archived && p.status !== "ARCHIVED")) &&
      (p.title?.includes(propertySearch) ||
        p.code?.includes(propertySearch) ||
        p.address?.neighborhood?.includes(propertySearch))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) {
      showToast?.("لطفاً ملک مورد معامله را انتخاب کنید.", "error");
      return;
    }
    if (!customerName.trim()) {
      showToast?.("لطفاً نام خریدار / مستاجر را وارد کنید.", "error");
      return;
    }
    if (transactionType === "RENT") {
      if (!depositAmount && !rentAmount) {
        showToast?.("لطفاً مبلغ رهن یا اجاره را مشخص فرمایید.", "error");
        return;
      }
    } else if (!finalPrice || finalPrice <= 0) {
      showToast?.("لطفاً مبلغ نهایی معامله را مشخص فرمایید.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        property_id: propertyId,
        transaction_type: transactionType,
        customer_id: customerId || null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        owner_name: ownerName.trim() || null,
        owner_phone: ownerPhone.trim() || null,
        contract_date: new Date(contractDate).toISOString(),
        agent_id: agentId || user?.id,
        notes: notes.trim() || null,
        status: editingTransaction ? editStatus : "COMPLETED",
      };
      if (transactionType === "RENT") {
        payload.deposit_amount = depositAmount ?? 0;
        payload.rent_amount = rentAmount ?? 0;
        payload.final_price = null;
      } else {
        payload.final_price = finalPrice;
        payload.deposit_amount = null;
        payload.rent_amount = null;
      }

      const res = editingTransaction
        ? await api.patch(
            `/api/v1/transactions/${editingTransaction.id}`,
            payload
          )
        : await api.post("/api/v1/transactions", payload);

      if (res.success && res.data) {
        const createdTx = res.data;
        if (file) {
          try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("display_name", file.name);
            fd.append("document_type", docType);
            fd.append("description", "مدرک پیوست ثبت اولیه معامله");
            await api.upload(`/api/v1/transactions/${createdTx.id}/documents`, fd);
          } catch (err) {
            console.error("Failed to upload contract file attachment:", err);
          }
        }
        showToast?.(
          editingTransaction
            ? "تغییرات معامله با موفقیت ذخیره شد."
            : "معامله با موفقیت ثبت شد و پرونده ملک نهایی گردید.",
          "success"
        );
        onSuccess?.(createdTx);
        onClose();
      } else {
        showToast?.(res.error?.message || "خطا در ثبت معامله.", "error");
      }
    } catch {
      showToast?.("ارتباط با سرور برقرار نشد.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#145DB5] flex items-center justify-center">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#172033]">
                {editingTransaction
                  ? "ویرایش معامله و قرارداد"
                  : "ثبت معامله و بستن قرارداد"}
              </h3>
              <p className="text-[11px] text-[#667085]">
                ثبت رسمی معامله، مشخصات طرفین و بروزرسانی وضعیت ملک
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 space-y-4 text-xs"
        >
          {editingTransaction && (
            <label className="block text-slate-700 font-bold">
              وضعیت معامله
              <select
                value={editStatus}
                onChange={(event) => setEditStatus(event.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs mt-1"
              >
                <option value="COMPLETED">نهایی‌شده</option>
                <option value="CANCELLED">لغوشده</option>
              </select>
            </label>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              نوع معامله
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {[
                { id: "SALE", label: "فروش" },
                { id: "RENT", label: "رهن و اجاره" },
                { id: "PRE_SALE", label: "پیش‌فروش" },
                { id: "EXCHANGE", label: "معاوضه" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTransactionType(item.id)}
                  className={`py-2 text-xs font-bold rounded-lg transition ${
                    transactionType === item.id
                      ? "bg-[#145DB5] text-white shadow-xs"
                      : "text-slate-600 hover:bg-white/60"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-bold flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#145DB5]" />
                انتخاب ملک مورد معامله <span className="text-rose-500">*</span>
              </label>
              {properties.length > 5 && (
                <div className="relative w-40">
                  <input
                    type="text"
                    placeholder="جستجوی کد/عنوان..."
                    value={propertySearch}
                    onChange={(e) => setPropertySearch(e.target.value)}
                    className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1 pr-6 focus:border-[#145DB5] outline-none"
                  />
                  <Search className="w-3 h-3 text-slate-400 absolute right-1.5 top-2" />
                </div>
              )}
            </div>
            <select
              value={propertyId}
              onChange={(e) => handlePropertyChange(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium focus:border-[#145DB5] outline-none shadow-2xs"
              required
            >
              <option value="">— انتخاب ملک از فهرست فایل‌ها —</option>
              {filteredProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  کد {p.code} — {p.title} ({p.neighborhood || p.city}) [
                  {p.listing_type === "RENT" ? "اجاره" : "فروش"}]
                </option>
              ))}
            </select>
          </div>

          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-bold flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600" />
                مشخصات طرف اول (خریدار / مستاجر){" "}
                <span className="text-rose-500">*</span>
              </label>
              {customers.length > 0 && (
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none text-slate-700 max-w-[180px]"
                >
                  <option value="">از مشتریان قبلی...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name} ({c.phone || "بدون شماره"})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">
                  نام و نام خانوادگی خریدار:
                </span>
                <input
                  type="text"
                  placeholder="مثال: علیرضا محمدی"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-[#145DB5] outline-none"
                  required
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">
                  شماره تماس خریدار:
                </span>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="0912..."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-[#145DB5] outline-none text-right font-mono"
                />
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2.5">
            <label className="text-slate-700 font-bold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              مشخصات طرف دوم (فروشنده / موجر)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">
                  نام فروشنده/موجر:
                </span>
                <input
                  type="text"
                  placeholder="مثال: بهنام رضایی"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-[#145DB5] outline-none"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">
                  شماره تماس فروشنده:
                </span>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="0912..."
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-[#145DB5] outline-none text-right font-mono"
                />
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-3">
            <label className="text-slate-700 font-bold flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-600" />
              مبالغ نهایی قرارداد <span className="text-rose-500">*</span>
            </label>
            {transactionType === "RENT" ? (
              <div className="space-y-3">
                <CurrencyInput
                  label="مبلغ رهن / ودیعه نهایی"
                  value={depositAmount || ""}
                  onChange={(_, num) => setDepositAmount(num)}
                  placeholder="مثال: 500,000,000"
                />
                <CurrencyInput
                  label="مبلغ اجاره ماهیانه نهایی"
                  value={rentAmount || ""}
                  onChange={(_, num) => setRentAmount(num)}
                  placeholder="مثال: 15,000,000"
                />
              </div>
            ) : (
              <CurrencyInput
                label="مبلغ کل نهایی معامله"
                value={finalPrice || ""}
                onChange={(_, num) => setFinalPrice(num)}
                placeholder="مثال: 4,500,000,000"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                تاریخ عقد قرارداد <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:border-[#145DB5] outline-none"
                required
              />
            </div>
            {canAssignAgent && agents.length > 0 ? (
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  مشاور مسئول معامله
                </label>
                <select
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:border-[#145DB5] outline-none"
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.display_name} (
                      {ag.role_code === "BRANCH_MANAGER" ? "مدیر شعبه" : "مشاور"})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ثبت‌کننده
                </label>
                <input
                  type="text"
                  value={user?.display_name || ""}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 outline-none"
                />
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
            <label className="text-slate-700 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-600" />
                پیوست فایل قرارداد یا رسید (اختیاری)
              </span>
              {file && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-[11px] text-rose-500 hover:underline"
                >
                  حذف فایل
                </button>
              )}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                  }
                }}
                className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#145DB5] hover:file:bg-blue-100 cursor-pointer"
              />
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700"
              >
                <option value="CONTRACT">مبایعه‌نامه / اجاره‌نامه</option>
                <option value="DEED">سند مالکیت</option>
                <option value="COMMISSION_RECEIPT">رسید کمیسیون</option>
                <option value="OTHER">سایر مدارک</option>
              </select>
            </div>
            {file && (
              <p className="text-[11px] text-emerald-600 font-medium">
                فایل انتخابی: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              توضیحات و شروط قرارداد
            </label>
            <textarea
              rows={2}
              placeholder="نکات مهم، شماره چک‌ها، زمان تحویل کلید، یا شرایط ویژه قرارداد..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:border-[#145DB5] outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 sticky bottom-0 bg-white pb-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition text-xs"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={submitting || loadingSources}
              className="px-6 py-2.5 rounded-xl bg-[#145DB5] hover:bg-[#0F4383] text-white font-bold transition flex items-center gap-2 text-xs shadow-md active:scale-98 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  در حال ثبت معامله...
                </>
              ) : (
                <>
                  <CircleCheck className="w-4 h-4" />
                  {editingTransaction ? "ذخیره تغییرات معامله" : "ثبت نهایی معامله"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
