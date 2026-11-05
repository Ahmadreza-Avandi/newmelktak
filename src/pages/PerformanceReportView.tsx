import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  Award,
  Building2,
  ChartColumn,
  CircleCheck,
  DollarSign,
  Handshake,
  Printer,
  RefreshCw,
} from "lucide-react";
import { api } from "../services/apiClient.ts";
import { useAuth } from "../context/AuthContext.tsx";
import {
  formatJalaaliDateTime,
  formatNumberWithCommas,
  formatTomanWords,
} from "../utils/jalaali.ts";
import { TransactionDetailModal } from "../components/modals/TransactionDetailModal.tsx";

export interface PerformanceReportViewProps {
  onBack?: () => void;
  showToast?: (msg: string, type?: string) => void;
}

export const PerformanceReportView: React.FC<PerformanceReportViewProps> = ({
  onBack,
  showToast,
}) => {
  const { user: _user } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const to = new Date();
      const from = new Date();
      if (period === "month") {
        from.setDate(to.getDate() - 30);
      } else if (period === "quarter") {
        from.setDate(to.getDate() - 90);
      } else if (period === "semester") {
        from.setDate(to.getDate() - 180);
      } else if (period === "year") {
        from.setDate(to.getDate() - 365);
      }
      const res = await api.get(
        `/api/v1/transactions/report/performance?from=${from.toISOString()}&to=${to.toISOString()}`
      );
      if (res.success && res.data) {
        setReport(res.data);
      }
    } catch (err) {
      console.error("Failed to load performance report:", err);
      showToast?.("خطا در دریافت گزارش عملکرد مدیر.", "error");
    } finally {
      setLoading(false);
    }
  }, [period, showToast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const summary = report?.summary;
  const agents = report?.agents || [];
  const transactions = report?.transactions || [];
  const sortedAgents = [...agents].sort((a, b) =>
    b.final_sale_volume === a.final_sale_volume
      ? b.finalized_transactions_count - a.finalized_transactions_count
      : b.final_sale_volume - a.final_sale_volume
  );

  return (
    <div className="min-h-screen bg-[#F7F9FC] pb-24">
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                aria-label="بازگشت"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <ChartColumn className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-[#172033]">
                گزارش عملکرد مدیر و تحلیل آژانس
              </h1>
              <p className="text-[11px] text-[#667085]">
                رصد بازدهی مشاوران، حجم معاملات نهایی و نرخ تبدیل پیگیری‌ها
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadReport()}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="بروزرسانی گزارش"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>چاپ گزارش</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-slate-500 shrink-0 px-1">
            بازه زمانی گزارش:
          </span>
          <div className="flex items-center gap-1.5">
            {[
              { id: "month", label: "۳۰ روز اخیر (ماه جاری)" },
              { id: "quarter", label: "۳ ماه اخیر" },
              { id: "semester", label: "۶ ماه اخیر" },
              { id: "year", label: "یک سال اخیر" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPeriod(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  period === opt.id
                    ? "bg-[#145DB5] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium">معاملات نهایی‌شده</span>
              <Handshake className="w-4 h-4 text-[#145DB5]" />
            </div>
            <div className="text-lg sm:text-xl font-black text-[#172033]">
              {summary ? summary.total_finalized_transactions : "—"}{" "}
              <span className="text-xs font-normal text-slate-500">فقره</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              توسط {summary ? summary.active_agents_with_deals : 0} مشاور دارای
              معامله
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium">حجم فروش دفتر</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 truncate">
              {summary && summary.total_sale_volume > 0
                ? summary.total_sale_volume >= 1e9
                  ? `${(summary.total_sale_volume / 1e9).toFixed(1)} میلیارد`
                  : `${(summary.total_sale_volume / 1e6).toFixed(0)} میلیون`
                : "۰"}{" "}
              <span className="text-xs font-normal text-slate-500">تومان</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 truncate">
              {summary && summary.total_sale_volume > 0
                ? `${formatTomanWords(summary.total_sale_volume)} تومان`
                : "بدون گردش فروش در این بازه"}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium">
                پیگیری و بازدیدها
              </span>
              <CircleCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-[#172033]">
              {summary ? summary.total_completed_followups : "—"}{" "}
              <span className="text-xs font-normal text-slate-500">
                پیگیری
              </span>
            </div>
            <div className="text-[10px] text-amber-700 font-bold mt-1">
              {summary ? summary.total_visits : 0} بازدید حضوری انجام شد
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium">
                فایل و مشتری فعال
              </span>
              <Building2 className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-[#172033]">
              {summary ? summary.total_active_properties : "—"}{" "}
              <span className="text-xs font-normal text-slate-500">ملک</span>
            </div>
            <div className="text-[10px] text-purple-700 font-bold mt-1">
              {summary ? summary.total_active_customers : 0} متقاضی فعال در
              جریان
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs sm:text-sm font-bold text-[#172033]">
                جدول رتبه‌بندی و بازدهی مشاوران
              </h3>
            </div>
            <span className="text-[11px] text-[#667085]">
              {sortedAgents.length} مشاور ثبت‌شده
            </span>
          </div>
          {sortedAgents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              مشاوری در سیستم ثبت نشده است.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedAgents.map((agent, idx) => {
                const isFirst =
                  idx === 0 && agent.finalized_transactions_count > 0;
                const isSecond =
                  idx === 1 && agent.finalized_transactions_count > 0;
                return (
                  <div
                    key={agent.agent_id}
                    className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isFirst
                            ? "bg-amber-100 text-amber-800 ring-2 ring-amber-400"
                            : isSecond
                            ? "bg-slate-200 text-slate-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#172033] truncate">
                            {agent.agent_name}
                          </h4>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              agent.role_code === "BRANCH_MANAGER"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-blue-50 text-[#145DB5]"
                            }`}
                          >
                            {agent.role_code === "BRANCH_MANAGER"
                              ? "مدیر شعبه"
                              : "مشاور"}
                          </span>
                          {!agent.is_active && (
                            <span className="text-[10px] bg-rose-50 text-rose-700 px-1 rounded">
                              غیرفعال
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#667085] flex items-center gap-2 mt-0.5">
                          {agent.phone && (
                            <span className="font-mono">{agent.phone}</span>
                          )}
                          <span>•</span>
                          <span>{agent.active_properties_count} ملک فعال</span>
                          <span>•</span>
                          <span>{agent.active_customers_count} متقاضی</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-right sm:text-left">
                        <span className="text-[10px] text-slate-400 block">
                          فعالیت پیگیری
                        </span>
                        <span className="font-bold text-slate-700">
                          {agent.completed_followups_count} پیگیری /{" "}
                          {agent.visits_count} بازدید
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 block">
                          معاملات نهایی
                        </span>
                        <div className="font-black text-[#145DB5]">
                          {agent.finalized_transactions_count} معامله
                        </div>
                        {agent.final_sale_volume > 0 && (
                          <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                            {formatNumberWithCommas(agent.final_sale_volume)} ت
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-bold text-[#172033]">
                ریز معاملات بسته شده در این بازه ({transactions.length} مورد)
              </h3>
            </div>
          </div>
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              در این بازه زمانی معامله نهایی‌شده‌ای ثبت نشده است.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedTransaction(item);
                    setDetailOpen(true);
                  }}
                  className="p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#145DB5] bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                        کد {item.property_code || "—"}
                      </span>
                      <h4 className="font-bold text-[#172033] truncate">
                        {item.property_title || "ملک بدون عنوان"}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-medium">
                        (
                        {item.transaction_type === "RENT" ? "اجاره" : "فروش"}
                        )
                      </span>
                    </div>
                    <p className="text-[11px] text-[#667085] mt-1">
                      خریدار:{" "}
                      <span className="font-bold text-slate-700">
                        {item.customer_name}
                      </span>{" "}
                      • مشاور:{" "}
                      <span className="font-bold text-slate-700">
                        {item.agent_name}
                      </span>{" "}
                      • تاریخ: {formatJalaaliDateTime(item.contract_date)}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    {item.transaction_type === "RENT" ? (
                      <div className="text-xs font-bold text-amber-700">
                        {formatNumberWithCommas(item.deposit_amount || 0)} رهن /{" "}
                        {formatNumberWithCommas(item.rent_amount || 0)} اجاره
                      </div>
                    ) : (
                      <div className="text-xs font-black text-emerald-700">
                        {formatNumberWithCommas(item.final_price || 0)} تومان
                      </div>
                    )}
                    <span className="text-[10px] text-[#145DB5] font-bold mt-0.5 block hover:underline">
                      مشاهده جزئیات ←
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TransactionDetailModal
        isOpen={detailOpen}
        transaction={selectedTransaction}
        onClose={() => {
          setDetailOpen(false);
          setSelectedTransaction(null);
        }}
        onRefresh={loadReport}
        showToast={showToast}
      />
    </div>
  );
};
