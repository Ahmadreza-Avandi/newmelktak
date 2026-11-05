import React from "react";
import { Check, RotateCcw, X } from "lucide-react";

export interface PropertyFilters {
  listingType: string;
  propertyType: string;
  status: string;
  visibility: string;
  neighborhood: string;
  minPrice: string | number;
  maxPrice: string | number;
  minArea: string | number;
  maxArea: string | number;
  bedrooms: string | number;
  hasParking: boolean;
  hasElevator: boolean;
  hasStorage: boolean;
  hasBalcony: boolean;
}

export const DEFAULT_PROPERTY_FILTERS: PropertyFilters = {
  listingType: "ALL",
  propertyType: "ALL",
  status: "ALL",
  visibility: "ALL",
  neighborhood: "",
  minPrice: "",
  maxPrice: "",
  minArea: "",
  maxArea: "",
  bedrooms: "ALL",
  hasParking: false,
  hasElevator: false,
  hasStorage: false,
  hasBalcony: false,
};

export const PropertyFilterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  filters: PropertyFilters;
  onChange: (filters: PropertyFilters) => void;
  onReset: () => void;
  neighborhoods: string[];
}> = ({ isOpen, onClose, filters, onChange, onReset, neighborhoods }) => {
  if (!isOpen) return null;

  const update = (patch: Partial<PropertyFilters>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-[#172033]">
              فیلترهای پیشرفته املاک
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#145DB5] px-2 py-1 rounded"
              title="بازنشانی فیلترها"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>بازنشانی</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              محدوده دسترسی پرونده
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "ALL", label: "همه فایل‌ها" },
                { id: "AGENCY", label: "عمومی دفتر" },
                { id: "PRIVATE", label: "فایل اختصاصی" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => update({ visibility: item.id })}
                  className={`py-1.5 px-2 rounded-lg font-bold border transition text-center truncate ${
                    filters.visibility === item.id
                      ? "bg-[#145DB5] text-white border-[#145DB5]"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              وضعیت ملک
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "ALL", label: "همه وضعیت‌ها" },
                { id: "AVAILABLE", label: "فعال و آماده" },
                { id: "UNDER_NEGOTIATION", label: "در مذاکره" },
                { id: "RESERVED", label: "رزرو" },
                { id: "SOLD", label: "فروخته‌شده" },
                { id: "RENTED", label: "اجاره‌داده‌شده" },
                { id: "ARCHIVED", label: "بایگانی‌شده" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => update({ status: item.id })}
                  className={`py-1.5 px-2 rounded-lg font-bold border transition text-center truncate ${
                    filters.status === item.id
                      ? "bg-[#145DB5] text-white border-[#145DB5]"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              نوع معامله
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "ALL", label: "همه معاملات" },
                { id: "SALE", label: "فروش" },
                { id: "RENT", label: "رهن و اجاره" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => update({ listingType: item.id })}
                  className={`py-2 px-2 rounded-lg font-bold border transition text-center ${
                    filters.listingType === item.id
                      ? "bg-[#145DB5] text-white border-[#145DB5]"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              نوع کاربری / ملک
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "ALL", label: "همه انواع" },
                { id: "APARTMENT", label: "آپارتمان" },
                { id: "VILLA", label: "ویلایی" },
                { id: "OFFICE", label: "اداری" },
                { id: "COMMERCIAL", label: "تجاری" },
                { id: "LAND", label: "زمین / کلنگی" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => update({ propertyType: item.id })}
                  className={`py-1.5 px-2 rounded-lg font-bold border transition text-center truncate ${
                    filters.propertyType === item.id
                      ? "bg-[#145DB5] text-white border-[#145DB5]"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              محله / منطقه
            </label>
            <input
              type="text"
              value={filters.neighborhood}
              onChange={(e) => update({ neighborhood: e.target.value })}
              placeholder="مثال: گیشا، سعادت‌آباد، نیاوران..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
            />
            {neighborhoods.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {neighborhoods.slice(0, 6).map((nName) => (
                  <button
                    key={nName}
                    type="button"
                    onClick={() => update({ neighborhood: nName })}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      filters.neighborhood === nName
                        ? "bg-blue-100 text-[#145DB5] border-blue-300"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {nName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              محدوده قیمت / ودیعه (تومان)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">
                  از:
                </span>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) =>
                    update({
                      minPrice: e.target.value ? Number(e.target.value) : "",
                    })
                  }
                  placeholder="حداقل قیمت"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">
                  تا:
                </span>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    update({
                      maxPrice: e.target.value ? Number(e.target.value) : "",
                    })
                  }
                  placeholder="حداکثر قیمت"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              محدوده متراژ (متر مربع)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">
                  از:
                </span>
                <input
                  type="number"
                  value={filters.minArea}
                  onChange={(e) =>
                    update({
                      minArea: e.target.value ? Number(e.target.value) : "",
                    })
                  }
                  placeholder="حداقل متراژ"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">
                  تا:
                </span>
                <input
                  type="number"
                  value={filters.maxArea}
                  onChange={(e) =>
                    update({
                      maxArea: e.target.value ? Number(e.target.value) : "",
                    })
                  }
                  placeholder="حداکثر متراژ"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              تعداد خواب
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: "ALL", label: "همه" },
                { id: 1, label: "۱ خواب" },
                { id: 2, label: "۲ خواب" },
                { id: 3, label: "۳ خواب" },
                { id: 4, label: "۴+ خواب" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => update({ bedrooms: item.id })}
                  className={`py-1.5 px-1 rounded-lg font-bold border transition text-center truncate ${
                    filters.bedrooms === item.id
                      ? "bg-[#145DB5] text-white border-[#145DB5]"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              امکانات الزامی
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: "hasParking", label: "پارکینگ اختصاصی" },
                  { key: "hasElevator", label: "آسانسور" },
                  { key: "hasStorage", label: "انباری" },
                  { key: "hasBalcony", label: "تراس / بالکن" },
                ] as const
              ).map((item) => (
                <label
                  key={item.key}
                  className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer select-none transition ${
                    filters[item.key]
                      ? "bg-blue-50 border-[#145DB5] text-[#145DB5] font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={filters[item.key]}
                    onChange={(e) => update({ [item.key]: e.target.checked })}
                    className="rounded text-[#145DB5] focus:ring-0"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#145DB5] text-white py-2.5 rounded-xl font-bold text-xs shadow-md hover:bg-[#0F4383] active:scale-98 transition flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>اعمال فیلترها</span>
          </button>
        </div>
      </div>
    </div>
  );
};
