import React, { useState, useEffect } from "react";
import { api } from "../services/apiClient.ts";

export function usePropertyPage({
  page,
  setPage,
  tab,
  search,
  filters,
  branchId,
  refreshKey,
}: {
  page: number;
  setPage: (p: number) => void;
  tab: string;
  search: string;
  filters: any;
  branchId?: string;
  refreshKey: number;
}) {
  const [state, setState] = useState<{
    data: any[];
    total: number;
    loading: boolean;
    error: string;
  }>({ data: [], total: 0, loading: true, error: "" });

  const query = new URLSearchParams({
    page: String(page),
    limit: "10",
    status: tab.toLowerCase(),
    search,
    property_status: filters.status,
    visibility: filters.visibility || "ALL",
    listing_type: filters.listingType,
    property_type: filters.propertyType,
    district: filters.neighborhood,
    min_price: String(filters.minPrice),
    max_price: String(filters.maxPrice),
    min_area: String(filters.minArea),
    max_area: String(filters.maxArea),
    has_parking: String(filters.hasParking),
    has_elevator: String(filters.hasElevator),
    has_storage: String(filters.hasStorage),
    has_balcony: String(filters.hasBalcony),
  });
  if (filters.bedrooms !== "ALL") query.set("bedrooms", String(filters.bedrooms));
  if (branchId && branchId !== "ALL") query.set("branch_id", branchId);
  const queryString = query.toString();

  useEffect(() => {
    let current = true;
    setState((previous) => ({ ...previous, data: [], loading: true, error: "" }));
    api
      .get(`/api/v1/properties?${queryString}`)
      .then((response) => {
        if (!current) return;
        if (!response.success) {
          throw new Error(response.error?.message || "خطا در دریافت املاک");
        }
        const total = response.meta?.total ?? response.data.length;
        const lastPage = Math.max(1, Math.ceil(total / 10));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setState({ data: response.data, total, loading: false, error: "" });
      })
      .catch((error: any) => {
        if (current) {
          setState({
            data: [],
            total: 0,
            loading: false,
            error: error.message || "ارتباط با سرور برقرار نشد.",
          });
        }
      });
    return () => {
      current = false;
    };
  }, [queryString, refreshKey]);

  return state;
}

export function taskIsOverdue(task: { status: string; due_at: string }, now = new Date()): boolean {
  return !["COMPLETED", "CANCELLED"].includes(task.status) && new Date(task.due_at) < now;
}

export function useInstallPrompt() {
  const standalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;
  const [installed, setInstalled] = useState(
    () => standalone() || (window as any).melktakAppInstalled === true
  );
  const [promptEvent, setPromptEvent] = useState(
    () => (window as any).melktakInstallPrompt || null
  );

  useEffect(() => {
    const ready = () => setPromptEvent((window as any).melktakInstallPrompt || null);
    const done = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    const media = window.matchMedia("(display-mode: standalone)");
    const changed = () => setInstalled(standalone());
    window.addEventListener("melktak:installprompt", ready);
    window.addEventListener("appinstalled", done);
    media.addEventListener("change", changed);
    ready();
    return () => {
      window.removeEventListener("melktak:installprompt", ready);
      window.removeEventListener("appinstalled", done);
      media.removeEventListener("change", changed);
    };
  }, []);

  return {
    isInstalled: installed,
    isInstallable: !!promptEvent,
    isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent),
    install: async () => {
      const event = (window as any).melktakInstallPrompt;
      if (!event) return false;
      (window as any).melktakInstallPrompt = null;
      window.dispatchEvent(new Event("melktak:installprompt"));
      try {
        await event.prompt();
        return (await event.userChoice).outcome === "accepted";
      } catch {
        return false;
      }
    },
  };
}

export const PWAInstallCard: React.FC = () => {
  const { isInstalled: installed, isInstallable, isIOS, install: requestInstall } =
    useInstallPrompt();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (installed) return null;

  const install = async () => {
    if (busy) return;
    if (!isInstallable) {
      setMessage(
        isIOS
          ? "در سافاری، دکمه Share و سپس Add to Home Screen را انتخاب کنید."
          : "در Chrome و با اتصال امن، از منوی مرورگر گزینه «نصب برنامه» یا «افزودن به صفحه اصلی» را انتخاب کنید."
      );
      return;
    }
    setBusy(true);
    const accepted = await requestInstall();
    setMessage(
      accepted
        ? "در حال نصب برنامه…"
        : "نصب برنامه انجام نشد. می‌توانید دوباره از منوی مرورگر اقدام کنید."
    );
    setBusy(false);
  };

  return (
    <section
      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-4"
      aria-label="نصب اپلیکیشن"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-extrabold" style={{ color: "#000" }}>
            نصب اپلیکیشن ملک تک
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            دسترسی سریع از صفحه اصلی موبایل
          </p>
        </div>
        <button
          type="button"
          onClick={install}
          disabled={busy}
          className="bg-white border border-blue-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs hover:bg-blue-50 transition shrink-0 disabled:opacity-50"
          style={{ color: "#000" }}
          aria-label="نصب اپلیکیشن ملک تک"
        >
          {busy ? "در حال نصب…" : "نصب اپلیکیشن"}
        </button>
      </div>
      {message && (
        <p role="status" className="text-[11px] text-slate-600 mt-2">
          {message}
        </p>
      )}
    </section>
  );
};

export async function getPropertyChoices() {
  const data: any[] = [];
  for (let page = 1; ; page++) {
    const response = await api.get(`/api/v1/properties?status=all&limit=200&page=${page}`);
    if (!response.success) return response;
    data.push(...response.data);
    if (page >= (response.meta?.total_pages || 1)) return { success: true, data };
  }
}
