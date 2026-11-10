import React, { useState, useMemo } from "react";
import {
  Building2,
  Calculator,
  ChevronDown,
  ChevronUp,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "../../services/apiClient.ts";
import { CurrencyInput } from "../common/CurrencyInput.tsx";

export const CreatePropertyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (property: any) => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [listingType, setListingType] = useState("SALE");
  const [propertyType, setPropertyType] = useState("APARTMENT");
  const [visibility, setVisibility] = useState("AGENCY");
  const [title, setTitle] = useState("");
  const [areaSqm, setAreaSqm] = useState("");
  const [priceTotal, setPriceTotal] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [neighborhood, setNeighborhood] = useState("گلشهر");
  const [city, setCity] = useState("کرج");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bedrooms, setBedrooms] = useState("2");
  const [floor, setFloor] = useState("2");
  const [hasParking, setHasParking] = useState(true);
  const [hasElevator, setHasElevator] = useState(true);
  const [hasStorage, setHasStorage] = useState(true);
  const [hasBalcony, setHasBalcony] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pricePerMeter = useMemo(() => {
    const p = Number(priceTotal);
    const a = Number(areaSqm);
    return listingType === "SALE" && p > 0 && a > 0 ? Math.round(p / a) : 0;
  }, [priceTotal, areaSqm, listingType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    const areaNum = Number(areaSqm);
    if (!areaNum || areaNum <= 0) {
      setError("متراژ باید بیشتر از صفر باشد.");
      return;
    }
    if (!neighborhood.trim()) {
      setError("نام محله یا منطقه الزامی است.");
      return;
    }

    const payload: any = {
      title:
        title.trim() ||
        `${
          propertyType === "APARTMENT" ? "آپارتمان" : "ملک"
        } ${areaNum} متری ${neighborhood}`,
      property_type: propertyType,
      listing_type: listingType,
      area_sqm: areaNum,
      district: neighborhood.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim() || "کرج",
      province: "البرز",
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      floor: floor ? Number(floor) : undefined,
      has_parking: hasParking,
      has_elevator: hasElevator,
      has_storage: hasStorage,
      has_balcony: hasBalcony,
      description: description.trim() || undefined,
      visibility,
    };

    if (listingType === "SALE") {
      const totalNum = Number(priceTotal);
      if (!totalNum || totalNum <= 0) {
        setError("لطفاً قیمت کل را به صورت عدد معتبر وارد نمایید.");
        return;
      }
      payload.price_total = totalNum;
    } else {
      payload.deposit_amount = depositAmount ? Number(depositAmount) : 0;
      payload.rent_amount = rentAmount ? Number(rentAmount) : 0;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/api/v1/properties", payload);
      if (res.success && res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        setError(res.error?.message || "خطا در ثبت ملک در پایگاه داده.");
      }
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#145DB5]" />
            <h3 className="text-sm font-bold text-[#172033]">
              ثبت سریع ملک جدید
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1.5">
              نوع معامله
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setListingType("SALE")}
                className={`py-2 text-xs font-bold rounded-lg border transition ${
                  listingType === "SALE"
                    ? "bg-[#145DB5] text-white border-[#145DB5]"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                فروش
              </button>
              <button
                type="button"
                onClick={() => setListingType("RENT")}
                className={`py-2 text-xs font-bold rounded-lg border transition ${
                  listingType === "RENT"
                    ? "bg-[#145DB5] text-white border-[#145DB5]"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                رهن و اجاره
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1.5">
              نوع ملک
            </label>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: "APARTMENT", label: "آپارتمان" },
                { id: "VILLA", label: "ویلا" },
                { id: "OFFICE", label: "اداری" },
                { id: "COMMERCIAL", label: "تجاری" },
                { id: "LAND", label: "زمین" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPropertyType(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border shrink-0 transition ${
                    propertyType === item.id
                      ? "bg-blue-50 text-[#145DB5] border-[#145DB5] font-bold"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1.5">
              حریم خصوصی و رویت فایل
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("AGENCY")}
                className={`p-2.5 text-right rounded-xl border transition ${
                  visibility === "AGENCY"
                    ? "bg-blue-50 border-[#145DB5] text-[#145DB5]"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#145DB5]" />
                  <span>عمومی دفتر</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  مشاوران مجاز این دفتر نیز می‌توانند فایل را ببینند.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setVisibility("PRIVATE")}
                className={`p-2.5 text-right rounded-xl border transition ${
                  visibility === "PRIVATE"
                    ? "bg-amber-50 border-amber-500 text-amber-900"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold mb-0.5">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>فایل اختصاصی</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  فایل برای مشاور مسئول و مدیریت دفتر قابل مشاهده است.
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-[#667085] mb-1">
                متراژ (متر مربع) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                required
                value={areaSqm}
                onChange={(e) => setAreaSqm(e.target.value)}
                placeholder="مثلاً ۱۰۵"
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-[#172033] focus:border-[#145DB5] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#667085] mb-1">
                محله (منطقه) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="مثلاً گلشهر"
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-[#172033] focus:border-[#145DB5] outline-none"
              />
            </div>
          </div>

          {listingType === "SALE" ? (
            <div className="space-y-2">
              <CurrencyInput
                label="قیمت کل فروش"
                required
                value={priceTotal}
                onChange={(val) => setPriceTotal(val)}
                placeholder="مثلاً ۸۵۰۰۰۰۰۰۰۰"
              />
              {pricePerMeter > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <Calculator className="w-3.5 h-3.5 text-[#145DB5]" />
                    <span>قیمت متری (محاسبه خودکار):</span>
                  </div>
                  <div className="text-left font-mono font-bold text-[#145DB5]">
                    {pricePerMeter.toLocaleString("fa-IR")} تومان
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <CurrencyInput
                label="مبلغ ودیعه / رهن"
                value={depositAmount}
                onChange={(val) => setDepositAmount(val)}
                placeholder="مثلاً ۵۰۰۰۰۰۰۰۰"
              />
              <CurrencyInput
                label="اجاره ماهانه"
                value={rentAmount}
                onChange={(val) => setRentAmount(val)}
                placeholder="مثلاً ۱۲۰۰۰۰۰۰"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between py-2 text-xs text-[#145DB5] font-semibold border-t border-slate-100"
          >
            <span>
              {showAdvanced
                ? "بستن مشخصات تکمیلی"
                : "افزودن امکانات و مشخصات تکمیلی (خواب، پارکینگ، آسانسور...)"}
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showAdvanced && (
            <div className="space-y-3 bg-[#F7F9FC] p-3 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[#667085] mb-1">
                    تعداد خواب
                  </label>
                  <input
                    type="number"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className="w-full bg-white rounded border border-slate-300 p-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#667085] mb-1">
                    طبقه
                  </label>
                  <input
                    type="number"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full bg-white rounded border border-slate-300 p-1.5 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasParking}
                    onChange={(e) => setHasParking(e.target.checked)}
                    className="w-4 h-4 rounded text-[#145DB5]"
                  />
                  <span>پارکینگ</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasElevator}
                    onChange={(e) => setHasElevator(e.target.checked)}
                    className="w-4 h-4 rounded text-[#145DB5]"
                  />
                  <span>آسانسور</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasStorage}
                    onChange={(e) => setHasStorage(e.target.checked)}
                    className="w-4 h-4 rounded text-[#145DB5]"
                  />
                  <span>انباری</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasBalcony}
                    onChange={(e) => setHasBalcony(e.target.checked)}
                    className="w-4 h-4 rounded text-[#145DB5]"
                  />
                  <span>بالکن</span>
                </label>
              </div>
              <div>
                <label className="block text-[11px] text-[#667085] mb-1">
                  توضیحات کوتاه
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="نکات مهم و ویژگی‌های ملک..."
                  className="w-full bg-white rounded border border-slate-300 p-1.5 text-xs"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#145DB5] py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#0F4383] active:scale-98 transition disabled:opacity-50"
            >
              {submitting ? "در حال ذخیره در پایگاه داده..." : "ثبت قطعی ملک"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
