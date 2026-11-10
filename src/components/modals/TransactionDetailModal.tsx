import React, { useState } from "react";
import {
  Building2,
  Calendar,
  Check,
  CircleAlert,
  Copy,
  Download,
  FileText,
  Paperclip,
  Phone,
  Upload,
  User,
  X,
} from "lucide-react";
import { api } from "../../services/apiClient.ts";
import {
  formatJalaaliDateTime,
  formatNumberWithCommas,
  formatTomanWords,
} from "../../utils/jalaali.ts";
import { CreateTransactionModal } from "./CreateTransactionModal.tsx";

export const TransactionDetailModal: React.FC<{
  transaction: any;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  showToast?: (msg: string, type?: "success" | "error") => void;
}> = ({ transaction, isOpen, onClose, onRefresh, showToast }) => {
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [docType, setDocType] = useState("CONTRACT");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!isOpen || !transaction) return null;

  if (editing) {
    return (
      <CreateTransactionModal
        isOpen
        editingTransaction={transaction}
        onClose={() => setEditing(false)}
        showToast={showToast}
        onSuccess={() => {
          setEditing(false);
          onRefresh?.();
          onClose();
        }}
      />
    );
  }

  const deleteDeal = async () => {
    if (!window.confirm("آیا از حذف این معامله اطمینان دارید؟")) return;
    setUpdatingStatus(true);
    try {
      const response = await api.delete(
        `/api/v1/transactions/${transaction.id}`
      );
      if (response.success) {
        showToast?.("معامله با موفقیت حذف شد.");
        onRefresh?.();
        onClose();
      } else {
        showToast?.(response.error?.message || "حذف معامله انجام نشد.");
      }
    } catch {
      showToast?.("ارتباط با سرور برقرار نشد.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCopy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("display_name", displayName.trim() || file.name);
    fd.append("document_type", docType);
    try {
      const res = await api.upload(
        `/api/v1/transactions/${transaction.id}/documents`,
        fd
      );
      if (res.success) {
        showToast?.("سند با موفقیت به معامله پیوست شد.", "success");
        setFile(null);
        setDisplayName("");
        onRefresh?.();
      } else {
        showToast?.(res.error?.message || "خطا در بارگذاری سند.", "error");
      }
    } catch {
      showToast?.("ارتباط با سرور برقرار نشد.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleToggleStatus = async () => {
    const nextStatus =
      transaction.status === "COMPLETED" ? "CANCELLED" : "COMPLETED";
    const confirmText =
      nextStatus === "CANCELLED"
        ? "آیا از لغو این معامله اطمینان دارید؟ وضعیت ملک به فعال بازگردانده خواهد شد."
        : "آیا مایلید وضعیت این معامله را مجدداً به نهایی‌شده تغییر دهید؟";
    if (window.confirm(confirmText)) {
      setUpdatingStatus(true);
      try {
        const res = await api.patch(`/api/v1/transactions/${transaction.id}`, {
          status: nextStatus,
        });
        if (res.success) {
          showToast?.("وضعیت معامله بروزرسانی شد.", "success");
          onRefresh?.();
          onClose();
        } else {
          showToast?.(
            res.error?.message || "خطا در تغییر وضعیت معامله.",
            "error"
          );
        }
      } catch {
        showToast?.("ارتباط با سرور برقرار نشد.", "error");
      } finally {
        setUpdatingStatus(false);
      }
    }
  };

  const isNotRent = transaction.transaction_type !== "RENT";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#145DB5]" />
            <div>
              <h3 className="text-sm font-bold text-[#172033]">
                جزئیات معامله و قرارداد
              </h3>
              <div className="text-[11px] text-[#667085]">
                شناسه معامله:{" "}
                <span className="font-mono">{transaction.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            disabled={updatingStatus}
            onClick={() => setEditing(true)}
            className="bg-[#145DB5] text-white px-3 py-2 rounded-xl text-xs font-bold"
          >
            ویرایش معامله
          </button>
          <button
            type="button"
            disabled={updatingStatus}
            onClick={deleteDeal}
            className="bg-white text-rose-700 border border-rose-200 px-3 py-2 rounded-xl text-xs font-bold"
          >
            {updatingStatus ? "در حال ذخیره…" : "حذف معامله"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 p-3 bg-[#F7F9FC] rounded-xl border border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                transaction.status === "COMPLETED"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {transaction.status === "COMPLETED"
                ? "معامله قطعی و نهایی"
                : "معامله لغوشده"}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-[#145DB5] border border-blue-200">
              {transaction.transaction_type === "SALE" && "فروش"}
              {transaction.transaction_type === "RENT" && "رهن و اجاره"}
              {transaction.transaction_type === "PRE_SALE" && "پیش‌فروش"}
              {transaction.transaction_type === "EXCHANGE" && "معاوضه"}
            </span>
          </div>
          <button
            onClick={handleToggleStatus}
            disabled={updatingStatus}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold transition ${
              transaction.status === "COMPLETED"
                ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            }`}
          >
            {transaction.status === "COMPLETED"
              ? "لغو معامله"
              : "نهایی کردن مجدد"}
          </button>
        </div>

        <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 mb-4">
          <div className="text-xs font-bold text-[#145DB5] mb-2">
            مبالغ قرارداد و تسویه مالی
          </div>
          {isNotRent ? (
            <div>
              <div className="text-xl font-extrabold text-[#145DB5]">
                {formatNumberWithCommas(transaction.final_price)}{" "}
                <span className="text-xs font-medium">تومان</span>
              </div>
              <div className="text-xs text-slate-700 font-semibold mt-1">
                {formatTomanWords(transaction.final_price)}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] text-slate-500 font-medium">
                  مبلغ ودیعه (رهن)
                </div>
                <div className="text-sm font-bold text-[#145DB5]">
                  {formatNumberWithCommas(transaction.deposit_amount)} تومان
                </div>
                <div className="text-[10px] text-slate-600">
                  {formatTomanWords(transaction.deposit_amount)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">
                  اجاره ماهانه
                </div>
                <div className="text-sm font-bold text-[#145DB5]">
                  {formatNumberWithCommas(transaction.rent_amount)} تومان
                </div>
                <div className="text-[10px] text-slate-600">
                  {formatTomanWords(transaction.rent_amount)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 bg-white border border-slate-200 rounded-xl p-3.5 mb-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">ملک مورد معامله:</span>
            <span className="font-bold text-[#172033]">
              {transaction.property_title || "ملک بدون عنوان"}
              {transaction.property_code
                ? ` (کد ${transaction.property_code})`
                : ""}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">تاریخ انعقاد قرارداد:</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formatJalaaliDateTime(transaction.contract_date)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">مشاور مسئول معامله:</span>
            <span className="font-bold text-[#145DB5]">
              {transaction.agent_name || "مشاور دفتر"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>{isNotRent ? "خریدار / متقاضی" : "مستأجر"}</span>
            </div>
            <div className="font-bold text-xs text-[#172033]">
              {transaction.customer_name}
            </div>
            {transaction.customer_phone && (
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200/60">
                <span className="font-mono text-xs text-slate-600">
                  {transaction.customer_phone}
                </span>
                <div className="flex items-center gap-1">
                  <a
                    href={`tel:${transaction.customer_phone}`}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    title="تماس تلفنی"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() =>
                      handleCopy(transaction.customer_phone, "cust_phone")
                    }
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    title="کپی شماره"
                  >
                    {copiedKey === "cust_phone" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-amber-600" />
              <span>{isNotRent ? "فروشنده / مالک" : "موجر / مالک"}</span>
            </div>
            <div className="font-bold text-xs text-[#172033]">
              {transaction.owner_name || "مالک ثبت نشده"}
            </div>
            {transaction.owner_phone && (
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200/60">
                <span className="font-mono text-xs text-slate-600">
                  {transaction.owner_phone}
                </span>
                <div className="flex items-center gap-1">
                  <a
                    href={`tel:${transaction.owner_phone}`}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    title="تماس تلفنی"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() =>
                      handleCopy(transaction.owner_phone, "owner_phone")
                    }
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    title="کپی شماره"
                  >
                    {copiedKey === "owner_phone" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {transaction.notes && (
          <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="font-bold text-slate-600 mb-1">
              یادداشت‌ها و شروط قرارداد:
            </div>
            <div className="text-slate-700 leading-relaxed">
              {transaction.notes}
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 pt-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#172033]">
              <Paperclip className="w-4 h-4 text-[#145DB5]" />
              <span>اسناد و مدارک پیوست قرارداد</span>
              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                {transaction.documents?.length ||
                  transaction.documents_count ||
                  0}
              </span>
            </div>
          </div>

          {transaction.documents && transaction.documents.length > 0 ? (
            <div className="space-y-2 mb-4">
              {transaction.documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 transition bg-white"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-4 h-4 text-[#145DB5] shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-bold text-[#172033] truncate">
                        {doc.display_name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {doc.document_type === "CONTRACT" && "قرارداد / قولنامه"}
                        {doc.document_type === "DEED" && "سند مالکیت"}
                        {doc.document_type === "FINANCIAL" &&
                          "رسید و فیش مالی"}
                        {doc.document_type === "IDENTITY" && "مدارک شناسایی"} —{" "}
                        {(doc.file_size / 1024).toFixed(0)} کیلوبایت
                      </div>
                    </div>
                  </div>
                  <a
                    href={`/api/v1/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-[#145DB5] hover:bg-blue-50 rounded-lg shrink-0 transition"
                    title="دانلود سند"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 mb-4">
              <CircleAlert className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                برای این معامله سندی پیوست نشده است. توصیه می‌شود قولنامه یا فیش
                پرداخت را ضمیمه کنید.
              </span>
            </div>
          )}

          <form
            onSubmit={handleUploadDoc}
            className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5"
          >
            <div className="text-xs font-bold text-slate-700">
              الصاق مدرک جدید به این معامله
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="عنوان سند (مثلاً قولنامه رسمی)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-lg border border-slate-300 p-2 text-xs bg-white"
              />
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="rounded-lg border border-slate-300 p-2 text-xs bg-white"
              >
                <option value="CONTRACT">قولنامه / قرارداد رسمی</option>
                <option value="FINANCIAL">رسید / فیش پرداخت</option>
                <option value="DEED">سند مالکیت</option>
                <option value="IDENTITY">مدارک شناسایی</option>
                <option value="OTHER">سایر</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#145DB5] hover:file:bg-blue-100"
              />
              <button
                type="submit"
                disabled={uploading || !file}
                className="mr-auto px-3 py-1.5 rounded-lg bg-[#145DB5] text-white text-xs font-bold hover:bg-[#0F4383] disabled:opacity-50 transition shrink-0 flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? "در حال ارسال..." : "الصاق به معامله"}</span>
              </button>
            </div>
          </form>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-200 transition"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
