import React, { useState, useEffect, useRef } from "react";
import {
  Lock,
  Users,
  Share2,
  X,
  Image,
  FileText,
  ChevronLeft,
  Check,
  MapPin,
  Phone,
  Save,
  Shield,
  ChevronRight,
  Star,
  Trash2,
  Plus,
  Sparkles,
  Archive,
  Loader2,
  Pencil,
} from "lucide-react";
import { api } from "../../services/apiClient.ts";
import { offlineSync } from "../../services/offlineSync.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { formatCompactPrice } from "../../utils/jalaali.ts";
import { EntityDocumentsPanel } from "../common/EntityDocumentsPanel.tsx";
import { PropertyShareModal } from "./PropertyShareModal.tsx";

const normalizePropStatus = (status: string): string => {
  if (status === "AVAILABLE") return "ACTIVE";
  if (status === "UNDER_NEGOTIATION") return "NEGOTIATION";
  return status || "ACTIVE";
};

export const PropertyDetailModal: React.FC<{
  property: any;
  customers: any[];
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onStatusChanged?: (
    propertyId: string,
    newStatus: string,
    propertyTitle: string
  ) => void;
  onDeleted?: (propertyId: string, propertyTitle: string) => void;
}> = ({
  property: e,
  customers: t,
  isOpen: n,
  onClose: r,
  onRefresh: i,
  onStatusChanged,
  onDeleted,
}) => {
  const [a, o] = useState<"DETAILS" | "MEDIA" | "MATCHES" | "DOCUMENTS">("DETAILS");
  const [s, c] = useState<any[]>(e.media || []);
  const [l, u] = useState(0);
  const [d, f] = useState(false);
  const [p, m] = useState<any[]>([]);
  const [h, g] = useState(false);
  const [v, y] = useState<string | null>(null);
  const [x, C] = useState(false);
  const [w, E] = useState<string>(() => normalizePropStatus(e.status));
  const [D, O] = useState<string>(() => normalizePropStatus(e.status));
  const [transitionNotice, setTransitionNotice] = useState<{
    title: string;
    subtitle: string;
    isArchive: boolean;
  } | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const { user: k, tenant } = useAuth();
  const scope = tenant && k ? { tenantId: tenant.id, userId: k.id } : null;
  const A =
    k?.role_code === "BRANCH_MANAGER" ||
    k?.role_code === "ADMIN" ||
    k?.role_code === "OWNER";

  const [j, M] = useState<string>(e.visibility || "AGENCY");
  const [N, ee] = useState<string>(e.assigned_agent_id || "");
  const [P, te] = useState<string>(e.assigned_agent_name || "");
  const [F, I] = useState<string>(e.assigned_agent_id || "");
  const [ne, L] = useState<any[]>([]);
  const [R, re] = useState(false);
  const [ie, ae] = useState(false);
  const [currentNeighborhood, setCurrentNeighborhood] = useState<string>(
    e.address?.district || e.address?.neighborhood || ""
  );
  const [deletingNeighborhood, setDeletingNeighborhood] = useState(false);
  const [editingProp, setEditingProp] = useState(false);
  const [edTitle, setEdTitle] = useState(e.title || "");
  const [edArea, setEdArea] = useState(String(e.area_sqm || ""));
  const [edPriceTotal, setEdPriceTotal] = useState(String(e.price_total || ""));
  const [edDeposit, setEdDeposit] = useState(String(e.deposit_amount || ""));
  const [edRent, setEdRent] = useState(String(e.rent_amount || ""));
  const [edBedrooms, setEdBedrooms] = useState(String(e.bedrooms ?? ""));
  const [edFloor, setEdFloor] = useState(String(e.floor ?? ""));
  const [edNeighborhood, setEdNeighborhood] = useState(
    e.address?.district || e.address?.neighborhood || ""
  );
  const [edDesc, setEdDesc] = useState(e.description || "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteProp, setConfirmDeleteProp] = useState(false);
  const [deletingProp, setDeletingProp] = useState(false);

  useEffect(() => {
    const normalized = normalizePropStatus(e.status);
    E(normalized);
    O(normalized);
    M(e.visibility || "AGENCY");
    ee(e.assigned_agent_id || "");
    te(e.assigned_agent_name || "");
    I(e.assigned_agent_id || "");
    setCurrentNeighborhood(e.address?.district || e.address?.neighborhood || "");
    setEdTitle(e.title || "");
    setEdArea(String(e.area_sqm || ""));
    setEdPriceTotal(String(e.price_total || ""));
    setEdDeposit(String(e.deposit_amount || ""));
    setEdRent(String(e.rent_amount || ""));
    setEdBedrooms(String(e.bedrooms ?? ""));
    setEdFloor(String(e.floor ?? ""));
    setEdNeighborhood(e.address?.district || e.address?.neighborhood || "");
    setEdDesc(e.description || "");
    setEditingProp(false);
    setConfirmDeleteProp(false);
    setTransitionNotice(null);
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, [e]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!n) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (String(e.id || "").startsWith("offline-")) return;
    api
      .get(`/api/v1/properties/${e.id}/media`)
      .then((res) => {
        if (res.success && res.data) c(res.data);
      })
      .catch(() => {});
    api
      .get(`/api/v1/properties/${e.id}/matches`)
      .then((res) => {
        if (res.success && res.data) m(res.data);
      })
      .catch(() => {});
    if (A) {
      api
        .get("/api/v1/agency/agents")
        .then((res) => {
          if (res.success && res.data) L(res.data.filter((item: any) => item.is_active));
        })
        .catch(() => {});
    }
  }, [n, e.id, A]);

  if (!n) return null;

  const z = (msg: string) => {
    y(msg);
    setTimeout(() => y(null), 3500);
  };

  const oe = async (vis: string) => {
    if (vis !== j && scope) {
      re(true);
      try {
        const res = await offlineSync.mutate(scope, {
          method: "PATCH",
          path: `/api/v1/properties/${e.id}`,
          body: { visibility: vis },
          entityType: "PROPERTY",
          entityId: e.id,
          expectedUpdatedAt: e.updated_at || null,
          actionLabel: `تغییر سطح دسترسی ملک کد ${e.code}`,
        });
        if (res.success) {
          M(vis);
          e.visibility = vis;
          z(
            vis === "PRIVATE"
              ? "فایل به عنوان «فایل اختصاصی» تنظیم شد."
              : "فایل به عنوان «عمومی دفتر» تنظیم شد."
          );
          i();
        } else {
          z(res.error?.message || "خطا در تغییر سطح دسترسی.");
        }
      } catch {
        z("خطا در تغییر سطح دسترسی.");
      } finally {
        re(false);
      }
    }
  };

  const handleSavePropertyEdit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!scope || savingEdit) return;
    const areaNum = Number(edArea);
    if (!edTitle.trim() || !areaNum || areaNum <= 0) {
      z("عنوان و متراژ معتبر الزامی است.");
      return;
    }
    setSavingEdit(true);
    try {
      const payload: any = {
        title: edTitle.trim(),
        area_sqm: areaNum,
        bedrooms: edBedrooms !== "" ? Number(edBedrooms) : undefined,
        floor: edFloor !== "" ? Number(edFloor) : undefined,
        district: edNeighborhood.trim() || null,
        neighborhood: edNeighborhood.trim() || null,
        description: edDesc.trim() || undefined,
      };
      if (e.listing_type === "SALE") {
        payload.price_total = Number(edPriceTotal) || 0;
      } else {
        payload.deposit_amount = Number(edDeposit) || 0;
        payload.rent_amount = Number(edRent) || 0;
      }

      const res = await offlineSync.mutate(scope, {
        method: "PATCH",
        path: `/api/v1/properties/${e.id}`,
        body: payload,
        entityType: "PROPERTY",
        entityId: e.id,
        expectedUpdatedAt: e.updated_at || null,
        actionLabel: `ویرایش ملک «${payload.title}»`,
      });
      if (res.success) {
        Object.assign(e, payload);
        e.address = {
          ...(e.address || {}),
          district: payload.district || "",
          neighborhood: payload.neighborhood || "",
        };
        setCurrentNeighborhood(payload.neighborhood || "");
        setEditingProp(false);
        z(
          res.queuedOffline
            ? "ویرایش ملک در صف آفلاین ذخیره شد."
            : "مشخصات ملک با موفقیت ویرایش شد."
        );
        i();
      } else {
        z(res.error?.message || "خطا در ویرایش ملک.");
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteProperty = async () => {
    if (!scope || deletingProp) return;
    setDeletingProp(true);
    try {
      const res = await offlineSync.mutate(scope, {
        method: "DELETE",
        path: `/api/v1/properties/${e.id}`,
        entityType: "PROPERTY",
        entityId: e.id,
        expectedUpdatedAt: e.updated_at || null,
        actionLabel: `حذف ملک «${e.title}»`,
      });
      if (res.success) {
        onDeleted?.(e.id, e.title);
        i();
        r();
      } else {
        z(res.error?.message || "خطا در حذف ملک.");
      }
    } finally {
      setDeletingProp(false);
    }
  };

  const se = async () => {
    if (F && F !== N) {
      ae(true);
      try {
        const res = await api.patch(`/api/v1/properties/${e.id}/assign`, {
          assigned_to_user_id: F,
        });
        if (res.success) {
          ee(F);
          const found = ne.find((item) => item.id === F);
          if (found) te(found.display_name);
          z("فایل ملک با موفقیت به مشاور جدید واگذار شد.");
          i();
        } else {
          z(res.error?.message || "خطا در واگذاری فایل.");
        }
      } catch {
        z("خطا در برقراری ارتباط با سرور.");
      } finally {
        ae(false);
      }
    }
  };

  const H = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (file) {
      g(true);
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const result = reader.result;
          const res = await api.post(`/api/v1/properties/${e.id}/media`, {
            file_name: file.name,
            base64: result,
            mime_type: file.type,
            media_type: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
            file_size: file.size,
            is_cover: s.length === 0,
          });
          if (res.success && res.data) {
            c((prev) => [...prev, res.data]);
            z("تصویر با موفقیت بارگذاری شد.");
            i();
          } else {
            z("خطا در بارگذاری تصویر.");
          }
          g(false);
        };
        reader.readAsDataURL(file);
      } catch {
        g(false);
        z("خطا در خواندن فایل.");
      }
    }
  };

  const U = async (url: string, label: string) => {
    g(true);
    try {
      const res = await api.post(`/api/v1/properties/${e.id}/media`, {
        file_name: label,
        file_url: url,
        mime_type: "image/jpeg",
        media_type: "IMAGE",
        file_size: 150000,
        is_cover: s.length === 0,
      });
      if (res.success && res.data) {
        c((prev) => [...prev, res.data]);
        z("عکس نمونه اضافه شد.");
        i();
      }
    } finally {
      g(false);
    }
  };

  const le = async (mediaId: string) => {
    const res = await api.patch(`/api/v1/properties/${e.id}/media/${mediaId}/cover`);
    if (res.success) {
      c((prev) =>
        prev.map((item) => ({
          ...item,
          is_cover: item.id === mediaId,
        }))
      );
      z("عکس شاخص تعیین شد.");
      i();
    }
  };

  const ue = async (mediaId: string) => {
    if (window.confirm("آیا از حذف این تصویر اطمینان دارید?")) {
      const res = await api.delete(`/api/v1/properties/${e.id}/media/${mediaId}`);
      if (res.success) {
        c((prev) => prev.filter((item) => item.id !== mediaId));
        if (l >= s.length - 1) u(Math.max(0, s.length - 2));
        z("تصویر حذف شد.");
        i();
      }
    }
  };

  const de = async () => {
    const nextCanonical = normalizePropStatus(D);
    const prevStatus = normalizePropStatus(w);
    if (nextCanonical === prevStatus || !scope) return;

    C(true);
    E(nextCanonical);
    try {
      const res = await offlineSync.mutate(scope, {
        method: "PATCH",
        path: `/api/v1/properties/${e.id}/status`,
        body: { status: nextCanonical },
        entityType: "PROPERTY",
        entityId: e.id,
        expectedUpdatedAt: e.updated_at || null,
        actionLabel: `تغییر وضعیت ملک «${e.title}»`,
      });
      if (res.success) {
        e.status = nextCanonical;
        e.is_archived = nextCanonical === "ARCHIVED";
        const isMovingToArchive =
          nextCanonical === "ARCHIVED" && prevStatus !== "ARCHIVED";
        const isRestoringFromArchive =
          prevStatus === "ARCHIVED" && nextCanonical !== "ARCHIVED";

        if (isMovingToArchive || isRestoringFromArchive) {
          setTransitionNotice(
            isMovingToArchive
              ? {
                  title: "در حال انتقال ملک به بایگانی...",
                  subtitle:
                    "این فایل تا لحظاتی دیگر از لیست فعال و آماده حذف و به بایگانی منتقل می‌شود.",
                  isArchive: true,
                }
              : {
                  title: "در حال بازگردانی ملک به لیست فعال...",
                  subtitle:
                    "این فایل تا لحظاتی دیگر از بایگانی خارج و به فهرست فعال و آماده بازگردانده می‌شود.",
                  isArchive: false,
                }
          );

          if (transitionTimerRef.current !== null) {
            window.clearTimeout(transitionTimerRef.current);
          }
          transitionTimerRef.current = window.setTimeout(() => {
            transitionTimerRef.current = null;
            setTransitionNotice(null);
            onStatusChanged?.(e.id, nextCanonical, e.title);
            i();
            r();
          }, 2200);
        } else {
          z(
            res.queuedOffline
              ? `وضعیت به «${fe(nextCanonical)}» تغییر کرد (در صف همگام‌سازی).`
              : `وضعیت پرونده با موفقیت به «${fe(nextCanonical)}» تغییر و ذخیره شد.`
          );
          onStatusChanged?.(e.id, nextCanonical, e.title);
          i();
        }
      } else {
        E(prevStatus);
        O(prevStatus);
        z(res.error?.message || "خطا در ذخیره وضعیت ملک.");
      }
    } catch {
      E(prevStatus);
      O(prevStatus);
      z("خطا در تغییر وضعیت ملک.");
    } finally {
      C(false);
    }
  };

  const fe = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "AVAILABLE":
        return "فعال و آماده";
      case "NEGOTIATION":
      case "UNDER_NEGOTIATION":
        return "در حال مذاکره";
      case "RESERVED":
        return "رزرو شده";
      case "ARCHIVED":
        return "بایگانی شده";
      case "SOLD":
        return "فروخته‌شده";
      case "RENTED":
        return "اجاره‌داده‌شده";
      default:
        return status;
    }
  };

  const W = s[l];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 select-none">
      <div className="relative w-full max-w-lg max-h-[94vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom">
        {transitionNotice && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-30 bg-white/95 backdrop-blur-xs rounded-t-2xl sm:rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 relative">
              <Archive className="w-6 h-6 text-[#145DB5]" />
              <Loader2 className="w-12 h-12 text-[#145DB5]/40 animate-spin absolute" />
            </div>
            <h3 className="text-sm font-extrabold text-[#172033] mb-1.5">
              {transitionNotice.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mb-4">
              {transitionNotice.subtitle}
            </p>
            <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#145DB5] rounded-full animate-pulse w-full" />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-100 sticky top-0 bg-white z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#145DB5] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              کد {e.code}
            </span>
            <span className="text-xs font-bold text-slate-700">
              {e.listing_type === "SALE" ? "فروش" : "رهن و اجاره"}
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                w === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700"
                  : w === "ARCHIVED"
                  ? "bg-slate-100 text-slate-600"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {fe(w)}
            </span>
            {j === "PRIVATE" ? (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                <span>فایل اختصاصی</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Users className="w-2.5 h-2.5" />
                <span>عمومی دفتر</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {(A ||
              e.assigned_agent_id === k?.id ||
              e.created_by_user_id === k?.id) && (
              <button
                type="button"
                onClick={() => {
                  o("DETAILS");
                  setEditingProp((prev) => !prev);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  editingProp
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white border-slate-300 text-slate-700 hover:border-[#145DB5] hover:text-[#145DB5]"
                }`}
                title="ویرایش مشخصات ملک"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{editingProp ? "بستن ویرایش" : "ویرایش"}</span>
              </button>
            )}
            <button
              onClick={() => f(true)}
              className="flex items-center gap-1 bg-[#145DB5] text-white px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-[#0F4383] transition"
              title="اشتراک‌گذاری امن با مشتری"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>ارسال</span>
            </button>
            <button
              onClick={r}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {v && (
          <div className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 text-center">
            {v}
          </div>
        )}

        <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-50 text-xs font-bold">
          <button
            onClick={() => o("DETAILS")}
            className={`py-2 text-center transition ${
              a === "DETAILS"
                ? "bg-white text-[#145DB5] border-b-2 border-[#145DB5]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            مشخصات کامل
          </button>
          <button
            onClick={() => o("MEDIA")}
            className={`py-2 text-center transition flex items-center justify-center gap-1 ${
              a === "MEDIA"
                ? "bg-white text-[#145DB5] border-b-2 border-[#145DB5]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>گالری</span>
            {s.length > 0 && (
              <span className="bg-blue-100 text-[#145DB5] text-[10px] px-1.5 py-0.2 rounded-full">
                {s.length}
              </span>
            )}
          </button>
          <button
            onClick={() => o("MATCHES")}
            className={`py-2 text-center transition flex items-center justify-center gap-1 ${
              a === "MATCHES"
                ? "bg-white text-[#145DB5] border-b-2 border-[#145DB5]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>متقاضیان</span>
            {p.length > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full">
                {p.length}
              </span>
            )}
          </button>
          <button
            onClick={() => o("DOCUMENTS")}
            className={`py-2 text-center transition flex items-center justify-center gap-1 ${
              a === "DOCUMENTS"
                ? "bg-white text-[#145DB5] border-b-2 border-[#145DB5]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>اسناد ملک</span>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {a === "DETAILS" && editingProp && (
            <form
              onSubmit={handleSavePropertyEdit}
              className="space-y-3 bg-blue-50/40 border border-blue-200 rounded-2xl p-3.5"
            >
              <h4 className="font-extrabold text-[#145DB5] text-xs">
                ویرایش مشخصات ملک
              </h4>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  عنوان ملک
                </label>
                <input
                  type="text"
                  required
                  value={edTitle}
                  onChange={(ev) => setEdTitle(ev.target.value)}
                  className="w-full bg-white rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    متراژ (متر)
                  </label>
                  <input
                    type="number"
                    required
                    value={edArea}
                    onChange={(ev) => setEdArea(ev.target.value)}
                    className="w-full bg-white rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    محله
                  </label>
                  <input
                    type="text"
                    value={edNeighborhood}
                    onChange={(ev) => setEdNeighborhood(ev.target.value)}
                    className="w-full bg-white rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>
              {e.listing_type === "SALE" ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    قیمت کل (تومان)
                  </label>
                  <input
                    type="number"
                    value={edPriceTotal}
                    onChange={(ev) => setEdPriceTotal(ev.target.value)}
                    className="w-full bg-white rounded-lg border border-slate-300 p-2 text-xs font-mono"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      ودیعه (تومان)
                    </label>
                    <input
                      type="number"
                      value={edDeposit}
                      onChange={(ev) => setEdDeposit(ev.target.value)}
                      className="w-full bg-white rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      اجاره ماهانه (تومان)
                    </label>
                    <input
                      type="number"
                      value={edRent}
                      onChange={(ev) => setEdRent(ev.target.value)}
                      className="w-full bg-white rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    تعداد خواب
                  </label>
                  <input
                    type="number"
                    value={edBedrooms}
                    onChange={(ev) => setEdBedrooms(ev.target.value)}
                    className="w-full bg-white rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    طبقه
                  </label>
                  <input
                    type="number"
                    value={edFloor}
                    onChange={(ev) => setEdFloor(ev.target.value)}
                    className="w-full bg-white rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  توضیحات
                </label>
                <textarea
                  rows={2}
                  value={edDesc}
                  onChange={(ev) => setEdDesc(ev.target.value)}
                  className="w-full bg-white rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 disabled:opacity-50"
                >
                  {savingEdit ? "در حال ذخیره..." : "ذخیره تغییرات ملک"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProp(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs"
                >
                  انصراف
                </button>
              </div>
            </form>
          )}
          {a === "DETAILS" && (
            <div className="space-y-4">
              {s.length > 0 && (
                <div
                  onClick={() => o("MEDIA")}
                  className="relative h-44 rounded-2xl overflow-hidden cursor-pointer group bg-slate-100"
                >
                  <img
                    src={s.find((item) => item.is_cover)?.file_url || s[0].file_url}
                    alt={e.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-between p-3 text-white">
                    <span className="text-[11px] font-bold flex items-center gap-1">
                      <Image className="w-3.5 h-3.5" />
                      مشاهده {s.length} تصویر در گالری
                    </span>
                    <span className="bg-[#145DB5] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      باز کردن
                    </span>
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-sm font-extrabold text-[#172033] mb-1.5 leading-snug">
                  {e.title}
                </h2>
                <div className="bg-[#F7F9FC] border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">مبلغ و شرایط مالی:</span>
                    <span className="font-black text-[#145DB5] text-sm">
                      {e.listing_type === "SALE"
                        ? formatCompactPrice(e.price_total)
                        : `${formatCompactPrice(e.deposit_amount)} ودیعه / ${formatCompactPrice(
                            e.rent_amount
                          )} اجاره`}
                    </span>
                  </div>
                  {e.listing_type === "SALE" && e.price_per_meter && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">قیمت هر متر:</span>
                      <span className="font-bold text-slate-700">
                        {formatCompactPrice(e.price_per_meter)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => o("DOCUMENTS")}
                className="w-full bg-amber-50/80 hover:bg-amber-100/90 text-amber-900 border border-amber-200/80 p-3 rounded-xl font-bold flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-amber-950">
                      اسناد و مدارک ثبتی این ملک
                    </p>
                    <p className="text-[10px] text-amber-700 font-normal">
                      تصویر سند، قولنامه، پایان‌کار و مدارک مالک
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-extrabold text-[#145DB5] bg-white px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
                  <span>مشاهده و ثبت مدارک</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </div>
              </button>

              <div>
                <h4 className="font-extrabold text-slate-800 mb-2">
                  مشخصات فنی و متراژ:
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between">
                    <span className="text-slate-500">متراژ سندی:</span>
                    <span className="font-bold text-slate-800">
                      {e.area_sqm} متر مربع
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between">
                    <span className="text-slate-500">تعداد اتاق:</span>
                    <span className="font-bold text-slate-800">
                      {e.bedrooms || "—"} خواب
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between">
                    <span className="text-slate-500">طبقه واحد:</span>
                    <span className="font-bold text-slate-800">
                      طبقه {e.floor || "—"} {e.total_floors ? `از ${e.total_floors}` : ""}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between">
                    <span className="text-slate-500">سال ساخت:</span>
                    <span className="font-bold text-slate-800">
                      {e.year_built || "نوساز"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-800 mb-2">امکانات اصلی:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "پارکینگ اختصاصی", has: e.has_parking },
                    { label: "آسانسور فعال", has: e.has_elevator },
                    { label: "انباری سندی", has: e.has_storage },
                    { label: "بالکن / تراس", has: e.has_balcony },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-bold ${
                        item.has
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-slate-50 border-slate-200 text-slate-400 line-through"
                      }`}
                    >
                      <Check
                        className={`w-3.5 h-3.5 ${
                          item.has ? "text-emerald-600" : "text-slate-400"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-800 mb-2">موقعیت و محله:</h4>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <MapPin className="w-4 h-4 text-[#145DB5]" />
                      <span className="text-xs font-black text-[#145DB5] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        محله: {currentNeighborhood || "مشخص نشده"}
                      </span>
                    </div>
                    {currentNeighborhood &&
                      (A ||
                        e.assigned_agent_id === k?.id ||
                        e.created_by_user_id === k?.id) && (
                        <button
                          type="button"
                          disabled={deletingNeighborhood}
                          onClick={async () => {
                            if (!scope) return;
                            setDeletingNeighborhood(true);
                            try {
                              const res = await offlineSync.mutate(scope, {
                                method: "PATCH",
                                path: `/api/v1/properties/${e.id}`,
                                body: { neighborhood: null, district: null },
                                entityType: "PROPERTY",
                                entityId: e.id,
                                expectedUpdatedAt: e.updated_at || null,
                                actionLabel: `حذف محله ملک کد ${e.code}`,
                              });
                              if (res.success) {
                                setCurrentNeighborhood("");
                                z("محله این ملک حذف شد.");
                                i();
                              } else {
                                z(res.error?.message || "خطا در حذف محله.");
                              }
                            } catch {
                              z("خطا در حذف محله.");
                            } finally {
                              setDeletingNeighborhood(false);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold hover:bg-rose-100 disabled:opacity-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>
                            {deletingNeighborhood ? "در حال حذف..." : "حذف محله"}
                          </span>
                        </button>
                      )}
                  </div>
                  {e.address.street && (
                    <p className="text-[11px] text-slate-600 pr-5">
                      خیابان/کوچه: {e.address.street}
                    </p>
                  )}
                </div>
              </div>

              {e.description && (
                <div>
                  <h4 className="font-extrabold text-slate-800 mb-1">
                    توضیحات و یادداشت مشاور:
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-wrap">
                    {e.description}
                  </p>
                </div>
              )}

              {e.owners && e.owners.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-900 text-xs">
                      اطلاعات مالک (محرمانه):
                    </span>
                    <span className="text-[10px] text-amber-700 font-bold">
                      فقط پرسنل آژانس
                    </span>
                  </div>
                  {e.owners.map((owner: any) => (
                    <div
                      key={owner.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">
                          {owner.display_name}
                        </span>
                        {owner.notes && (
                          <span className="text-[11px] text-slate-500 block">
                            {owner.notes}
                          </span>
                        )}
                      </div>
                      <a
                        href={`tel:${owner.phone}`}
                        className="flex items-center gap-1 bg-amber-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-amber-700"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span dir="ltr">{owner.phone}</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-800 text-xs">
                    تغییر وضعیت پرونده ملک:
                  </label>
                  <span className="text-[11px] text-slate-500">
                    وضعیت فعلی: <strong className="text-[#145DB5]">{fe(w)}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "ACTIVE", label: "فعال و آماده" },
                    { id: "NEGOTIATION", label: "در حال مذاکره" },
                    { id: "RESERVED", label: "رزرو شده" },
                    { id: "ARCHIVED", label: "بایگانی شده" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      disabled={Boolean(transitionNotice)}
                      onClick={() => O(st.id)}
                      className={`py-2 px-2 rounded-xl font-bold border transition text-center text-xs flex items-center justify-center gap-1 ${
                        D === st.id
                          ? "bg-[#145DB5] text-white border-[#145DB5] shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {D === st.id && <Check className="w-3.5 h-3.5" />}
                      <span>{st.label}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={x || Boolean(transitionNotice) || D === w}
                  onClick={de}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black shadow-md transition ${
                    D === w
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                      : "bg-[#145DB5] text-white hover:bg-[#0F4383] active:scale-98 cursor-pointer"
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {x || transitionNotice
                      ? "در حال ذخیره تغییرات..."
                      : D === w
                      ? "ذخیره تغییرات"
                      : `ذخیره تغییرات (تغییر به «${fe(D)}»)`}
                  </span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#145DB5]" />
                    <h4 className="font-extrabold text-slate-800 text-xs">
                      سطح دسترسی و مشاور مسئول پرونده
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                      j === "PRIVATE"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-sky-50 text-sky-800 border border-sky-200"
                    }`}
                  >
                    {j === "PRIVATE" ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <Users className="w-3 h-3" />
                    )}
                    {j === "PRIVATE" ? "فایل اختصاصی" : "عمومی دفتر"}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    دسترسی به فایل:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={
                        R ||
                        (!A &&
                          e.assigned_agent_id !== k?.id &&
                          e.created_by_user_id !== k?.id)
                      }
                      onClick={() => oe("AGENCY")}
                      className={`p-2 rounded-lg border text-right transition ${
                        j === "AGENCY"
                          ? "bg-blue-50 border-[#145DB5] text-[#145DB5]"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>عمومی دفتر</span>
                        {j === "AGENCY" && (
                          <Check className="w-3 h-3 text-[#145DB5]" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        مشاوران مجاز این دفتر نیز می‌توانند فایل را ببینند.
                      </p>
                    </button>
                    <button
                      type="button"
                      disabled={
                        R ||
                        (!A &&
                          e.assigned_agent_id !== k?.id &&
                          e.created_by_user_id !== k?.id)
                      }
                      onClick={() => oe("PRIVATE")}
                      className={`p-2 rounded-lg border text-right transition ${
                        j === "PRIVATE"
                          ? "bg-amber-50 border-amber-500 text-amber-800"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>فایل اختصاصی</span>
                        {j === "PRIVATE" && (
                          <Check className="w-3 h-3 text-amber-600" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        فایل برای مشاور مسئول و مدیریت دفتر قابل مشاهده است.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="bg-[#F7F9FC] border border-slate-200 rounded-xl p-3 space-y-2.5">
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
                        {e.assigned_agent_name || P || "مشخص‌نشده"}
                      </span>
                    </div>
                  </div>
                  {A && (
                    <div className="pt-2 border-t border-slate-200/80 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-700">
                        واگذاری فایل به مشاور دیگر (ویژه مدیریت دفتر):
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={F}
                          onChange={(ev) => I(ev.target.value)}
                          className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#145DB5]"
                        >
                          <option value="">انتخاب مشاور مقصد...</option>
                          {ne.map((ag) => (
                            <option key={ag.id} value={ag.id}>
                              {ag.display_name} (
                              {ag.role_code === "BRANCH_MANAGER" ? "مدیریت" : "مشاور"})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!F || F === N || ie}
                          onClick={se}
                          className="px-3 py-2 bg-[#145DB5] text-white text-xs font-bold rounded-lg hover:bg-[#0F4383] disabled:bg-slate-200 disabled:text-slate-400 transition"
                        >
                          {ie ? "در حال واگذاری..." : "واگذاری فایل"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {(A ||
                e.assigned_agent_id === k?.id ||
                e.created_by_user_id === k?.id) && (
                <div className="pt-3 border-t border-slate-200">
                  {!confirmDeleteProp ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteProp(true)}
                      className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف کامل فایل ملک</span>
                    </button>
                  ) : (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2">
                      <p className="text-[11px] font-bold text-rose-800">
                        آیا از حذف کامل این فایل مطمئن هستید؟ در حالت آفلاین پس از اتصال اینترنت از سرور نیز حذف می‌شود.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={deletingProp}
                          onClick={handleDeleteProperty}
                          className="flex-1 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
                        >
                          {deletingProp ? "در حال حذف..." : "تأیید و حذف"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteProp(false)}
                          className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold"
                        >
                          انصراف
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {a === "MEDIA" && (
            <div className="space-y-4">
              {s.length > 0 ? (
                <div className="space-y-2">
                  <div className="relative h-60 bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                    {W?.media_type === "VIDEO" ? (
                      <video
                        src={W.file_url}
                        controls={true}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <img
                        src={W?.file_url}
                        alt="Property view"
                        className="w-full h-full object-contain"
                      />
                    )}
                    {s.length > 1 && (
                      <>
                        <button
                          onClick={() => u((prev) => (prev > 0 ? prev - 1 : s.length - 1))}
                          className="absolute right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => u((prev) => (prev < s.length - 1 ? prev + 1 : 0))}
                          className="absolute left-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1">
                      {W?.is_cover && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          تصویر شاخص
                        </span>
                      )}
                      <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                        {l + 1} از {s.length}
                      </span>
                    </div>
                  </div>
                  {W && (
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        {!W.is_cover && (
                          <button
                            onClick={() => le(W.id)}
                            className="flex items-center gap-1 text-[11px] font-bold text-[#145DB5] hover:underline"
                          >
                            <Star className="w-3.5 h-3.5" />
                            <span>تنظیم به عنوان کاور</span>
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => ue(W.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف تصویر</span>
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {s.map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => u(idx)}
                        className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 cursor-pointer border-2 transition relative ${
                          l === idx
                            ? "border-[#145DB5] scale-95"
                            : "border-transparent opacity-75"
                        }`}
                      >
                        <img
                          src={item.file_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {item.is_cover && (
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500 absolute top-0.5 right-0.5" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <Image className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 mb-1">
                    هنوز تصویری برای این ملک ثبت نشده است
                  </p>
                  <p className="text-[11px] text-slate-500">
                    تصاویر را اضافه کنید تا مشتریان در کاتالوگ آنلاین آن را مشاهده فرمایند.
                  </p>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-extrabold text-slate-800 block text-xs">
                  افزودن تصویر جدید به گالری:
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-1.5 bg-[#145DB5] text-white py-2 rounded-xl font-bold text-xs cursor-pointer hover:bg-[#0F4383] transition">
                    <Plus className="w-4 h-4" />
                    <span>{h ? "در حال بارگذاری..." : "انتخاب از گالری گوشی"}</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={H}
                      disabled={h}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    یا بارگذاری تصاویر نمونه باکیفیت ملکی:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    <button
                      type="button"
                      disabled={h}
                      onClick={() =>
                        U(
                          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
                          "نمای پذیرایی لوکس"
                        )
                      }
                      className="p-1.5 rounded-lg border border-slate-300 bg-white font-semibold hover:border-[#145DB5] text-slate-700 truncate"
                    >
                      سالن پذیرایی
                    </button>
                    <button
                      type="button"
                      disabled={h}
                      onClick={() =>
                        U(
                          "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
                          "آشپزخانه مدرن"
                        )
                      }
                      className="p-1.5 rounded-lg border border-slate-300 bg-white font-semibold hover:border-[#145DB5] text-slate-700 truncate"
                    >
                      آشپزخانه
                    </button>
                    <button
                      type="button"
                      disabled={h}
                      onClick={() =>
                        U(
                          "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80",
                          "اتاق خواب مستر"
                        )
                      }
                      className="p-1.5 rounded-lg border border-slate-300 bg-white font-semibold hover:border-[#145DB5] text-slate-700 truncate"
                    >
                      اتاق خواب
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {a === "MATCHES" && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-[#145DB5]">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Sparkles className="w-4 h-4 text-[#145DB5]" />
                  <span>سیستم تطبیق هوشمند فایل با خریداران فعال</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  متقاضیانی که بودجه و اولویت‌های محله‌ای آن‌ها با مشخصات این ملک همخوانی دارد:
                </p>
              </div>
              {p.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">مشتری منطبق یافت نشد</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    با ثبت متقاضیان جدید، هوش سامانه به محض تشابه بودجه و شرایط آن را اعلام خواهد کرد.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {p.map((match) => (
                    <div
                      key={match.customer.id}
                      className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 hover:border-[#145DB5] transition shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#172033] text-xs">
                            {match.customer.display_name}
                          </span>
                          <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                            {match.score}٪ تطابق
                          </span>
                        </div>
                        <span
                          className="text-[11px] text-slate-500 font-medium"
                          dir="ltr"
                        >
                          {match.customer.phone}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {match.reasons.map((reason: string, idx: number) => (
                          <span
                            key={idx}
                            className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded"
                          >
                            ✓ {reason}
                          </span>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          {match.customer.customer_type === "BUYER"
                            ? "خریدار ملک"
                            : "مستأجر"}
                        </span>
                        <button
                          onClick={() => {
                            f(true);
                          }}
                          className="flex items-center gap-1 bg-[#145DB5] text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-[#0F4383] transition"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>ارسال به این مشتری</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {a === "DOCUMENTS" && (
            <EntityDocumentsPanel entityType="property" entityId={e.id} />
          )}
        </div>

        <div className="p-3.5 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex items-center gap-2">
          <button
            onClick={() => f(true)}
            className="flex-1 bg-[#145DB5] text-white py-2.5 rounded-xl font-bold text-xs shadow-md hover:bg-[#0F4383] active:scale-98 transition flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>اشتراک‌گذاری امن و ارسال لینک</span>
          </button>
          <button
            onClick={r}
            className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition"
          >
            بستن
          </button>
        </div>
      </div>

      {d && (
        <PropertyShareModal
          property={e}
          customers={t}
          isOpen={d}
          onClose={() => f(false)}
          onShareComplete={() => {
            z("رویداد اشتراک‌گذاری در سوابق ثبت شد.");
            i();
          }}
        />
      )}
    </div>
  );
};
