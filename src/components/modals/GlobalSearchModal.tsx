import React, { useState, useEffect } from "react";
import { Building2, Search, Users, X } from "lucide-react";
import { api } from "../../services/apiClient.ts";
import { PropertyCard } from "../common/PropertyCard.tsx";
import { CustomerCard } from "../common/CustomerCard.tsx";

export const GlobalSearchModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectProperty?: (property: any) => void;
  onSelectCustomer?: (customer: any) => void;
  onFollowUpCustomer?: (customer: any) => void;
}> = ({
  isOpen,
  onClose,
  onSelectProperty,
  onSelectCustomer,
  onFollowUpCustomer,
}) => {
  const [query, setQuery] = useState("");
  const [properties, setProperties] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setProperties([]);
      setCustomers([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(
          `/api/v1/search?q=${encodeURIComponent(query.trim())}`
        );
        if (res.success && res.data) {
          setProperties(res.data.properties || []);
          setCustomers(res.data.customers || []);
          setSearched(true);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs pt-4 sm:pt-10">
      <div className="w-full max-w-md max-h-[88vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 bg-white flex items-center gap-2">
          <Search className="w-4 h-4 text-[#145DB5] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی کد ملک، نام مشتری، تلفن یا منطقه..."
            className="flex-1 text-xs text-[#172033] placeholder-slate-400 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[#145DB5] px-2 py-1 rounded hover:bg-slate-100"
          >
            بستن
          </button>
        </div>

        <div className="px-3.5 py-2 bg-[#F7F9FC] border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-[#145DB5] font-extrabold shrink-0">
            فیلتر محله:
          </span>
          {["گلشهر", "عظیمیه", "جهان‌شهر", "مهرشهر", "گوهردشت"].map((hood) => (
            <button
              key={hood}
              onClick={() => setQuery(hood)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition shrink-0 ${
                query === hood
                  ? "bg-[#145DB5] text-white border-[#145DB5] font-bold"
                  : "bg-white border-slate-200 text-[#172033] hover:border-[#145DB5]"
              }`}
            >
              محله {hood}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {loading && (
            <div className="text-center py-8 text-xs text-[#667085]">
              در حال جستجو در بانک اطلاعاتی املاک و متقاضیان...
            </div>
          )}
          {!loading &&
            searched &&
            properties.length === 0 &&
            customers.length === 0 && (
              <div className="text-center py-10 text-xs text-[#667085]">
                موردی منطبق با عبارت «{query}» یافت نشد.
              </div>
            )}
          {!loading && !searched && (
            <div className="text-center py-12 text-xs text-[#667085]">
              کد فایل، نام خریدار یا نام منطقه را تایپ کنید تا نتایج بلافاصله
              نمایش داده شوند.
            </div>
          )}
          {properties.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-[#145DB5]">
                <Building2 className="w-4 h-4" />
                <span>املاک منطبق ({properties.length})</span>
              </div>
              <div className="space-y-2.5">
                {properties.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    onSelect={(selected) => {
                      onClose();
                      onSelectProperty?.(selected);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          {customers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-emerald-700">
                <Users className="w-4 h-4" />
                <span>متقاضیان منطبق ({customers.length})</span>
              </div>
              <div className="space-y-2.5">
                {customers.map((cust) => (
                  <CustomerCard
                    key={cust.id}
                    customer={cust}
                    onSelect={(selected) => {
                      onClose();
                      onSelectCustomer?.(selected);
                    }}
                    onFollowUp={(selected) => {
                      onClose();
                      onFollowUpCustomer?.(selected);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
