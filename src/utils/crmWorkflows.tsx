import React, { useState, useEffect } from "react";
import { api } from "../services/apiClient.ts";
import { getActiveOfflineScope } from "../services/offlineLicense.ts";
import { offlineSync } from "../services/offlineSync.ts";

function filterOfflineProperties(
  items: any[],
  params: {
    tab: string;
    search: string;
    filters: any;
    branchId?: string;
    page: number;
  },
) {
  const { tab, search, filters, branchId, page } = params;
  const tabLower = String(tab || "ACTIVE").toLowerCase();
  const q = search.trim().toLowerCase();

  let list = items.filter((p) => {
    const isArch = p.is_archived || p.status === "ARCHIVED";
    if (tabLower === "active" && isArch) return false;
    if (tabLower === "archived" && !isArch) return false;
    if (branchId && branchId !== "ALL" && p.branch_id && p.branch_id !== branchId) {
      return false;
    }
    if (filters.status && filters.status !== "ALL" && p.status !== filters.status) {
      return false;
    }
    if (filters.visibility && filters.visibility !== "ALL" && p.visibility !== filters.visibility) {
      return false;
    }
    if (filters.listingType && filters.listingType !== "ALL" && p.listing_type !== filters.listingType) {
      return false;
    }
    if (filters.propertyType && filters.propertyType !== "ALL" && p.property_type !== filters.propertyType) {
      return false;
    }
    const nName = String(p.address?.district || p.address?.neighborhood || "").trim();
    if (filters.neighborhood && filters.neighborhood.trim() && nName !== filters.neighborhood.trim()) {
      return false;
    }
    if (filters.minPrice !== "") {
      const price = p.listing_type === "RENT" ? Number(p.deposit_amount || 0) : Number(p.price_total || 0);
      if (price < Number(filters.minPrice)) return false;
    }
    if (filters.maxPrice !== "") {
      const price = p.listing_type === "RENT" ? Number(p.deposit_amount || 0) : Number(p.price_total || 0);
      if (price > Number(filters.maxPrice)) return false;
    }
    if (filters.minArea !== "" && Number(p.area_sqm || 0) < Number(filters.minArea)) return false;
    if (filters.maxArea !== "" && Number(p.area_sqm || 0) > Number(filters.maxArea)) return false;
    if (filters.bedrooms !== "ALL" && Number(p.bedrooms || 0) < Number(filters.bedrooms)) return false;
    if (filters.hasParking && !p.has_parking) return false;
    if (filters.hasElevator && !p.has_elevator) return false;
    if (filters.hasStorage && !p.has_storage) return false;
    if (filters.hasBalcony && !p.has_balcony) return false;
    if (q) {
      const hay = `${p.code || ""} ${p.title || ""} ${nName} ${p.description || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  list = list.sort((a, b) =>
    String(b.created_at || "").localeCompare(String(a.created_at || "")),
  );
  const total = list.length;
  const start = (Math.max(1, page) - 1) * 10;
  return { data: list.slice(start, start + 10), total };
}

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

    const loadOfflineFallback = async () => {
      try {
        const scope = await getActiveOfflineScope();
        if (!scope || !current) return false;
        const cached = await offlineSync.loadSnapshot<any[]>(
          scope,
          "properties",
          branchId || "ALL",
        );
        if (!cached || !current) return false;
        const filtered = filterOfflineProperties(cached, {
          tab,
          search,
          filters,
          branchId,
          page,
        });
        const lastPage = Math.max(1, Math.ceil(filtered.total / 10));
        if (page > lastPage) {
          setPage(lastPage);
          return true;
        }
        setState({ data: filtered.data, total: filtered.total, loading: false, error: "" });
        return true;
      } catch {
        return false;
      }
    };

    const offlineEnv = typeof navigator !== "undefined" && !navigator.onLine;
    if (offlineEnv) {
      loadOfflineFallback().then((ok) => {
        if (current && !ok) {
          setState({
            data: [],
            total: 0,
            loading: false,
            error: "اطلاعات آفلاین برای املاک یافت نشد.",
          });
        }
      });
      return () => {
        current = false;
      };
    }

    api
      .get(`/api/v1/properties?${queryString}`)
      .then(async (response) => {
        if (!current) return;
        if (!response.success) {
          if (response.status === 0 || response.error?.code === "NETWORK_ERROR") {
            const ok = await loadOfflineFallback();
            if (ok) return;
          }
          throw new Error(response.error?.message || "خطا در دریافت املاک");
        }
        let rows = response.data || [];
        let total = response.meta?.total ?? rows.length;
        try {
          const scope = await getActiveOfflineScope();
          if (scope) {
            const overlaid = await offlineSync.applyDomainOverlay(scope, "properties", rows);
            // Adjust for optimistic post/delete if queue items exist
            const diff = overlaid.length - rows.length;
            rows = overlaid.filter((p) => {
              const isArch = p.is_archived || p.status === "ARCHIVED";
              return tab === "ARCHIVED" ? isArch : !isArch;
            });
            total = Math.max(0, total + diff);
          }
        } catch {
          // ignore overlay error
        }
        const lastPage = Math.max(1, Math.ceil(total / 10));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setState({ data: rows, total, loading: false, error: "" });
      })
      .catch(async (error: any) => {
        const ok = await loadOfflineFallback();
        if (current && !ok) {
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
  const loadCached = async () => {
    const scope = await getActiveOfflineScope();
    if (!scope) return null;
    return offlineSync.loadSnapshot<any[]>(scope, "properties", "ALL");
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = await loadCached();
    if (cached) return { success: true, data: cached };
  }

  const data: any[] = [];
  for (let page = 1; ; page++) {
    const response = await api.get(`/api/v1/properties?status=all&limit=200&page=${page}`);
    if (!response.success) {
      if (response.status === 0 || response.error?.code === "NETWORK_ERROR") {
        const cached = await loadCached();
        if (cached) return { success: true, data: cached };
      }
      return response;
    }
    data.push(...response.data);
    if (page >= (response.meta?.total_pages || 1)) return { success: true, data };
  }
}
