import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Archive,
  Search,
  X,
  Users,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { EmptyState } from "../components/common/EmptyState.tsx";
import { CustomerCard } from "../components/common/CustomerCard.tsx";
import { CustomerDetailModal } from "../components/modals/CustomerDetailModal.tsx";

export const CUSTOMER_PAGE_SIZE = 10;

export const CustomersPage: React.FC<{
  customers: any[];
  properties?: any[];
  onOpenQuickAdd: () => void;
  onFollowUpCustomer: (customer: any) => void;
  onRefresh: () => void;
}> = ({
  customers: e,
  properties: t = [],
  onOpenQuickAdd: n,
  onFollowUpCustomer: r,
  onRefresh: i,
}) => {
  const [a, o] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [s, c] = useState("ALL");
  const [l] = useState("ALL");
  const [d, f] = useState("ALL");
  const [p, m] = useState("");
  const [h, g] = useState<any>(null);
  const [v, y] = useState(1);

  useEffect(() => {
    y(1);
  }, [a, s, l, d, p]);

  const b = useMemo(
    () =>
      e.filter((cust) => {
        if (
          (a === "ACTIVE" && cust.is_archived) ||
          (a === "ARCHIVED" && !cust.is_archived) ||
          (d !== "ALL" && cust.visibility !== d) ||
          (s !== "ALL" && cust.customer_type !== s) ||
          (l !== "ALL" && cust.lead_status !== l)
        ) {
          return false;
        }
        if (p.trim()) {
          const q = p.trim().toLowerCase();
          return (
            cust.display_name.toLowerCase().includes(q) ||
            cust.phone.includes(q) ||
            cust.preferred_area_text?.toLowerCase().includes(q) ||
            cust.notes?.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [e, a, s, l, d, p]
  );

  const x = Math.ceil(b.length / CUSTOMER_PAGE_SIZE) || 1;
  const C = useMemo(() => {
    const start = (v - 1) * CUSTOMER_PAGE_SIZE;
    return b.slice(start, start + CUSTOMER_PAGE_SIZE);
  }, [b, v]);

  return (
    <div className="space-y-3 pb-24 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-[#172033]">
            مشتریان و متقاضیان
          </h2>
          <p className="text-xs text-[#667085]">
            {a === "ACTIVE"
              ? `فهرست متقاضیان فعال و آماده پیگیری (${b.length} مشتری)`
              : `آرشیو مشتریان بایگانی‌شده (${b.length} پرونده)`}
          </p>
        </div>
        <button
          onClick={n}
          className="flex items-center gap-1 bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-800 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت مشتری</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => o("ACTIVE")}
          className={`py-2 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
            a === "ACTIVE"
              ? "bg-white text-emerald-800 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>فقط فعال و آماده</span>
        </button>
        <button
          type="button"
          onClick={() => o("ARCHIVED")}
          className={`py-2 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
            a === "ARCHIVED"
              ? "bg-white text-slate-800 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Archive className="w-3.5 h-3.5 text-slate-500" />
          <span>بایگانی شده</span>
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          value={p}
          onChange={(ev) => m(ev.target.value)}
          placeholder="جستجو با نام مشتری، شماره تلفن، محله مورد نظر..."
          className="w-full bg-white rounded-xl border border-slate-300 p-2.5 pr-9 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
        />
        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        {p && (
          <button
            onClick={() => m("")}
            className="absolute left-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {[
          { id: "ALL", label: "همه متقاضیان" },
          { id: "BUYER", label: "خریداران" },
          { id: "TENANT", label: "مستأجران" },
          { id: "INVESTOR", label: "سرمایه‌گذاران" },
          { id: "OWNER", label: "مالکان" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => c(item.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition shrink-0 ${
              s === item.id
                ? "bg-[#145DB5] text-white border-[#145DB5]"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {[
          { id: "ALL", label: "همه پرونده‌ها" },
          { id: "AGENCY", label: "عمومی دفتر" },
          { id: "PRIVATE", label: "متقاضی اختصاصی" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => f(item.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition shrink-0 ${
              d === item.id
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center text-[11px] text-[#667085] px-1 font-medium">
        <span>
          نمایش {C.length} مشتری از مجموع {b.length} مورد
        </span>
        <span>
          صفحه {v} از {x}
        </span>
      </div>

      {b.length === 0 ? (
        <EmptyState
          icon={a === "ARCHIVED" ? Archive : Users}
          title={
            a === "ARCHIVED"
              ? "هیچ پرونده مشتری بایگانی‌شده‌ای یافت نشد."
              : "هیچ مشتری فعال و آماده‌ای یافت نشد."
          }
          description={
            a === "ARCHIVED"
              ? "مشتریانی که معامله‌شان خاتمه یافته یا پرونده‌شان بایگانی شده در این بخش نگهداری می‌شوند."
              : "در حال حاضر هیچ مشتری فعالی مطابق با شرایط جستجو وجود ندارد. می‌توانید با ثبت مشتری جدید پرونده جدیدی ایجاد کنید."
          }
          actionText={a === "ARCHIVED" ? undefined : "ثبت مشتری جدید"}
          onAction={a === "ARCHIVED" ? undefined : n}
        />
      ) : (
        <div className="space-y-3">
          {C.map((cust) => (
            <CustomerCard
              key={cust.id}
              customer={cust}
              onSelect={(item) => g(item)}
              onFollowUp={r}
            />
          ))}
        </div>
      )}

      {b.length > CUSTOMER_PAGE_SIZE && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs mt-3">
          <button
            type="button"
            disabled={v <= 1}
            onClick={() => y((prev) => Math.max(1, prev - 1))}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4" />
            <span>صفحه قبلی</span>
          </button>
          <span className="text-xs font-bold text-slate-600">
            صفحه <strong className="text-[#145DB5]">{v}</strong> از {x}
          </span>
          <button
            type="button"
            disabled={v >= x}
            onClick={() => y((prev) => Math.min(x, prev + 1))}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <span>صفحه بعدی</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {h && (
        <CustomerDetailModal
          customer={h}
          properties={t}
          isOpen={!!h}
          onClose={() => g(null)}
          onRefresh={() => {
            if (i) i();
          }}
          onOpenQuickAddTask={(cust) => {
            g(null);
            r(cust);
          }}
        />
      )}
    </div>
  );
};
