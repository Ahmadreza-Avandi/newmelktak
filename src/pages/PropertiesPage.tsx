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
} from "lucide-react";
import {
  DEFAULT_PROPERTY_FILTERS,
  PropertyFilterModal,
  type PropertyFilters,
} from "../components/modals/PropertyFilterModal.tsx";
import { usePropertyPage } from "../utils/crmWorkflows.tsx";
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

  useEffect(() => {
    h(1);
  }, [o, i, c, branchId]);

  const g = useMemo(() => {
    const set = new Set<string>();
    e.forEach((prop) => {
      const nName = prop.address?.district || prop.address?.neighborhood;
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
    refreshKey: e.length,
  });

  const y = propertyPage.data;
  const b = Math.max(1, Math.ceil(propertyPage.total / PROPERTY_PAGE_SIZE));
  const x = y;
  const C = () => {
    l(DEFAULT_PROPERTY_FILTERS);
    a("");
  };

  return (
    <div className="space-y-3 pb-24 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-[#172033]">فایلینگ و املاک</h2>
          <p className="text-xs text-[#667085]">
            {o === "ACTIVE"
              ? `فهرست فایل‌های فعال و آماده معامله (${propertyPage.total} فایل)`
              : `آرشیو پرونده‌های بایگانی‌شده (${propertyPage.total} فایل)`}
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
          نمایش {x.length} فایل از مجموع {propertyPage.total} مورد منطبق
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
      ) : propertyPage.total === 0 ? (
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

      {propertyPage.total > PROPERTY_PAGE_SIZE && (
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
      />

      {f && (
        <PropertyDetailModal
          property={f}
          customers={t}
          isOpen={!!f}
          onClose={() => p(null)}
          onRefresh={() => {
            if (r) r();
          }}
        />
      )}
    </div>
  );
};
