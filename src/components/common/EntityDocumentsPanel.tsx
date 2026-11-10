import React, { useState, useEffect, useMemo } from "react";
import {
  CircleAlert,
  CircleCheck,
  Download,
  Eye,
  FileText,
  Search,
  Shield,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api } from "../../services/apiClient.ts";
import { downloadDocumentSafe } from "../../utils/jalaali.ts";

export const DOCUMENT_TYPE_META: Record<
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

export const EntityDocumentsPanel: React.FC<{
  entityType: "property" | "customer";
  entityId: string;
}> = ({ entityType, entityId }) => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState(
    entityType === "property" ? "DEED" : "IDENTITY"
  );
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const url =
        entityType === "property"
          ? `/api/v1/documents/properties/${entityId}`
          : `/api/v1/documents/customers/${entityId}`;
      const res = await api.get(url);
      if (res.success && res.data) {
        setDocs(res.data);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      loadDocuments();
    }
  }, [entityId]);

  const filteredDocs = useMemo(
    () =>
      docs.filter((doc) => {
        const matchesType =
          filterType === "ALL" || doc.document_type === filterType;
        const q = search.toLowerCase().trim();
        const matchesQuery =
          !q ||
          doc.display_name?.toLowerCase().includes(q) ||
          doc.file_name?.toLowerCase().includes(q) ||
          doc.description?.toLowerCase().includes(q);
        return matchesType && matchesQuery;
      }),
    [docs, search, filterType]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10485760) {
        setUploadError("حجم فایل بیشتر از حد مجاز (۱۰ مگابایت) است.");
      } else {
        setUploadError(null);
        setSelectedFile(file);
        if (!displayName) {
          const baseName =
            file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
          setDisplayName(baseName);
        }
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      formData.append("display_name", displayName.trim() || selectedFile.name);
      if (description.trim()) {
        formData.append("description", description.trim());
      }
      const url =
        entityType === "property"
          ? `/api/v1/documents/properties/${entityId}`
          : `/api/v1/documents/customers/${entityId}`;
      const res = await api.upload(url, formData);
      if (res.success) {
        setSuccessMsg("سند با موفقیت در سامانه ذخیره و پیوست شد.");
        setTimeout(() => setSuccessMsg(null), 3500);
        setSelectedFile(null);
        setDisplayName("");
        setDescription("");
        setShowUpload(false);
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

  const handleArchiveDoc = async (docId: string) => {
    if (window.confirm("آیا از انتقال این سند به بایگانی اطمینان دارید؟")) {
      try {
        const res = await api.delete(`/api/v1/documents/${docId}`);
        if (res.success) {
          setSuccessMsg("سند با موفقیت بایگانی شد.");
          setTimeout(() => setSuccessMsg(null), 3000);
          loadDocuments();
        }
      } catch {
        window.alert("خطا در بایگانی سند.");
      }
    }
  };

  const formatSize = (bytes: number) =>
    bytes < 1048576
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / 1048576).toFixed(1)} MB`;

  const isImage = (mime: string, fileName: string) =>
    mime.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(fileName);

  return (
    <div className="space-y-3.5 pb-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h4 className="text-xs font-extrabold text-slate-800">
            {entityType === "property"
              ? "اسناد و مدارک ثبتی ملک"
              : "مدارک و پرونده هویتی متقاضی"}
          </h4>
          <p className="text-[11px] text-slate-500">
            {entityType === "property"
              ? "تصویر سند، پایان‌کار، پروانه، قولنامه‌ها و استعلام‌های ثبتی"
              : "کارت شناسایی، مدارک هویتی، اسناد مالی و ضمائم قرارداد"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-1.5 bg-[#145DB5] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs hover:bg-[#0F4383] transition cursor-pointer active:scale-98"
        >
          <Upload className="w-4 h-4" />
          <span>بارگذاری سند جدید</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {showUpload && (
        <div className="bg-[#F7F9FC] border border-blue-200 rounded-2xl p-4 space-y-3 animate-in fade-in shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h5 className="font-bold text-xs text-[#172033] flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#145DB5]" />
              <span>بارگذاری سند جدید برای این پرونده</span>
            </h5>
            <button
              type="button"
              onClick={() => {
                setShowUpload(false);
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
          <form onSubmit={handleUploadSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                دسته‌بندی و نوع مدرک:
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-[#145DB5]"
              >
                <option value="DEED">تصویر سند مالکیت (تک‌برگ / بنچاق)</option>
                <option value="CONTRACT">قولنامه / مبایعه‌نامه / اجاره‌نامه</option>
                <option value="IDENTITY">کارت شناسایی و هویتی</option>
                <option value="FINANCIAL">اسناد مالی / چک / فیش واریزی</option>
                <option value="PERMIT">پایان‌کار / پروانه ساخت / استعلام شهرداری</option>
                <option value="POWER_OF_ATTORNEY">
                  وکالت‌نامه / انحصار وراثت / حقوقی
                </option>
                <option value="OTHER">سایر اسناد و ضمائم</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                عنوان نمایشی سند:
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="مثلاً سند شش‌دانگ طبقه اول یا شناسنامه مالک"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-[#145DB5]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                انتخاب فایل (تصاویر JPG / PNG یا فایل PDF — حداکثر ۱۰ مگابایت):
              </label>
              <input
                type="file"
                required
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileSelect}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#145DB5] hover:file:bg-blue-100 cursor-pointer"
              />
              {selectedFile && (
                <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                  <CircleCheck className="w-3.5 h-3.5" />
                  فایل انتخابی: {selectedFile.name} (
                  {formatSize(selectedFile.size)})
                </p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                توضیحات تکمیلی (اختیاری):
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات راجع به دفترخانه، تاریخ استعلام یا وضعیت..."
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:border-[#145DB5]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowUpload(false);
                  setSelectedFile(null);
                  setUploadError(null);
                }}
                className="px-3.5 py-2 text-xs text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="px-5 py-2 bg-[#145DB5] text-white text-xs font-bold rounded-xl hover:bg-[#0F4383] disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm"
              >
                {uploading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>در حال بارگذاری و ثبت...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>ثبت و ذخیره سند</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {docs.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در نام یا توضیحات اسناد پیوست‌شده..."
              className="w-full pr-8 pl-3 py-1.5 bg-[#F7F9FC] border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#145DB5]"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition ${
                filterType === "ALL"
                  ? "bg-[#145DB5] text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              همه ({docs.length})
            </button>
            {Object.entries(DOCUMENT_TYPE_META).map(([typeKey, meta]) => {
              const count = docs.filter(
                (item) => item.document_type === typeKey
              ).length;
              if (count === 0) return null;
              return (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setFilterType(typeKey)}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition ${
                    filterType === typeKey
                      ? "bg-[#145DB5] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {meta.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500 space-y-2">
          <div className="w-5 h-5 rounded-full border-2 border-[#145DB5] border-t-transparent animate-spin mx-auto" />
          <p>در حال بارگذاری مدارک...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">
            {docs.length === 0
              ? "هیچ سندی هنوز پیوست نشده است"
              : "سندی با این فیلتر یافت نشد"}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            با کلیک روی دکمه «بارگذاری سند جدید»، می‌توانید اسناد مالکیت، کارت
            شناسایی یا قراردادها را اضافه کنید.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredDocs.map((doc) => {
            const typeMeta =
              DOCUMENT_TYPE_META[doc.document_type] || DOCUMENT_TYPE_META.OTHER;
            const img = isImage(doc.mime_type, doc.file_name);
            return (
              <div
                key={doc.id}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs hover:border-[#145DB5] transition"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    onClick={() => setPreviewDoc(doc)}
                    className="w-10 h-10 rounded-xl bg-blue-50 text-[#145DB5] flex items-center justify-center shrink-0 border border-blue-100 cursor-pointer hover:bg-blue-100 transition"
                    title="مشاهده پیش‌نمایش"
                  >
                    {img ? (
                      <Eye className="w-5 h-5 text-[#145DB5]" />
                    ) : (
                      <FileText className="w-5 h-5 text-[#145DB5]" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${typeMeta.color}`}
                      >
                        {typeMeta.label}
                      </span>
                      <h5
                        onClick={() => setPreviewDoc(doc)}
                        className="text-xs font-extrabold text-[#172033] truncate cursor-pointer hover:text-[#145DB5]"
                        title={doc.display_name}
                      >
                        {doc.display_name}
                      </h5>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                      <span>حجم: {formatSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>توسط: {doc.uploaded_by_name || "کاربر"}</span>
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
                    onClick={() => downloadDocumentSafe(doc, false)}
                    className="p-2 rounded-xl bg-blue-50 text-[#145DB5] hover:bg-blue-100 transition cursor-pointer"
                    title="دریافت فایل"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchiveDoc(doc.id)}
                    className="p-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                    title="بایگانی مدرک"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
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
            <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-slate-100 min-h-[220px]">
              {isImage(previewDoc.mime_type, previewDoc.file_name) ? (
                <img
                  src={`/api/v1/documents/${previewDoc.id}/download${
                    api.getToken()
                      ? `?token=${encodeURIComponent(api.getToken()!)}`
                      : ""
                  }`}
                  alt={previewDoc.display_name}
                  className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-md"
                />
              ) : (
                <div className="text-center p-6 space-y-3 bg-white rounded-xl shadow-xs border border-slate-200 max-w-xs">
                  <FileText className="w-12 h-12 text-[#145DB5] mx-auto" />
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">
                      {previewDoc.file_name}
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-1">
                      حجم: {formatSize(previewDoc.file_size)} • فرمت: PDF
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadDocumentSafe(previewDoc, false)}
                    className="w-full py-2 bg-[#145DB5] text-white rounded-xl font-bold text-xs hover:bg-[#0F4383] transition flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود و باز کردن فایل</span>
                  </button>
                </div>
              )}
            </div>
            <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                بارگذاری:{" "}
                {new Date(previewDoc.created_at).toLocaleDateString("fa-IR")}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadDocumentSafe(previewDoc, false)}
                  className="px-3 py-1.5 bg-[#145DB5] text-white rounded-xl font-bold text-xs hover:bg-[#0F4383] transition flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition"
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
