import React from "react";

export const StatusBadge: React.FC<{ type: string; value: string }> = ({
  type,
  value,
}) => {
  if (type === "temperature") {
    if (value === "HOT") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          داغ (فوری)
        </span>
      );
    }
    if (value === "WARM") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          گرم (پیگیر)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        سرد (مقدماتی)
      </span>
    );
  }

  if (type === "customer") {
    const labels: Record<string, string> = {
      BUYER: "متقاضی خرید",
      TENANT: "متقاضی اجاره",
      INVESTOR: "سرمایه‌گذار",
      OWNER: "مالک",
      OTHER: "سایر",
    };
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-[#145DB5] border border-blue-100">
        {labels[value] || value}
      </span>
    );
  }

  if (type === "property") {
    const meta = (
      {
        ACTIVE: {
          label: "فعال در بازار",
          class: "bg-emerald-50 text-emerald-700 border-emerald-200",
        },
        AVAILABLE: {
          label: "فعال در بازار",
          class: "bg-emerald-50 text-emerald-700 border-emerald-200",
        },
        NEGOTIATION: {
          label: "در حال مذاکره",
          class: "bg-amber-50 text-amber-700 border-amber-200",
        },
        UNDER_NEGOTIATION: {
          label: "در حال مذاکره",
          class: "bg-amber-50 text-amber-700 border-amber-200",
        },
        RESERVED: {
          label: "رزرو شده",
          class: "bg-indigo-50 text-indigo-700 border-indigo-200",
        },
        SOLD: {
          label: "فروخته شد",
          class: "bg-slate-100 text-slate-600 border-slate-200",
        },
        RENTED: {
          label: "اجاره داده شد",
          class: "bg-slate-100 text-slate-600 border-slate-200",
        },
        DRAFT: {
          label: "پیش‌نویس",
          class: "bg-slate-100 text-slate-500 border-slate-200",
        },
        PENDING_REVIEW: {
          label: "در انتظار تایید",
          class: "bg-purple-50 text-purple-700 border-purple-200",
        },
        ARCHIVED: {
          label: "بایگانی",
          class: "bg-slate-100 text-slate-500 border-slate-200",
        },
      } as Record<string, { label: string; class: string }>
    )[value] || {
      label: value,
      class: "bg-slate-100 text-slate-700 border-slate-200",
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${meta.class}`}
      >
        {meta.label}
      </span>
    );
  }

  if (type === "task") {
    if (value === "OVERDUE") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          عقب‌افتاده
        </span>
      );
    }
    if (value === "COMPLETED") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          انجام شده
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-[#145DB5] border border-blue-200">
        در انتظار اقدام
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
      {value}
    </span>
  );
};
