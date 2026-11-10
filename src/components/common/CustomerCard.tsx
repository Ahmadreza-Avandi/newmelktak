import React from "react";
import {
  ArrowUpLeft,
  Building2,
  Calendar,
  Lock,
  Phone,
  Users,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge.tsx";
import { formatCompactPrice } from "../../utils/jalaali.ts";

export const CustomerCard: React.FC<{
  customer: any;
  onFollowUp?: (customer: any) => void;
  onSelect?: (customer: any) => void;
}> = ({ customer, onFollowUp, onSelect }) => (
  <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-xs hover:border-[#145DB5] transition">
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-blue-50 text-[#145DB5] font-bold flex items-center justify-center text-xs">
          {customer.first_name?.[0] || "م"}
        </div>
        <div>
          <h4
            onClick={() => onSelect?.(customer)}
            className="text-sm font-bold text-[#172033] hover:text-[#145DB5] cursor-pointer"
          >
            {customer.display_name}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <StatusBadge type="customer" value={customer.customer_type} />
            <StatusBadge type="temperature" value={customer.temperature} />
            {customer.branch_name && (
              <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                <Building2 className="w-2.5 h-2.5 text-[#145DB5]" />
                <span>{customer.branch_name}</span>
              </span>
            )}
            {customer.visibility === "PRIVATE" ? (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                <span>اختصاصی</span>
              </span>
            ) : customer.visibility === "BRANCH" ? (
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                <Users className="w-2.5 h-2.5" />
                <span>درون‌شعبه‌ای</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                <Users className="w-2.5 h-2.5" />
                <span>سراسری</span>
              </span>
            )}
          </div>
        </div>
      </div>
      <a
        href={`tel:${customer.phone}`}
        className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 active:scale-95 transition"
        title="تماس مستقیم با مشتری"
        onClick={(e) => e.stopPropagation()}
      >
        <Phone className="w-4 h-4" />
      </a>
    </div>
    <div className="bg-[#F7F9FC] rounded-lg p-2.5 text-xs text-[#172033] space-y-1 mb-2.5">
      {customer.budget_max && (
        <div className="flex items-center justify-between">
          <span className="text-[#667085]">سقف بودجه:</span>
          <span className="font-bold text-[#145DB5]">
            {formatCompactPrice(customer.budget_max)}
          </span>
        </div>
      )}
      {customer.preferred_area_text && (
        <div className="flex items-center justify-between">
          <span className="text-[#667085]">خواسته و منطقه:</span>
          <span className="font-medium text-slate-800 line-clamp-1">
            {customer.preferred_area_text}
          </span>
        </div>
      )}
      {customer.notes && (
        <p className="text-[11px] text-[#667085] line-clamp-1 border-t border-slate-200/60 pt-1 mt-1">
          یادداشت: {customer.notes}
        </p>
      )}
    </div>
    <div className="flex items-center justify-between pt-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-[#667085] flex items-center gap-1">
          <Calendar className="w-3 h-3 text-slate-400" />
          شماره:{" "}
          <span className="font-mono text-slate-700">{customer.phone}</span>
        </span>
        {customer.assigned_agent_name && (
          <span className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded">
            مشاور: {customer.assigned_agent_name}
          </span>
        )}
      </div>
      <button
        onClick={() => onFollowUp?.(customer)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-[#145DB5] text-xs font-semibold hover:bg-blue-100 active:scale-95 transition"
      >
        <span>پیگیری</span>
        <ArrowUpLeft className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);
