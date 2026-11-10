import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  CircleAlert,
  CircleCheck,
  Download,
  Eye,
  FileText,
  FolderArchive,
  Layers,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { api } from "../services/apiClient.ts";
import { downloadDocumentSafe } from "../utils/jalaali.ts";
import { getPropertyChoices } from "../utils/crmWorkflows.tsx";

export const ARCHIVE_DOC_META: Record<
  string,
  { label: string; color: string }
> = {
  DEED: {
    label: "تصویر سند مالکیت",
    color: "bg-amber-100 text-amber-800 border-amber-200",
  },
  CONTRACT: {
    label: "قولنامه / قرارداد",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  IDENTITY: {
    label: "کارت شناسایی و هویتی",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  FINANCIAL: {
    label: "اسناد مالی / چک / فیش",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  PERMIT: {
    label: "پایان‌کار / پروانه ساخت",
    color: "bg-teal-100 text-teal-800 border-teal-200",
  },
  POWER_OF_ATTORNEY: {
    label: "وکالت‌نامه / حقوقی",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  OTHER: {
    label: "سایر اسناد و ضمائم",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export interface DocumentsArchiveViewProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
  embedded?: boolean;
}

export const DocumentsArchiveView: React.FC<DocumentsArchiveViewProps> = ({
  isOpen,
  onClose,
  showToast,
  embedded = false,
}) => {
  const [documentError, setDocumentError] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [docType, setDocType] = useState("DEED");
  const [description, setDescription] = useState("");
  const [linkMode, setLinkMode] = useState("GENERAL");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [propertyChoices, setPropertyChoices] = useState<any[]>([]);
  const [customerChoices, setCustomerChoices] = useState<any[]>([]);
  const [entitiesLoaded, setEntitiesLoaded] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const loadDocuments = async () => {
    setLoading(true);
    setDocumentError("");
    try {
      const res = await api.get(
        `/api/v1/documents/all?include_archived=${includeArchived}`
      );
      if (!res.success) {
        throw new Error(res.error?.message || "دریافت اسناد انجام نشد.");
      }
      if (Array.isArray(res.data)) {
        setDocuments(res.data);
      }
    } catch (err: any) {
      setDocumentError(err.message || "ارتباط با سرور برقرار نشد.");
    } finally {
      setLoading(false);
    }
  };

  const loadEntityChoices = async () => {
    if (entitiesLoaded) return;
    try {
      const [propsRes, custsRes] = await Promise.all([
        getPropertyChoices(),
        api.get("/api/v1/customers"),
      ]);
      if (propsRes.success && Array.isArray(propsRes.data)) {
        setPropertyChoices(propsRes.data);
      }
      if (custsRes.success && Array.isArray(custsRes.data)) {
        setCustomerChoices(custsRes.data);
      }
      setEntitiesLoaded(true);
    } catch (err) {
      console.error("Failed to load entities for document link:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen, includeArchived]);

  useEffect(() => {
    if (uploadOpen) {
      loadEntityChoices();
    }
  }, [uploadOpen]);

  const filteredDocs = useMemo(
    () =>
      documents.filter((doc) => {
        if (
          (docTypeFilter !== "ALL" && doc.document_type !== docTypeFilter) ||
          (entityFilter === "PROPERTY" && !doc.property_id) ||
          (entityFilter === "CUSTOMER" && !doc.customer_id) ||
          (entityFilter === "GENERAL" && (doc.property_id || doc.customer_id))
        ) {
          return false;
        }
        const q = search.toLowerCase().trim();
        return (
          !q ||
          doc.display_name?.toLowerCase().includes(q) ||
          doc.file_name?.toLowerCase().includes(q) ||
          doc.property_code?.toLowerCase().includes(q) ||
          doc.property_title?.toLowerCase().includes(q) ||
          doc.customer_display_name?.toLowerCase().includes(q) ||
          doc.description?.toLowerCase().includes(q)
        );
      }),
    [documents, search, docTypeFilter, entityFilter]
  );

  const handleFileChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (file.size > 10485760) {
      setUploadError("حجم فایل بیشتر از حد مجاز (۱۰ مگابایت) است.");
      return;
    }
    setUploadError(null);
    setSelectedFile(file);
    if (!displayName) {
      const base =
        file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      setDisplayName(base);
    }
  };

  const handleUploadSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedFile) {
      setUploadError("لطفاً فایلی را جهت بارگذاری انتخاب نمایید.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("document_type", docType);
      formData.append(
        "display_name",
        displayName.trim() || selectedFile.name
      );
      if (description.trim()) {
        formData.append("description", description.trim());
      }
      if (linkMode === "PROPERTY" && selectedPropertyId) {
        formData.append("property_id", selectedPropertyId);
      } else if (linkMode === "CUSTOMER" && selectedCustomerId) {
        formData.append("customer_id", selectedCustomerId);
      }

      const res = await api.upload("/api/v1/documents/upload", formData);
      if (res.success) {
        showToast("سند با موفقیت در سامانه بارگذاری و ثبت گردید.");
        setSelectedFile(null);
        setDisplayName("");
        setDescription("");
        setSelectedPropertyId("");
        setSelectedCustomerId("");
        setLinkMode("GENERAL");
        setUploadOpen(false);
        await loadDocuments();
      } else {
        setUploadError(res.error?.message || "خطا در بارگذاری سند در سرور.");
      }
    } catch (err: any) {
      setUploadError(
        err?.message || "ارتباط با سرور برای بارگذاری برقرار نشد."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (doc: any) => {
    downloadDocumentSafe(doc, includeArchived);
  };

  const handleArchive = async (docId: string) => {
    if (!window.confirm("آیا از انتقال این سند به بایگانی اطمینان دارید؟")) {
      return;
    }
    try {
      const res = await api.delete(`/api/v1/documents/${docId}`);
      if (res.success) {
        showToast("سند با موفقیت به بایگانی منتقل شد.");
        loadDocuments();
      } else {
        showToast(res.error?.message || "خطا در بایگانی سند.");
      }
    } catch {
      showToast("خطا در بایگانی سند.");
    }
  };

  const handleRestore = async (docId: string) => {
    try {
      const res = await api.post(`/api/v1/documents/${docId}/restore`);
      if (res.success) {
        showToast("سند با موفقیت از بایگانی بازیابی و فعال شد.");
        loadDocuments();
      } else {
        showToast(res.error?.message || "خطا در بازیابی سند.");
      }
    } catch {
      showToast("خطا در بازیابی سند.");
    }
  };

  const formatFileSize = (bytes: number) =>
    bytes < 1048576
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / 1048576).toFixed(1)} MB`;

  const isImageFile = (mime: string, name: string) =>
    mime.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(name);

  if (!isOpen) return null;

  return (
    <div
      className={
        embedded
          ? "melktak-document-page"
          : "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in"
      }
    >
      <div
        className={
          embedded
            ? "mt-document-panel"
            : "w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200"
        }
      >
        {documentError && (
          <div className="mt-notice mt-notice-error" role="alert">
            {documentError}
            <button
              type="button"
              onClick={loadDocuments}
              className="mt-secondary"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-100 bg-[#F7F9FC]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-[#172033]">
                  مدیریت جامع و بایگانی اسناد آژانس
                </h3>
                <span className="text-[10px] font-bold bg-blue-50 text-[#145DB5] px-2 py-0.5 rounded-full border border-blue-200">
                  {documents.length} سند
                </span>
              </div>
              <p className="text-[11px] text-[#667085]">
                ثبت، جستجو، دسته‌بندی و بایگانی اسناد ملکی، مدارک هویتی و
                قراردادها
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-1.5 bg-[#145DB5] hover:bg-[#0F4383] text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer active:scale-98"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>ثبت سند جدید</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {uploadOpen && (
          <div className="p-4 bg-blue-50/70 border-b border-blue-200 space-y-3.5 animate-in fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-blue-200">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#145DB5]" />
                <h4 className="text-xs font-black text-[#172033]">
                  ثبت و بارگذاری مستقیم سند
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadOpen(false);
                  setSelectedFile(null);
                  setUploadError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs flex items-center gap-2">
                <CircleAlert className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    انتخاب فایل (تصاویر JPG / PNG یا PDF — حداکثر ۱۰MB):
                  </label>
                  <input
                    type="file"
                    required={true}
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white file:text-[#145DB5] hover:file:bg-blue-100 cursor-pointer"
                  />
                  {selectedFile && (
                    <p className="text-[11px] text-emerald-700 mt-1 font-bold flex items-center gap-1">
                      <CircleCheck className="w-3.5 h-3.5" />
                      {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    عنوان نمایشی سند:
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(ev) => setDisplayName(ev.target.value)}
                    placeholder="مثلاً سند شش‌دانگ آپارتمان نیاوران یا شناسنامه مالک"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-medium text-slate-800 outline-none focus:border-[#145DB5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    دسته‌بندی و نوع مدرک:
                  </label>
                  <select
                    value={docType}
                    onChange={(ev) => setDocType(ev.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-medium text-slate-800 outline-none focus:border-[#145DB5]"
                  >
                    <option value="DEED">
                      تصویر سند مالکیت (تک‌برگ / بنچاق)
                    </option>
                    <option value="CONTRACT">
                      قولنامه / مبایعه‌نامه / قرارداد اجاره
                    </option>
                    <option value="IDENTITY">کارت شناسایی و هویتی</option>
                    <option value="FINANCIAL">
                      اسناد مالی / چک / فیش واریزی
                    </option>
                    <option value="PERMIT">
                      پایان‌کار / پروانه ساخت / استعلام شهرداری
                    </option>
                    <option value="POWER_OF_ATTORNEY">
                      وکالت‌نامه / اسناد حقوقی و وراثت
                    </option>
                    <option value="OTHER">سایر مدارک و ضمائم</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    اتصال به پرونده:
                  </label>
                  <select
                    value={linkMode}
                    onChange={(ev) => setLinkMode(ev.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-medium text-slate-800 outline-none focus:border-[#145DB5]"
                  >
                    <option value="GENERAL">
                      سند عمومی آژانس (بدون اتصال به پرونده)
                    </option>
                    <option value="PROPERTY">متصل به یکی از املاک</option>
                    <option value="CUSTOMER">
                      متصل به یکی از مشتریان / متقاضیان
                    </option>
                  </select>
                </div>
              </div>

              {linkMode === "PROPERTY" && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    انتخاب ملک مربوطه:
                  </label>
                  <select
                    value={selectedPropertyId}
                    onChange={(ev) => setSelectedPropertyId(ev.target.value)}
                    required={true}
                    className="w-full bg-[#F7F9FC] border border-slate-300 rounded-xl p-2 text-xs font-medium text-slate-800 outline-none focus:border-[#145DB5]"
                  >
                    <option value="">
                      -- لطفاً ملک مورد نظر را انتخاب نمایید --
                    </option>
                    {propertyChoices.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.title} (کد: {prop.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {linkMode === "CUSTOMER" && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    انتخاب متقاضی / مشتری:
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(ev) => setSelectedCustomerId(ev.target.value)}
                    required={true}
                    className="w-full bg-[#F7F9FC] border border-slate-300 rounded-xl p-2 text-xs font-medium text-slate-800 outline-none focus:border-[#145DB5]"
                  >
                    <option value="">-- لطفاً متقاضی را انتخاب نمایید --</option>
                    {customerChoices.map((cust) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.display_name} - {cust.phone}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  توضیحات تکمیلی (اختیاری):
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(ev) => setDescription(ev.target.value)}
                  placeholder="نکات راجع به دفترخانه، شماره ثبت یا وضعیت مدرک..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-800 outline-none focus:border-[#145DB5]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUploadOpen(false);
                    setSelectedFile(null);
                    setUploadError(null);
                  }}
                  className="px-4 py-2 text-xs text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-5 py-2 bg-[#145DB5] text-white text-xs font-bold rounded-xl hover:bg-[#0F4383] disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال بارگذاری در سرور...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>بارگذاری و ثبت سند</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="p-3 border-b border-slate-100 bg-white space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(ev) => setSearch(ev.target.value)}
                placeholder="جستجو در نام سند، کد ملک، نام مشتری یا توضیحات..."
                className="w-full pr-9 pl-3 py-2 bg-[#F7F9FC] border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#145DB5]"
              />
            </div>
            <button
              type="button"
              onClick={() => setIncludeArchived(!includeArchived)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                includeArchived
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <FolderArchive className="w-4 h-4" />
              <span>
                {includeArchived ? "اسناد بایگانی‌شده" : "اسناد فعال"}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setDocTypeFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                docTypeFilter === "ALL"
                  ? "bg-[#145DB5] text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              همه دسته‌ها ({documents.length})
            </button>
            {Object.entries(ARCHIVE_DOC_META).map(([key, meta]) => {
              const count = documents.filter(
                (doc) => doc.document_type === key
              ).length;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDocTypeFilter(key)}
                  className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                    docTypeFilter === key
                      ? "bg-[#145DB5] text-white shadow-2xs"
                      : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {meta.label} {count > 0 ? `(${count})` : ""}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] pt-0.5">
            <span className="text-slate-400 font-bold shrink-0">
              فیلتر ارتباط:
            </span>
            <button
              type="button"
              onClick={() => setEntityFilter("ALL")}
              className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                entityFilter === "ALL"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              همه پرونده‌ها
            </button>
            <button
              type="button"
              onClick={() => setEntityFilter("PROPERTY")}
              className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                entityFilter === "PROPERTY"
                  ? "bg-[#145DB5] text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>املاک</span>
            </button>
            <button
              type="button"
              onClick={() => setEntityFilter("CUSTOMER")}
              className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                entityFilter === "CUSTOMER"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <User className="w-3 h-3" />
              <span>مشتریان</span>
            </button>
            <button
              type="button"
              onClick={() => setEntityFilter("GENERAL")}
              className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                entityFilter === "GENERAL"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>عمومی دفتر</span>
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2.5 bg-[#F7F9FC]">
          {loading ? (
            <div className="py-14 text-center text-xs text-slate-500 space-y-2">
              <div className="w-6 h-6 rounded-full border-2 border-[#145DB5] border-t-transparent animate-spin mx-auto" />
              <p>در حال بارگذاری مدارک...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">
                {includeArchived
                  ? "هیچ سندی در بخش بایگانی یافت نشد"
                  : "هیچ سندی با معیارهای انتخابی یافت نشد"}
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                {includeArchived
                  ? "اسنادی که بایگانی شوند در این بخش نگهداری شده و قابل بازیابی هستند."
                  : "می‌توانید با دکمه «ثبت سند جدید» در بالا، اسناد ملکی، مدارک هویتی یا قولنامه‌ها را مستقیماً بارگذاری کنید."}
              </p>
              {!includeArchived && (
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#145DB5] text-white rounded-xl text-xs font-bold hover:bg-[#0F4383] transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>بارگذاری و ثبت سند جدید</span>
                </button>
              )}
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const meta =
                ARCHIVE_DOC_META[doc.document_type] || ARCHIVE_DOC_META.OTHER;
              const isImg = isImageFile(doc.mime_type, doc.file_name);
              return (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs hover:border-[#145DB5] transition"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      onClick={() => setPreviewDoc(doc)}
                      className="w-10 h-10 rounded-xl bg-blue-50 text-[#145DB5] flex items-center justify-center shrink-0 border border-blue-100 cursor-pointer hover:bg-blue-100 transition"
                      title="پیش‌نمایش سند"
                    >
                      {isImg ? (
                        <Eye className="w-5 h-5 text-[#145DB5]" />
                      ) : (
                        <FileText className="w-5 h-5 text-[#145DB5]" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${meta.color}`}
                        >
                          {meta.label}
                        </span>
                        <h5
                          onClick={() => setPreviewDoc(doc)}
                          className="text-xs font-extrabold text-[#172033] truncate cursor-pointer hover:text-[#145DB5]"
                          title={doc.display_name}
                        >
                          {doc.display_name}
                        </h5>
                        {doc.is_archived && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                            بایگانی‌شده
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 flex-wrap">
                        {doc.property_title && (
                          <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700">
                            <Building2 className="w-3 h-3 text-[#145DB5]" />
                            ملک: {doc.property_title}{" "}
                            {doc.property_code
                              ? `(کد: ${doc.property_code})`
                              : ""}
                          </span>
                        )}
                        {doc.customer_display_name && (
                          <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700">
                            <User className="w-3 h-3 text-emerald-600" />
                            متقاضی: {doc.customer_display_name}
                          </span>
                        )}
                        {!doc.property_id && !doc.customer_id && (
                          <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-100">
                            <Layers className="w-3 h-3" />
                            سند عمومی آژانس
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                        <span>حجم: {formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>بارگذاری: {doc.uploaded_by_name || "کاربر"}</span>
                        <span>•</span>
                        <span className="font-mono">
                          {new Date(doc.created_at).toLocaleDateString("fa-IR")}
                        </span>
                      </div>
                      {doc.description && (
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                          {doc.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                      title="پیش‌نمایش سریع"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      className="p-2 rounded-xl bg-blue-50 text-[#145DB5] hover:bg-blue-100 transition cursor-pointer"
                      title="دریافت فایل"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {includeArchived ? (
                      <button
                        type="button"
                        onClick={() => handleRestore(doc.id)}
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                        title="بازیابی و بازگرداندن از بایگانی"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleArchive(doc.id)}
                        className="p-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                        title="انتقال به بایگانی"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-medium">
            نمایش {filteredDocs.length} سند از مجموع {documents.length}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>

      {previewDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
            <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-[#145DB5] shrink-0" />
                <h4 className="text-xs font-extrabold text-slate-800 truncate">
                  {previewDoc.display_name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-slate-100 min-h-[240px]">
              {isImageFile(previewDoc.mime_type, previewDoc.file_name) ? (
                <img
                  src={`/api/v1/documents/${previewDoc.id}/download${
                    api.getToken()
                      ? `?token=${encodeURIComponent(api.getToken()!)}`
                      : ""
                  }${includeArchived ? "&allow_archived=true" : ""}`}
                  alt={previewDoc.display_name}
                  className="max-h-[62vh] max-w-full rounded-lg object-contain shadow-md"
                />
              ) : (
                <div className="text-center p-6 space-y-3 bg-white rounded-xl shadow-xs border border-slate-200 max-w-xs">
                  <FileText className="w-12 h-12 text-[#145DB5] mx-auto" />
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">
                      {previewDoc.file_name}
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-1">
                      حجم: {formatFileSize(previewDoc.file_size)} • فرمت: PDF
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(previewDoc)}
                    className="w-full py-2 bg-[#145DB5] text-white rounded-xl font-bold text-xs hover:bg-[#0F4383] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>دریافت و مشاهده فایل PDF</span>
                  </button>
                </div>
              )}
            </div>
            <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                تاریخ ثبت:{" "}
                {new Date(previewDoc.created_at).toLocaleDateString("fa-IR")}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewDoc)}
                  className="px-3.5 py-1.5 bg-[#145DB5] text-white rounded-xl font-bold text-xs hover:bg-[#0F4383] transition flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود فایل</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
