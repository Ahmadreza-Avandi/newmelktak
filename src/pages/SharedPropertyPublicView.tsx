import React, { useState, useEffect } from "react";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { api } from "../services/apiClient.ts";
import { formatCompactPrice } from "../utils/jalaali.ts";

export interface SharedPropertyPublicViewProps {
  shareToken: string;
  onBackToApp?: () => void;
}

export const SharedPropertyPublicView: React.FC<
  SharedPropertyPublicViewProps
> = ({ shareToken, onBackToApp }) => {
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/api/v1/public/properties/share/${shareToken}`)
      .then((res) => {
        if (res.success && res.data) {
          setProperty(res.data);
        } else {
          setError(
            res.error?.message || "این فایل ملکی یافت نشد یا در دسترس نیست."
          );
        }
      })
      .catch(() => {
        setError("خطا در برقراری ارتباط با سامانه.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-4 select-none">
        <img
          src="https://cdn.imgurl.ir/uploads/n255498_melktak1.png"
          alt="ملک تک"
          className="w-12 h-12 rounded-2xl shadow-md animate-pulse mb-3 object-contain bg-white p-1 border border-slate-200"
        />
        <p className="text-xs font-semibold text-[#172033]">
          در حال بارگذاری کاتالوگ آنلاین فایل ملکی...
        </p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
          <Building2 className="w-7 h-7" />
        </div>
        <h2 className="text-sm font-extrabold text-[#172033] mb-2">
          فایل ملکی در دسترس نیست
        </h2>
        <p className="text-xs text-slate-500 max-w-xs mb-4">{error}</p>
        {onBackToApp && (
          <button
            onClick={onBackToApp}
            className="bg-[#145DB5] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#0F4383]"
          >
            ورود به سامانه اصلی
          </button>
        )}
      </div>
    );
  }

  const media = property.media || [];
  const activeMedia = media[mediaIndex];
  const phone = property.agent?.phone || property.agency?.phone || "";
  let whatsappPhone = phone.replace(/\D/g, "");
  if (whatsappPhone.startsWith("0")) {
    whatsappPhone = "98" + whatsappPhone.substring(1);
  }

  return (
    <div
      className="min-h-screen bg-[#F7F9FC] pb-24 text-right select-none"
      dir="rtl"
    >
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#145DB5] text-white flex items-center justify-center font-black text-sm">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-extrabold text-[#172033]">
                {property.agency?.name || "سامانه املاک"}
              </h1>
              <p className="text-[10px] text-slate-500 flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
                کاتالوگ رسمی فایل ملکی
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-[#145DB5] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              کد {property.code}
            </span>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="text-[10px] font-bold text-slate-500 hover:text-[#145DB5]"
              >
                ورود مشاور
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-3.5 pt-3 space-y-3.5">
        {media.length > 0 ? (
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xs space-y-2">
            <div className="relative h-64 bg-black flex items-center justify-center">
              {activeMedia?.media_type === "VIDEO" ? (
                <video
                  src={activeMedia.url}
                  controls={true}
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={activeMedia?.url}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              )}
              {media.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setMediaIndex((idx) =>
                        idx > 0 ? idx - 1 : media.length - 1
                      )
                    }
                    className="absolute right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setMediaIndex((idx) =>
                        idx < media.length - 1 ? idx + 1 : 0
                      )
                    }
                    className="absolute left-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </>
              )}
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                {mediaIndex + 1} از {media.length}
              </div>
            </div>
            {media.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-2">
                {media.map((item: any, idx: number) => (
                  <div
                    key={item.id}
                    onClick={() => setMediaIndex(idx)}
                    className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 cursor-pointer border-2 transition ${
                      mediaIndex === idx
                        ? "border-[#145DB5] scale-95"
                        : "border-transparent opacity-75"
                    }`}
                  >
                    <img
                      src={item.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 border border-slate-200">
            <Building2 className="w-10 h-10 mb-1" />
            <span className="text-xs font-bold text-slate-500">
              فایل بدون تصویر
            </span>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-[#145DB5] text-xs font-bold px-2 py-0.5 rounded">
              {property.listing_type === "SALE" ? "فروش رسمی" : "رهن و اجاره"}
            </span>
            <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded">
              {property.property_type === "APARTMENT"
                ? "آپارتمان مسکونی"
                : property.property_type === "VILLA"
                ? "ویلایی"
                : property.property_type}
            </span>
          </div>
          <h2 className="text-sm font-extrabold text-[#172033] leading-snug">
            {property.title}
          </h2>
          <div className="bg-[#F7F9FC] rounded-xl p-3 border border-slate-100 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">
                مبلغ / شرایط:
              </span>
              <span className="text-sm font-black text-[#145DB5]">
                {property.listing_type === "SALE"
                  ? formatCompactPrice(property.price_total)
                  : `${formatCompactPrice(
                      property.deposit_amount
                    )} ودیعه / ${formatCompactPrice(
                      property.rent_amount
                    )} اجاره`}
              </span>
            </div>
            {property.price_per_meter && property.listing_type === "SALE" && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">قیمت هر متر:</span>
                <span className="font-bold text-slate-700">
                  {formatCompactPrice(property.price_per_meter)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-xs font-extrabold text-slate-800">
            مشخصات سندی و متراژ:
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between">
              <span className="text-slate-500">متراژ:</span>
              <span className="font-bold text-slate-800">
                {property.area_sqm} متر
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between">
              <span className="text-slate-500">تعداد خواب:</span>
              <span className="font-bold text-slate-800">
                {property.bedrooms || "—"} خواب
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between">
              <span className="text-slate-500">طبقه:</span>
              <span className="font-bold text-slate-800">
                طبقه {property.floor || "—"}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between">
              <span className="text-slate-500">محدوده:</span>
              <span className="font-bold text-slate-800">
                {property.neighborhood || property.city}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-xs font-extrabold text-slate-800">
            امکانات رفاهی و ساختمان:
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: "پارکینگ اختصاصی", has: property.has_parking },
              { label: "آسانسور فعال", has: property.has_elevator },
              { label: "انباری سندی", has: property.has_storage },
              { label: "بالکن / تراس", has: property.has_balcony },
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

        {property.description && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2">
            <h3 className="text-xs font-extrabold text-slate-800">
              توضیحات تکمیلی:
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-wrap">
              {property.description}
            </p>
          </div>
        )}

        <div className="bg-gradient-to-r from-blue-900 to-[#145DB5] text-white rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-blue-200 block">
                مشاور اختصاصی این فایل:
              </span>
              <span className="text-sm font-extrabold">
                {property.agent?.display_name || "مشاور ارشد آژانس"}
              </span>
            </div>
            <div className="text-left">
              <span className="text-[10px] text-blue-200 block">
                آژانس املاک:
              </span>
              <span className="text-xs font-bold">
                {property.agency?.name || "ملک تک"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {phone && (
              <>
                <a
                  href={`tel:${phone}`}
                  className="flex items-center justify-center gap-1.5 bg-white text-[#145DB5] py-2.5 rounded-xl font-black text-xs shadow hover:bg-blue-50 transition"
                >
                  <Phone className="w-4 h-4" />
                  <span>تماس تلفنی</span>
                </a>
                <a
                  href={`https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${encodeURIComponent(
                    `سلام، در رابطه با فایل ملکی کد ${property.code} (${property.title}) پیام می‌دهم.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 text-white py-2.5 rounded-xl font-black text-xs shadow hover:bg-emerald-700 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>پیام در واتس‌اپ</span>
                </a>
              </>
            )}
          </div>
        </div>
      </main>

      {phone && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-30 shadow-lg">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <a
              href={`tel:${phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#145DB5] text-white py-2.5 rounded-xl font-bold text-xs shadow-md hover:bg-[#0F4383] transition"
            >
              <Phone className="w-4 h-4" />
              <span>تماس مستقیم با مشاور</span>
            </a>
            <a
              href={`https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${encodeURIComponent(
                `سلام، در خصوص فایل کد ${property.code} (${property.title}) تمایل به هماهنگی بازدید دارم.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-12 h-10 bg-emerald-700 text-white rounded-xl flex items-center justify-center hover:bg-emerald-800 transition"
              title="واتس‌اپ"
            >
              <MessageSquare className="w-5 h-5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
