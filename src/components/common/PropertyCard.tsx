import React from "react";
import { Bed, Building2, Check, Eye, Lock, MapPin, Users } from "lucide-react";
import { StatusBadge } from "./StatusBadge.tsx";
import { formatCompactPrice } from "../../utils/jalaali.ts";

export const PropertyCard: React.FC<{
  property: any;
  onSelect?: (property: any) => void;
}> = ({ property, onSelect }) => {
  const isSale = property.listing_type === "SALE";
  return (
    <div
      onClick={() => onSelect?.(property)}
      className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-xs hover:border-[#145DB5] active:bg-slate-50 transition cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-[#145DB5] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
            کد {property.code}
          </span>
          <StatusBadge type="property" value={property.status} />
          {property.branch_name && (
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Building2 className="w-2.5 h-2.5 text-[#145DB5]" />
              <span>{property.branch_name}</span>
            </span>
          )}
          {property.visibility === "PRIVATE" ? (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" />
              <span>اختصاصی</span>
            </span>
          ) : property.visibility === "BRANCH" ? (
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5" />
              <span>درون‌شعبه‌ای</span>
            </span>
          ) : (
            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5" />
              <span>سراسری</span>
            </span>
          )}
        </div>
        <span className="text-[11px] font-bold text-slate-700 bg-slate-100/90 border border-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-[#145DB5]" />
          <span>
            {[
              property.address?.city,
              property.address?.district || property.address?.neighborhood,
            ]
              .filter(Boolean)
              .join("، ") || "موقعیت نامشخص"}
          </span>
        </span>
      </div>
      <h4 className="text-sm font-bold text-[#172033] line-clamp-1 mb-1.5">
        {property.title}
      </h4>
      <div className="bg-[#F7F9FC] rounded-lg p-2 mb-2.5 flex items-center justify-between">
        {isSale ? (
          <div>
            <span className="text-[11px] text-[#667085] block">قیمت کل:</span>
            <span className="text-sm font-black text-[#145DB5]">
              {formatCompactPrice(property.price_total)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] text-[#667085] block">ودیعه:</span>
              <span className="text-xs font-bold text-[#145DB5]">
                {formatCompactPrice(property.deposit_amount)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#667085] block">اجاره:</span>
              <span className="text-xs font-bold text-[#172033]">
                {formatCompactPrice(property.rent_amount)}
              </span>
            </div>
          </div>
        )}
        <div className="text-left text-xs font-semibold text-[#172033]">
          {property.area_sqm}{" "}
          <span className="text-[10px] text-[#667085]">متر</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-[#667085] flex-wrap mb-2.5">
        {property.bedrooms ? (
          <span className="flex items-center gap-0.5">
            <Bed className="w-3.5 h-3.5 text-[#145DB5]" />
            {property.bedrooms} خواب
          </span>
        ) : null}
        {property.has_parking && (
          <span className="flex items-center gap-0.5 text-slate-700">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            پارکینگ
          </span>
        )}
        {property.has_elevator && (
          <span className="flex items-center gap-0.5 text-slate-700">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            آسانسور
          </span>
        )}
        {property.has_storage && (
          <span className="flex items-center gap-0.5 text-slate-700">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            انباری
          </span>
        )}
        {property.has_balcony && (
          <span className="flex items-center gap-0.5 text-slate-700">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            بالکن
          </span>
        )}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-[#145DB5] font-medium">
        <div className="flex items-center gap-1.5">
          {property.assigned_agent_name && (
            <span className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded font-normal">
              مشاور: {property.assigned_agent_name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span>مشاهده مشخصات کامل و آدرس</span>
          <Eye className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
