import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Archive,
  Search,
  X,
  SlidersHorizontal,
  Building2,
  ChevronRight,
  ChevronLeft,
  Trash2,
  MapPin,
} from "lucide-react";
import {
  DEFAULT_PROPERTY_FILTERS,
  PropertyFilterModal,
  type PropertyFilters,
} from "../components/modals/PropertyFilterModal.tsx";
import { api } from "../services/apiClient.ts";
import { offlineSync } from "../services/offlineSync.ts";
import { usePropertyPage } from "../utils/crmWorkflows.tsx";
import { formatCompactPrice } from "../utils/jalaali.ts";
import { EmptyState } from "../components/common/EmptyState.tsx";
import { PropertyCard } from "../components/common/PropertyCard.tsx";
import { PropertyDetailModal } from "../components/modals/PropertyDetailModal.tsx";

export const PROPERTY_PAGE_SIZE = 10;

export const PropertiesPage: React.FC<{
  properties: any[];
  customers?: any[];
  onOpenQuickAdd: () => void;
  onRefresh: () => void;
  activeBranchId?: string;
}> = ({
  properties: e,
  customers: t = [],
  onOpenQuickAdd: n,
  onRefresh: r,
  activeBranchId: branchId,
}) => {
  const [i, a] = useState("");
  const [o, s] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [c, l] = useState<PropertyFilters>(DEFAULT_PROPERTY_FILTERS);
  const [u, d] = useState(false);
  const [f, p] = useState<any>(null);
  const [m, h] = useState(1);
  const [localRefreshTick, setLocalRefreshTick] = useState(0);
  const [optimisticStatusMap, setOptimisticStatusMap] = useState<
    Record<string, string>
  >({});
  const [statusFeedback, setStatusFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pendingDeleteNeighborhood, setPendingDeleteNeighborhood] = useState<string | null>(null);
  const [deletingNeighborhood, setDeletingNeighborhood] = useState<string | null>(null);
  const [neighborhoodFeedback, setNeighborhoodFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    h(1);
  }, [o, i, c, branchId]);

  useEffect(() => {
    return offlineSync.subscribe(() => {
      setLocalRefreshTick((prev) => prev + 1);
    });
  }, []);

  const g = useMemo(() => {
    const set = new Set<string>();
    e.forEach((prop) => {
      const nName = (prop.address?.district || prop.address?.neighborhood || "").trim();
      if (nName) set.add(nName);
    });
    return Array.from(set);
  }, [e]);

  const v = useMemo(() => {
    let count = 0;
    if (c.visibility && c.visibility !== "ALL") count++;
    if (c.listingType !== "ALL") count++;
    if (c.propertyType !== "ALL") count++;
    if (c.status !== "ALL") count++;
    if (c.neighborhood.trim()) count++;
    if (c.minPrice !== "") count++;
    if (c.maxPrice !== "") count++;
    if (c.minArea !== "") count++;
    if (c.maxArea !== "") count++;
    if (c.bedrooms !== "ALL") count++;
    if (c.hasParking) count++;
    if (c.hasElevator) count++;
    if (c.hasStorage) count++;
    if (c.hasBalcony) count++;
    return count;
  }, [c]);

  const propertyPage = usePropertyPage({
    page: m,
    setPage: h,
    tab: o,
    search: i,
    filters: c,
    branchId,
    refreshKey: e.length + localRefreshTick,
  });

  const y = propertyPage.data;

  useEffect(() => {
    setOptimisticStatusMap((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      for (const id of keys) {
        const target = next[id];
        const found = y.find((item) => item.id === id);
        if (o === "ACTIVE") {
          if (target === "ARCHIVED" && !found) {
            delete next[id];
            changed = true;
          }
        } else if (o === "ARCHIVED") {
          if (target !== "ARCHIVED" && !found) {
            delete next[id];
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [y, o]);

  const x = useMemo(() => {
    return y.filter((prop) => {
      const override = optimisticStatusMap[prop.id];
      if (!override) return true;
      return o === "ACTIVE" ? override !== "ARCHIVED" : override === "ARCHIVED";
    });
  }, [y, optimisticStatusMap, o]);

  const visibleTotal = Math.max(0, propertyPage.total - (y.length - x.length));
  const b = Math.max(1, Math.ceil(visibleTotal / PROPERTY_PAGE_SIZE));
  const C = () => {
    l(DEFAULT_PROPERTY_FILTERS);
    a("");
  };

  const handleDeleteNeighborhood = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || deletingNeighborhood) return;
    setDeletingNeighborhood(trimmed);
    setNeighborhoodFeedback(null);
    try {
      const res = await api.delete(
        `/api/v1/properties/neighborhoods?name=${encodeURIComponent(trimmed)}`
      );
      if (res.success) {
        if (c.neighborhood === trimmed) {
          l((prev) => ({ ...prev, neighborhood: "" }));
        }
        setPendingDeleteNeighborhood(null);
        setLocalRefreshTick((prev) => prev + 1);
        r?.();
        setNeighborhoodFeedback({
          type: "success",
          text: `محله «${trimmed}» با موفقیت حذف شد.`,
        });
        setTimeout(() => setNeighborhoodFeedback(null), 3500);
      } else {
        setNeighborhoodFeedback({
          type: "error",
          text: res.error?.message || "خطا در حذف محله.",
        });
      }
    } catch {
      setNeighborhoodFeedback({
        type: "error",
        text: "ارتباط با سرور برای حذف محله برقرار نشد.",
      });
    } finally {
      setDeletingNeighborhood(null);
    }
  };

  return (
    <div className="space-y-3 pb-24 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-[#172033]">فایلینگ و املاک</h2>
          <p className="text-xs text-[#667085]">
            {o === "ACTIVE"
              ? `فهرست فایل‌های فعال و آماده معامله (${visibleTotal} فایل)`
              : `آرشیو پرونده‌های بایگانی‌شده (${visibleTotal} فایل)`}
          </p>
        </div>
        <button
          onClick={n}
          className="flex items-center gap-1 bg-[#145DB5] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:bg-[#0F4383] active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت ملک</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => s("ACTIVE")}
          className={`py-2 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
            o === "ACTIVE"
              ? "bg-white text-[#145DB5] shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>فقط فعال و آماده</span>
        </button>
        <button
          type="button"
          onClick={() => s("ARCHIVED")}
          className={`py-2 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
            o === "ARCHIVED"
              ? "bg-white text-slate-800 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Archive className="w-3.5 h-3.5 text-slate-500" />
          <span>بایگانی شده</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={i}
            onChange={(ev) => a(ev.target.value)}
            placeholder="جستجو با کد ملک، عنوان، محله یا توضیحات..."
            className="w-full bg-white rounded-xl border border-slate-300 p-2.5 pr-9 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          {i && (
            <button
              onClick={() => a("")}
              className="absolute left-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => d(true)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition ${
            v > 0
              ? "bg-[#145DB5] text-white border-[#145DB5]"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          }`}
          title="فیلترهای پیشرفته"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">فیلترها</span>
          {v > 0 && (
            <span className="bg-white text-[#145DB5] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-black">
              {v}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {[
          { id: "ALL", label: "همه معامله‌ها" },
          { id: "SALE", label: "فروش" },
          { id: "RENT", label: "رهن و اجاره" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => l({ ...c, listingType: item.id })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition shrink-0 ${
              c.listingType === item.id
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {g.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#145DB5]" />
              <span>محله‌ها ({g.length})</span>
            </span>
            {c.neighborhood && (
              <button
                type="button"
                onClick={() => l({ ...c, neighborhood: "" })}
                className="text-[11px] font-bold text-[#145DB5] hover:underline"
              >
                نمایش همه محله‌ها
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {g.map((nName) => {
              const isSelected = c.neighborhood === nName;
              const isPending = pendingDeleteNeighborhood === nName;
              return (
                <div
                  key={nName}
                  className={`inline-flex items-center rounded-lg border text-[11px] font-semibold overflow-hidden transition ${
                    isSelected
                      ? "bg-[#145DB5] text-white border-[#145DB5]"
                      : isPending
                      ? "bg-rose-50 text-rose-800 border-rose-500"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      l({ ...c, neighborhood: isSelected ? "" : nName })
                    }
                    className={`px-2.5 py-1 transition cursor-pointer ${
                      isSelected ? "hover:bg-[#0F4383]" : "hover:bg-slate-100"
                    }`}
                  >
                    {nName}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDeleteNeighborhood(isPending ? null : nName)
                    }
                    disabled={deletingNeighborhood === nName}
                    title={`حذف محله ${nName}`}
                    aria-label={`حذف محله ${nName}`}
                    className={`px-1.5 py-1 border-r transition cursor-pointer ${
                      isSelected
                        ? "border-blue-300 text-white hover:bg-rose-700"
                        : "border-slate-200 text-rose-600 hover:bg-rose-100"
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {pendingDeleteNeighborhood && (
            <div className="flex items-center justify-between gap-2 bg-rose-50 border border-rose-200 rounded-lg p-2 text-[11px]">
              <span className="text-rose-800 font-semibold">
                محله «{pendingDeleteNeighborhood}» از لیست محله‌ها و فایل‌های مرتبط حذف شود؟
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={Boolean(deletingNeighborhood)}
                  onClick={() =>
                    handleDeleteNeighborhood(pendingDeleteNeighborhood)
                  }
                  className="px-2.5 py-1 rounded-md bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  {deletingNeighborhood ? "در حال حذف..." : "بله، حذف شود"}
                </button>
                <button
                  type="button"
                  disabled={Boolean(deletingNeighborhood)}
                  onClick={() => setPendingDeleteNeighborhood(null)}
                  className="px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {(neighborhoodFeedback || statusFeedback) && (
        <div
          role="status"
          className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border ${
            (statusFeedback || neighborhoodFeedback)!.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          {(statusFeedback || neighborhoodFeedback)!.text}
        </div>
      )}

      {v > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap bg-blue-50/70 p-2 rounded-xl border border-blue-100 text-[11px]">
          <span className="font-bold text-[#145DB5]">فیلترهای فعال:</span>
          {c.propertyType !== "ALL" && (
            <span className="bg-white border border-blue-200 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>نوع: {c.propertyType}</span>
              <button onClick={() => l({ ...c, propertyType: "ALL" })}>
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            </span>
          )}
          {c.neighborhood && (
            <span className="bg-white border border-blue-200 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>محله: {c.neighborhood}</span>
              <button onClick={() => l({ ...c, neighborhood: "" })}>
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            </span>
          )}
          {c.minPrice !== "" && (
            <span className="bg-white border border-blue-200 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>حداقل قیمت: {formatCompactPrice(Number(c.minPrice))}</span>
              <button onClick={() => l({ ...c, minPrice: "" })}>
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            </span>
          )}
          {c.maxPrice !== "" && (
            <span className="bg-white border border-blue-200 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>حداکثر قیمت: {formatCompactPrice(Number(c.maxPrice))}</span>
              <button onClick={() => l({ ...c, maxPrice: "" })}>
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            </span>
          )}
          {c.hasParking && (
            <span className="bg-white border border-blue-200 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>پارکینگ</span>
              <button onClick={() => l({ ...c, hasParking: false })}>
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            </span>
          )}
          {c.hasElevator && (
            <span className="bg-white border border-blue-200 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>آسانسور</span>
              <button onClick={() => l({ ...c, hasElevator: false })}>
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            </span>
          )}
          <button
            onClick={C}
            className="text-[11px] font-bold text-rose-600 hover:underline mr-auto"
          >
            پاک کردن همه
          </button>
        </div>
      )}

      <div className="flex justify-between items-center text-[11px] text-[#667085] px-1 font-medium">
        <span>
          نمایش {x.length} فایل از مجموع {visibleTotal} مورد منطبق
        </span>
        <span>
          صفحه {m} از {b}
        </span>
      </div>

      {propertyPage.loading ? (
        <p role="status" className="text-xs text-slate-500 py-4 text-center">
          در حال دریافت املاک…
        </p>
      ) : propertyPage.error ? (
        <div
          role="alert"
          className="text-xs text-rose-700 p-3 bg-white rounded-xl border border-slate-200"
        >
          {propertyPage.error}
          <button
            type="button"
            onClick={r}
            className="text-[#145DB5] font-bold px-3 py-2"
          >
            تلاش مجدد
          </button>
        </div>
      ) : visibleTotal === 0 ? (
        <EmptyState
          icon={o === "ARCHIVED" ? Archive : Building2}
          title={
            o === "ARCHIVED"
              ? "هیچ فایل بایگانی‌شده‌ای یافت نشد."
              : "هیچ فایل فعال و آماده‌ای یافت نشد."
          }
          description={
            o === "ARCHIVED"
              ? "فایل‌هایی که معامله آنها انجام شده یا توسط مشاور بایگانی شده‌اند در این بخش قرار می‌گیرند."
              : "در حال حاضر هیچ پرونده ملکی منطبق با این جستجو ثبت نشده است. می‌توانید با تغییر فیلترها یا ثبت فایل جدید اقدام فرمایید."
          }
          actionText={o === "ARCHIVED" ? undefined : "ثبت ملک جدید"}
          onAction={o === "ARCHIVED" ? undefined : n}
        />
      ) : (
        <div className="space-y-3">
          {x.map((prop) => (
            <PropertyCard
              key={prop.id}
              property={prop}
              onSelect={(item) => p(item)}
            />
          ))}
        </div>
      )}

      {visibleTotal > PROPERTY_PAGE_SIZE && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs mt-3">
          <button
            type="button"
            disabled={propertyPage.loading || m <= 1}
            onClick={() => h((prev) => Math.max(1, prev - 1))}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4" />
            <span>صفحه قبلی</span>
          </button>
          <span className="text-xs font-bold text-slate-600">
            صفحه <strong className="text-[#145DB5]">{m}</strong> از {b}
          </span>
          <button
            type="button"
            disabled={propertyPage.loading || m >= b}
            onClick={() => h((prev) => Math.min(b, prev + 1))}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <span>صفحه بعدی</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      <PropertyFilterModal
        isOpen={u}
        onClose={() => d(false)}
        filters={c}
        onChange={(nextFilters) => l(nextFilters)}
        onReset={C}
        neighborhoods={g}
        onDeleteNeighborhood={handleDeleteNeighborhood}
        deletingNeighborhood={deletingNeighborhood}
      />

      {f && (
        <PropertyDetailModal
          property={f}
          customers={t}
          isOpen={!!f}
          onClose={() => p(null)}
          onStatusChanged={(propertyId, newStatus, propertyTitle) => {
            setOptimisticStatusMap((prev) => ({
              ...prev,
              [propertyId]: newStatus,
            }));
            setLocalRefreshTick((prev) => prev + 1);
            if (r) r();
            setStatusFeedback({
              type: "success",
              text:
                newStatus === "ARCHIVED"
                  ? `ملک «${propertyTitle}» به بخش بایگانی منتقل و از لیست فعال حذف شد.`
                  : `وضعیت ملک «${propertyTitle}» با موفقیت به‌روزرسانی شد.`,
            });
            window.setTimeout(() => setStatusFeedback(null), 4000);
          }}
          onRefresh={() => {
            setLocalRefreshTick((prev) => prev + 1);
            if (r) r();
          }}
          onDeleted={(_propertyId, propertyTitle) => {
            setLocalRefreshTick((prev) => prev + 1);
            if (r) r();
            setStatusFeedback({
              type: "success",
              text: `فایل «${propertyTitle}» حذف شد.`,
            });
            window.setTimeout(() => setStatusFeedback(null), 4000);
          }}
        />
      )}
    </div>
  );
};
