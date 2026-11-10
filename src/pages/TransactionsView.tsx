import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  Building2,
  Calendar,
  Handshake,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import { api } from "../services/apiClient.ts";
import { useAuth } from "../context/AuthContext.tsx";
import {
  formatJalaaliDateTime,
  formatNumberWithCommas,
  formatTomanWords,
} from "../utils/jalaali.ts";
import { TransactionDetailModal } from "../components/modals/TransactionDetailModal.tsx";
import { CreateTransactionModal } from "../components/modals/CreateTransactionModal.tsx";

export interface TransactionsViewProps {
  onBack?: () => void;
  showToast?: (msg: string, type?: string) => void;
  onDataChanged?: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onBack,
  showToast,
  onDataChanged,
}) => {
  const { user: _user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "ALL") params.append("type", typeFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      const url = `/api/v1/transactions${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const res = await api.get(url);
      if (res.success && res.data) {
        setTransactions(res.data);
        setSelectedTransaction((previous: any) =>
          previous
            ? {
                ...previous,
                ...res.data.find((item: any) => item.id === previous.id),
              }
            : null
        );
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
      showToast?.("خطا در دریافت لیست معاملات.", "error");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, showToast]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filtered = transactions.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      item.customer_name?.toLowerCase().includes(q) ||
      item.owner_name?.toLowerCase().includes(q) ||
      item.property_title?.toLowerCase().includes(q) ||
      item.property_code?.toLowerCase().includes(q) ||
      item.agent_name?.toLowerCase().includes(q)
    );
  });

  const completed = transactions.filter((item) => item.status === "COMPLETED");
  const totalSaleVolume = completed
    .filter((item) => item.transaction_type !== "RENT")
    .reduce((acc, item) => acc + (item.final_price || 0), 0);
  const rentCount = completed.filter(
    (item) => item.transaction_type === "RENT"
  ).length;
  const saleCount = completed.filter(
    (item) => item.transaction_type !== "RENT"
  ).length;

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
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#145DB5] flex items-center justify-center shrink-0">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-[#172033]">
                مدیریت قراردادها و معاملات
              </h1>
              <p className="text-[11px] text-[#667085]">
                {transactions.length} پرونده معامله ثبت شده در آژانس
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadTransactions()}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="بروزرسانی لیست"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#145DB5] hover:bg-[#0F4383] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-98 transition"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت معامله جدید</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium block">
              کل قراردادهای موفق
            </span>
            <div className="text-base sm:text-lg font-black text-[#172033] mt-0.5">
              {completed.length}{" "}
              <span className="text-[10px] font-normal text-slate-500">
                فقره
              </span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium block">
              حجم فروش نهایی
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5 truncate">
              {totalSaleVolume >= 1e9
                ? `${(totalSaleVolume / 1e9).toFixed(1)} میلیارد`
                : `${(totalSaleVolume / 1e6).toFixed(0)} میلیون`}{" "}
              <span className="text-[10px] font-normal text-slate-500">
                تومان
              </span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium block">
              معاملات فروش
            </span>
            <div className="text-base sm:text-lg font-black text-[#145DB5] mt-0.5">
              {saleCount}{" "}
              <span className="text-[10px] font-normal text-slate-500">
                مورد
              </span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium block">
              قراردادهای اجاره
            </span>
            <div className="text-base sm:text-lg font-black text-amber-700 mt-0.5">
              {rentCount}{" "}
              <span className="text-[10px] font-normal text-slate-500">
                مورد
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs space-y-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="جستجو بر اساس نام خریدار، فروشنده، عنوان ملک، کد فایل یا نام مشاور..."
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-9 text-xs focus:bg-white focus:border-[#145DB5] outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: "ALL", label: "همه انواع" },
                { id: "SALE", label: "فروش" },
                { id: "RENT", label: "رهن و اجاره" },
                { id: "PRE_SALE", label: "پیش‌فروش" },
                { id: "EXCHANGE", label: "معاوضه" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTypeFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    typeFilter === opt.id
                      ? "bg-[#145DB5] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[
                { id: "ALL", label: "همه وضعیت‌ها" },
                { id: "COMPLETED", label: "نهایی‌شده" },
                { id: "CANCELLED", label: "لغوشده" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setStatusFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                    statusFilter === opt.id
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-4 bg-slate-200 rounded w-16" />
                </div>
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-5 bg-slate-100 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-2xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#145DB5] flex items-center justify-center mx-auto">
              <Handshake className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-[#172033]">
              هیچ معامله‌ای یافت نشد
            </h3>
            <p className="text-xs text-[#667085] max-w-sm mx-auto">
              {search || typeFilter !== "ALL" || statusFilter !== "ALL"
                ? "با فیلترهای انتخابی موردی پیدا نشد. می‌توانید فیلترها را تغییر دهید."
                : "هنوز معامله‌ای در سیستم ثبت نشده است. با ثبت اولین معامله، وضعیت ملک به نهایی‌شده تغییر می‌کند و در کارنامه مشاور لحاظ می‌شود."}
            </p>
            <button
              onClick={() => setCreateOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#145DB5] text-white text-xs font-bold hover:bg-[#0F4383] transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              ثبت اولین معامله
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const isRent = item.transaction_type === "RENT";
              const isCompleted = item.status === "COMPLETED";
              return (
                <div
                  key={item.id}
                  onClick={async () => {
                    const response = await api.get(
                      `/api/v1/transactions/${item.id}`
                    );
                    if (response.success) {
                      setSelectedTransaction(response.data);
                      setDetailOpen(true);
                    } else {
                      showToast?.(
                        response.error?.message || "خطا در دریافت معامله."
                      );
                    }
                  }}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:border-[#145DB5] hover:shadow-sm transition cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#145DB5] flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#145DB5] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shrink-0">
                            کد {item.property_code || "—"}
                          </span>
                          <h4 className="text-xs font-bold text-[#172033] truncate group-hover:text-[#145DB5] transition">
                            {item.property_title || "ملک بدون عنوان"}
                          </h4>
                        </div>
                        <p className="text-[11px] text-[#667085] truncate mt-0.5">
                          {item.property_neighborhood ||
                            item.property_city ||
                            "محدوده ثبت نشده"}
                          {item.property_area_sqm
                            ? ` • ${item.property_area_sqm} متر`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          isRent
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : item.transaction_type === "PRE_SALE"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {isRent
                          ? "رهن و اجاره"
                          : item.transaction_type === "PRE_SALE"
                          ? "پیش‌فروش"
                          : item.transaction_type === "EXCHANGE"
                          ? "معاوضه"
                          : "فروش قطعی"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {isCompleted ? "نهایی‌شده" : "لغوشده"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2.5 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <span className="text-[11px] text-slate-400">
                          طرف اول (خریدار):
                        </span>
                        <span className="font-bold">{item.customer_name}</span>
                        {item.customer_phone && (
                          <span className="text-[11px] font-mono text-slate-500">
                            ({item.customer_phone})
                          </span>
                        )}
                      </div>
                      {item.owner_name && (
                        <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                          <span className="text-slate-400">
                            طرف دوم (مالک):
                          </span>
                          <span className="font-medium">{item.owner_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="sm:text-left">
                      {isRent ? (
                        <div>
                          <div className="text-xs font-bold text-amber-800">
                            رهن:{" "}
                            {formatNumberWithCommas(item.deposit_amount || 0)}{" "}
                            <span className="text-[10px] font-normal text-slate-500">
                              تومان
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-700 mt-0.5">
                            اجاره:{" "}
                            {formatNumberWithCommas(item.rent_amount || 0)}{" "}
                            <span className="text-[10px] font-normal text-slate-500">
                              تومان/ماه
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-black text-emerald-700">
                            {formatNumberWithCommas(item.final_price || 0)}{" "}
                            <span className="text-[10px] font-normal text-slate-500">
                              تومان
                            </span>
                          </div>
                          {item.final_price && (
                            <span className="text-[10px] text-slate-500 block truncate">
                              {formatTomanWords(item.final_price)} تومان
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-[#667085]">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatJalaaliDateTime(item.contract_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        مشاور: {item.agent_name || "ثبت‌کننده دفتر"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.documents_count ? (
                        <span className="flex items-center gap-1 text-[#145DB5] font-bold bg-blue-50 px-2 py-0.5 rounded">
                          <Paperclip className="w-3 h-3" />
                          {item.documents_count} سند پیوست
                        </span>
                      ) : null}
                      <span className="text-[#145DB5] font-bold group-hover:underline">
                        مشاهده جزئیات ←
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TransactionDetailModal
        key={selectedTransaction?.id}
        isOpen={detailOpen}
        transaction={selectedTransaction}
        onClose={() => {
          setDetailOpen(false);
          setSelectedTransaction(null);
        }}
        onRefresh={() => {
          loadTransactions();
          onDataChanged?.();
        }}
        showToast={showToast}
      />
      <CreateTransactionModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          loadTransactions();
          onDataChanged?.();
        }}
        showToast={showToast}
      />
    </div>
  );
};
