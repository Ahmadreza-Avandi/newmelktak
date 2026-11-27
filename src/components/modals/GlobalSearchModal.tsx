import React, { useState, useEffect, useCallback } from "react";
import { Building2, Search, Trash2, Users, X } from "lucide-react";
import { api } from "../../services/apiClient.ts";
import { PropertyCard } from "../common/PropertyCard.tsx";
import { CustomerCard } from "../common/CustomerCard.tsx";

export const GlobalSearchModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectProperty?: (property: any) => void;
  onSelectCustomer?: (customer: any) => void;
  onFollowUpCustomer?: (customer: any) => void;
  onNeighborhoodDeleted?: () => void;
}> = ({
  isOpen,
  onClose,
  onSelectProperty,
  onSelectCustomer,
  onFollowUpCustomer,
  onNeighborhoodDeleted,
}) => {
  const [query, setQuery] = useState("");
  const [properties, setProperties] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [confirmDeleteHood, setConfirmDeleteHood] = useState<string | null>(null);
  const [deletingHood, setDeletingHood] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const loadNeighborhoods = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/properties/neighborhoods");
      if (res.success && Array.isArray(res.data)) {
        setNeighborhoods(res.data);
      }
    } catch {
      // keep existing state on transient fetch error
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNeighborhoods();
      setConfirmDeleteHood(null);
    }
  }, [isOpen, loadNeighborhoods]);

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

  const handleDeleteHood = async (hood: string) => {
    setDeletingHood(true);
    try {
      const res = await api.delete(
        `/api/v1/properties/neighborhoods?name=${encodeURIComponent(hood)}`
      );
      if (res.success) {
        setNeighborhoods((prev) => prev.filter((item) => item !== hood));
        if (query === hood) setQuery("");
        setConfirmDeleteHood(null);
        onNeighborhoodDeleted?.();
      }
    } finally {
      setDeletingHood(false);
    }
  };

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

        {neighborhoods.length > 0 && (
          <div className="px-3.5 py-2 bg-[#F7F9FC] border-b border-slate-100 space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-[#145DB5] font-extrabold shrink-0">
                فیلتر محله:
              </span>
              {neighborhoods.map((hood) => (
                <div
                  key={hood}
                  className={`inline-flex items-center rounded-full border text-[10px] shrink-0 overflow-hidden transition ${
                    query === hood
                      ? "bg-[#145DB5] text-white border-[#145DB5] font-bold"
                      : "bg-white border-slate-200 text-[#172033]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setQuery(query === hood ? "" : hood)}
                    className="px-2 py-0.5 cursor-pointer"
                  >
                    محله {hood}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDeleteHood(confirmDeleteHood === hood ? null : hood)
                    }
                    title={`حذف محله ${hood}`}
                    aria-label={`حذف محله ${hood}`}
                    className={`px-1.5 py-0.5 border-r cursor-pointer ${
                      query === hood
                        ? "border-blue-300 text-white hover:bg-rose-700"
                        : "border-slate-200 text-rose-600 hover:bg-rose-100"
                    }`}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
            {confirmDeleteHood && (
              <div className="flex items-center justify-between gap-2 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 text-[10px]">
                <span className="text-rose-800 font-semibold">
                  حذف محله «{confirmDeleteHood}» تایید شود؟
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={deletingHood}
                    onClick={() => handleDeleteHood(confirmDeleteHood)}
                    className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer"
                  >
                    {deletingHood ? "..." : "حذف"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteHood(null)}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                  >
                    لغو
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
