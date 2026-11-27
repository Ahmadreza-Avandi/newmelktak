import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Database,
  Table2,
  Terminal,
  Layers,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Download,
  LogOut,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Play,
  X,
  Check,
  AlertCircle,
  Eye,
  Home,
} from "lucide-react";

type TabMode = "overview" | "browse" | "structure" | "sql";

interface TableSummary {
  table_name: string;
  table_type: string;
  column_count: number;
  has_primary_key: boolean;
  row_count: number;
  total_bytes: number;
  size_formatted: string;
}

interface OverviewData {
  engine: string;
  version: string;
  database_name: string;
  database_size_bytes: number;
  database_size_formatted: string;
  total_tables: number;
  total_rows: number;
  tables: TableSummary[];
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  ordinal_position: number;
  is_primary_key: boolean;
}

interface StructureData {
  table: string;
  table_type: string;
  row_count: number;
  primaryKeys: string[];
  columns: ColumnInfo[];
  indexes: Array<{ indexname: string; indexdef: string }>;
  foreignKeys: Array<{
    constraint_name: string;
    column_name: string;
    foreign_table_name: string;
    foreign_column_name: string;
  }>;
}

interface SqlResultBlock {
  command: string;
  rowCount: number;
  fields: string[];
  rows: Record<string, unknown>[];
  truncated?: boolean;
}

function formatCellValue(val: unknown): { text: string; isNull: boolean } {
  if (val === null || val === undefined) {
    return { text: "NULL", isNull: true };
  }
  if (typeof val === "boolean") {
    return { text: val ? "true" : "false", isNull: false };
  }
  if (typeof val === "object") {
    return { text: JSON.stringify(val), isNull: false };
  }
  return { text: String(val), isNull: false };
}

function isJsonColumn(col: ColumnInfo): boolean {
  const t = String(col.data_type || "").toLowerCase();
  const u = String(col.udt_name || "").toLowerCase();
  return t === "jsonb" || t === "json" || u === "jsonb" || u === "json";
}

function isBooleanColumn(col: ColumnInfo): boolean {
  const t = String(col.data_type || "").toLowerCase();
  const u = String(col.udt_name || "").toLowerCase();
  return t === "boolean" || u === "bool";
}

export const DbAdminPage: React.FC<{ onBackToApp?: () => void }> = ({ onBackToApp }) => {
  const [token, setToken] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<{ username: string; display_name: string } | null>(null);

  // Auth form state
  const [authUsername, setAuthUsername] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Studio state
  const [tab, setTab] = useState<TabMode>("overview");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [tableFilter, setTableFilter] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Browse state
  const [browseCols, setBrowseCols] = useState<ColumnInfo[]>([]);
  const [browsePKs, setBrowsePKs] = useState<string[]>([]);
  const [browseRows, setBrowseRows] = useState<Record<string, unknown>[]>([]);
  const [browsePage, setBrowsePage] = useState(1);
  const [browsePageSize, setBrowsePageSize] = useState(25);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browseTotalPages, setBrowseTotalPages] = useState(1);
  const [browseSortBy, setBrowseSortBy] = useState<string>("");
  const [browseSortDir, setBrowseSortDir] = useState<"ASC" | "DESC">("DESC");
  const [browseSearchInput, setBrowseSearchInput] = useState("");
  const [browseSearch, setBrowseSearch] = useState("");
  const [loadingBrowse, setLoadingBrowse] = useState(false);

  // Structure state
  const [structure, setStructure] = useState<StructureData | null>(null);
  const [loadingStructure, setLoadingStructure] = useState(false);

  // SQL Console state
  const [sqlText, setSqlText] = useState(
    "SELECT table_name, table_type\nFROM information_schema.tables\nWHERE table_schema = 'public'\nORDER BY table_name;",
  );
  const [sqlRunning, setSqlRunning] = useState(false);
  const [sqlError, setSqlError] = useState<{ message: string; detail?: string; hint?: string } | null>(null);
  const [sqlDurationMs, setSqlDurationMs] = useState<number | null>(null);
  const [sqlResults, setSqlResults] = useState<SqlResultBlock[] | null>(null);
  const [sqlHistory, setSqlHistory] = useState<string[]>([]);

  // Modals
  const [rowModalMode, setRowModalMode] = useState<"insert" | "edit" | null>(null);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [nullFlags, setNullFlags] = useState<Record<string, boolean>>({});
  const [rowSaving, setRowSaving] = useState(false);
  const [rowModalError, setRowModalError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [inspectCell, setInspectCell] = useState<{ column: string; value: unknown } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 3500);
  }, []);

  const apiFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers as Record<string, string> | undefined),
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(path, {
        ...options,
        credentials: "include",
        headers,
      });
      if (res.status === 401) {
        setAuthenticated(false);
        setToken(null);
      }
      const json = await res.json().catch(() => null);
      return { status: res.status, ok: res.ok, json };
    },
    [token],
  );

  const checkSetupStatus = useCallback(async () => {
    setAuthChecking(true);
    try {
      const { ok, json } = await apiFetch("/api/v1/platform/auth/setup-status");
      if (ok && json?.success && json.data) {
        setNeedsSetup(Boolean(json.data.needsSetup));
        if (json.data.authenticated && json.data.admin) {
          setAuthenticated(true);
          setAdminUser(json.data.admin);
        } else {
          setAuthenticated(false);
        }
      }
    } catch {
      setAuthError("ارتباط با سرور برقرار نشد.");
    } finally {
      setAuthChecking(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    checkSetupStatus();
  }, [checkSetupStatus]);

  const loadOverview = useCallback(async () => {
    if (!authenticated) return;
    setLoadingOverview(true);
    setBannerError(null);
    try {
      const { ok, json } = await apiFetch("/api/v1/platform/db/overview");
      if (ok && json?.success && json.data) {
        setOverview(json.data);
        setSelectedTable((prev) => {
          if (prev && json.data.tables.some((t: TableSummary) => t.table_name === prev)) {
            return prev;
          }
          return json.data.tables[0]?.table_name || null;
        });
      } else {
        setBannerError(json?.error?.message || "خطا در دریافت اطلاعات دیتابیس.");
      }
    } catch {
      setBannerError("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoadingOverview(false);
    }
  }, [authenticated, apiFetch]);

  useEffect(() => {
    if (authenticated) {
      loadOverview();
    }
  }, [authenticated, loadOverview]);

  const loadBrowse = useCallback(
    async (
      tableName: string,
      opts: { page: number; pageSize: number; sortBy: string; sortDir: "ASC" | "DESC"; search: string },
    ) => {
      if (!authenticated || !tableName) return;
      setLoadingBrowse(true);
      setBannerError(null);

      const params = new URLSearchParams({
        page: String(opts.page),
        pageSize: String(opts.pageSize),
        sortDir: opts.sortDir,
      });
      if (opts.sortBy) params.set("sortBy", opts.sortBy);
      if (opts.search) params.set("search", opts.search);

      try {
        const { ok, json } = await apiFetch(
          `/api/v1/platform/db/tables/${encodeURIComponent(tableName)}/rows?${params.toString()}`,
        );
        if (ok && json?.success && json.data) {
          setBrowseCols(json.data.columns || []);
          setBrowsePKs(json.data.primaryKeys || []);
          setBrowseRows(json.data.rows || []);
          setBrowseTotal(json.data.pagination?.total || 0);
          setBrowseTotalPages(json.data.pagination?.totalPages || 1);
          setBrowsePage(json.data.pagination?.page || opts.page);
        } else {
          setBannerError(json?.error?.message || "خطا در بارگذاری رکوردها.");
        }
      } catch {
        setBannerError("خطا در دریافت داده‌های جدول.");
      } finally {
        setLoadingBrowse(false);
      }
    },
    [authenticated, apiFetch],
  );

  const loadStructure = useCallback(
    async (tableName: string) => {
      if (!authenticated || !tableName) return;
      setLoadingStructure(true);
      setBannerError(null);
      try {
        const { ok, json } = await apiFetch(
          `/api/v1/platform/db/tables/${encodeURIComponent(tableName)}/structure`,
        );
        if (ok && json?.success && json.data) {
          setStructure(json.data);
        } else {
          setBannerError(json?.error?.message || "خطا در دریافت ساختار جدول.");
        }
      } catch {
        setBannerError("خطا در دریافت ساختار جدول.");
      } finally {
        setLoadingStructure(false);
      }
    },
    [authenticated, apiFetch],
  );

  useEffect(() => {
    if (!authenticated || !selectedTable) return;
    if (tab === "browse") {
      void loadBrowse(selectedTable, {
        page: browsePage,
        pageSize: browsePageSize,
        sortBy: browseSortBy,
        sortDir: browseSortDir,
        search: browseSearch,
      });
    } else if (tab === "structure") {
      void loadStructure(selectedTable);
    }
  }, [authenticated, selectedTable, tab, browsePage, browsePageSize, browseSortBy, browseSortDir, browseSearch, loadBrowse, loadStructure]);

  const reloadCurrentBrowse = useCallback(() => {
    if (!selectedTable) return Promise.resolve();
    return loadBrowse(selectedTable, {
      page: browsePage,
      pageSize: browsePageSize,
      sortBy: browseSortBy,
      sortDir: browseSortDir,
      search: browseSearch,
    });
  }, [selectedTable, browsePage, browsePageSize, browseSortBy, browseSortDir, browseSearch, loadBrowse]);

  const handleSelectTable = (tableName: string, targetTab: TabMode = "browse") => {
    setSelectedTable(tableName);
    setBrowsePage(1);
    setBrowseSortBy("");
    setBrowseSortDir("DESC");
    setBrowseSearch("");
    setBrowseSearchInput("");
    setTab(targetTab);
  };

  const handleSetupSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setAuthError(null);
    if (authPassword !== authConfirmPassword) {
      setAuthError("رمز عبور و تکرار آن یکسان نیستند.");
      return;
    }
    setAuthSubmitting(true);
    try {
      const { ok, json } = await apiFetch("/api/v1/platform/auth/setup", {
        method: "POST",
        body: JSON.stringify({
          username: authUsername.trim(),
          display_name: authDisplayName.trim() || undefined,
          password: authPassword,
        }),
      });
      if (ok && json?.success && json.data) {
        setToken(json.data.token || null);
        setAdminUser(json.data.admin);
        setNeedsSetup(false);
        setAuthenticated(true);
        setAuthPassword("");
        setAuthConfirmPassword("");
      } else {
        setAuthError(json?.error?.message || "خطا در ایجاد حساب مدیر.");
      }
    } catch {
      setAuthError("ارتباط با سرور برقرار نشد.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLoginSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const { ok, json } = await apiFetch("/api/v1/platform/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword,
        }),
      });
      if (ok && json?.success && json.data) {
        setToken(json.data.token || null);
        setAdminUser(json.data.admin);
        setAuthenticated(true);
        setAuthPassword("");
      } else {
        setAuthError(json?.error?.message || "نام کاربری یا رمز عبور اشتباه است.");
      }
    } catch {
      setAuthError("ارتباط با سرور برقرار نشد.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await apiFetch("/api/v1/platform/auth/logout", { method: "POST" }).catch(() => {});
    setToken(null);
    setAuthenticated(false);
    setAdminUser(null);
    setOverview(null);
  };

  const handleRunSql = async () => {
    const trimmed = sqlText.trim();
    if (!trimmed || sqlRunning) return;
    setSqlRunning(true);
    setSqlError(null);
    try {
      const { ok, json } = await apiFetch("/api/v1/platform/db/query", {
        method: "POST",
        body: JSON.stringify({ sql: trimmed }),
      });
      if (ok && json?.success && json.data) {
        setSqlDurationMs(json.data.durationMs);
        setSqlResults(json.data.results || []);
        setSqlHistory((prev) => [trimmed, ...prev.filter((q) => q !== trimmed)].slice(0, 10));
        // Refresh table counts in case SQL mutated rows or schema
        void loadOverview();
      } else {
        setSqlResults(null);
        setSqlError({
          message: json?.error?.message || "خطا در اجرای دستور SQL.",
          detail: json?.error?.detail || undefined,
          hint: json?.error?.hint || undefined,
        });
      }
    } catch {
      setSqlError({ message: "ارتباط با سرور برقرار نشد." });
    } finally {
      setSqlRunning(false);
    }
  };

  const openInsertModal = () => {
    const initialVals: Record<string, string> = {};
    const initialNulls: Record<string, boolean> = {};
    for (const col of browseCols) {
      initialVals[col.column_name] = "";
      initialNulls[col.column_name] = false;
    }
    setFormValues(initialVals);
    setNullFlags(initialNulls);
    setEditingRow(null);
    setRowModalError(null);
    setRowModalMode("insert");
  };

  const openEditModal = (row: Record<string, unknown>) => {
    const initialVals: Record<string, string> = {};
    const initialNulls: Record<string, boolean> = {};
    for (const col of browseCols) {
      const v = row[col.column_name];
      if (v === null || v === undefined) {
        initialVals[col.column_name] = "";
        initialNulls[col.column_name] = true;
      } else if (typeof v === "object") {
        initialVals[col.column_name] = JSON.stringify(v, null, 2);
        initialNulls[col.column_name] = false;
      } else {
        initialVals[col.column_name] = String(v);
        initialNulls[col.column_name] = false;
      }
    }
    setFormValues(initialVals);
    setNullFlags(initialNulls);
    setEditingRow(row);
    setRowModalError(null);
    setRowModalMode("edit");
  };

  const handleSaveRow = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedTable || rowSaving) return;
    setRowSaving(true);
    setRowModalError(null);

    try {
      const payloadValues: Record<string, unknown> = {};
      for (const col of browseCols) {
        const name = col.column_name;
        if (nullFlags[name]) {
          payloadValues[name] = null;
          continue;
        }
        const raw = formValues[name] ?? "";
        if (rowModalMode === "insert" && raw === "" && (col.column_default !== null || col.is_nullable === "YES")) {
          // Let database default / null apply on insert if left empty
          continue;
        }
        payloadValues[name] = raw;
      }

      if (rowModalMode === "insert") {
        const { ok, json } = await apiFetch(
          `/api/v1/platform/db/tables/${encodeURIComponent(selectedTable)}/rows`,
          {
            method: "POST",
            body: JSON.stringify({ values: payloadValues }),
          },
        );
        if (ok && json?.success) {
          setRowModalMode(null);
          showToast("رکورد جدید با موفقیت ثبت شد.");
          await Promise.all([reloadCurrentBrowse(), loadOverview()]);
        } else {
          setRowModalError(json?.error?.message || "خطا در ثبت رکورد.");
        }
      } else if (rowModalMode === "edit" && editingRow) {
        const keyObj: Record<string, unknown> = {};
        for (const pk of browsePKs) {
          keyObj[pk] = editingRow[pk];
        }
        const { ok, json } = await apiFetch(
          `/api/v1/platform/db/tables/${encodeURIComponent(selectedTable)}/rows`,
          {
            method: "PATCH",
            body: JSON.stringify({
              key: browsePKs.length > 0 ? keyObj : undefined,
              ctid: editingRow.__ctid,
              values: payloadValues,
            }),
          },
        );
        if (ok && json?.success) {
          setRowModalMode(null);
          showToast("رکورد با موفقیت ویرایش شد.");
          await reloadCurrentBrowse();
        } else {
          setRowModalError(json?.error?.message || "خطا در ویرایش رکورد.");
        }
      }
    } catch {
      setRowModalError("خطا در برقراری ارتباط با سرور.");
    } finally {
      setRowSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTable || !deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const keyObj: Record<string, unknown> = {};
      for (const pk of browsePKs) {
        keyObj[pk] = deleteTarget[pk];
      }
      const { ok, json } = await apiFetch(
        `/api/v1/platform/db/tables/${encodeURIComponent(selectedTable)}/rows`,
        {
          method: "DELETE",
          body: JSON.stringify({
            key: browsePKs.length > 0 ? keyObj : undefined,
            ctid: deleteTarget.__ctid,
          }),
        },
      );
      if (ok && json?.success) {
        setDeleteTarget(null);
        showToast("رکورد با موفقیت حذف شد.");
        await Promise.all([reloadCurrentBrowse(), loadOverview()]);
      } else {
        setBannerError(json?.error?.message || "خطا در حذف رکورد.");
      }
    } catch {
      setBannerError("خطا در ارتباط با سرور.");
    } finally {
      setDeleting(false);
    }
  };

  const handleExportTable = async (tableName: string, format: "csv" | "json") => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(
        `/api/v1/platform/db/tables/${encodeURIComponent(tableName)}/export?format=${format}`,
        { credentials: "include", headers },
      );
      if (!res.ok) {
        showToast("خطا در دریافت خروجی جدول.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tableName}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast("خطا در دانلود خروجی.");
    }
  };

  const filteredTables = useMemo(() => {
    const tables = overview?.tables || [];
    const q = tableFilter.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => t.table_name.toLowerCase().includes(q));
  }, [overview, tableFilter]);

  if (authChecking) {
    return (
      <div className="dba-auth-shell" dir="rtl">
        <div className="dba-auth-card" style={{ textAlign: "center" }}>
          <Database className="w-8 h-8 dba-text-brand mx-auto mb-3 animate-pulse" />
          <p className="text-sm font-bold dba-text-ink">در حال بررسی وضعیت پایگاه داده...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="dba-auth-shell" dir="rtl">
        <div className="dba-auth-card">
          <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
            <div className="dba-brand-mark">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-extrabold dba-text-ink">
                {needsSetup ? "راه‌اندازی مدیریت دیتابیس" : "ورود به مدیریت دیتابیس"}
              </h1>
              <p className="text-xs dba-text-muted mt-0.5">
                {needsSetup
                  ? "برای دسترسی به پنل گرافیکی PostgreSQL، حساب مدیر اولیه را بسازید."
                  : "دسترسی گرافیکی جداول، رکوردها و اجرای دستورات SQL"}
              </p>
            </div>
          </div>

          {authError && (
            <div className="dba-alert-error">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            </div>
          )}

          {needsSetup ? (
            <form onSubmit={handleSetupSubmit} className="dba-stack-md">
              <div>
                <label className="block text-xs font-semibold dba-text-label mb-1">
                  نام کاربری مدیر (انگلیسی)
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  placeholder="admin"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="dba-input w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold dba-text-label mb-1">
                  نام نمایشی (اختیاری)
                </label>
                <input
                  type="text"
                  placeholder="مدیر سیستم"
                  value={authDisplayName}
                  onChange={(e) => setAuthDisplayName(e.target.value)}
                  className="dba-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold dba-text-label mb-1">
                  رمز عبور (حداقل ۸ کاراکتر)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  dir="ltr"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="dba-input w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold dba-text-label mb-1">
                  تکرار رمز عبور
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  dir="ltr"
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  className="dba-input w-full font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={authSubmitting}
                className="dba-btn dba-btn-primary w-full"
                style={{ height: 42 }}
              >
                {authSubmitting ? "در حال ثبت..." : "ایجاد حساب مدیر و ورود به دیتابیس"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="dba-stack-md">
              <div>
                <label className="block text-xs font-semibold dba-text-label mb-1">
                  نام کاربری مدیر پلتفرم
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="dba-input w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold dba-text-label mb-1">
                  رمز عبور
                </label>
                <input
                  type="password"
                  required
                  dir="ltr"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="dba-input w-full font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={authSubmitting}
                className="dba-btn dba-btn-primary w-full"
                style={{ height: 42 }}
              >
                {authSubmitting ? "در حال ورود..." : "ورود به مدیریت دیتابیس"}
              </button>
            </form>
          )}

          <div className="dba-auth-footer">
            <button
              type="button"
              onClick={() => {
                if (onBackToApp) onBackToApp();
                else window.location.href = "/";
              }}
              className="dba-link-btn"
            >
              <Home className="w-3.5 h-3.5" />
              <span>بازگشت به سامانه املاک</span>
            </button>
            <span className="font-mono">PostgreSQL / PGlite</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dba-root" dir="rtl">
      {/* Top Bar: 3 zones */}
      <header className="dba-topbar">
        <div className="dba-brand">
          <div className="dba-brand-mark">
            <Database className="w-4 h-4" />
          </div>
          <span>مدیریت دیتابیس ملک تک</span>
        </div>

        <nav className="dba-nav" aria-label="بخش‌های مدیریت دیتابیس">
          <button
            type="button"
            onClick={() => setTab("overview")}
            className={`dba-nav-link ${tab === "overview" ? "is-active" : ""}`}
          >
            نمای کلی
          </button>
          <button
            type="button"
            onClick={() => setTab("browse")}
            className={`dba-nav-link ${tab === "browse" ? "is-active" : ""}`}
          >
            مرور داده‌ها
          </button>
          <button
            type="button"
            onClick={() => setTab("structure")}
            className={`dba-nav-link ${tab === "structure" ? "is-active" : ""}`}
          >
            ساختار جدول
          </button>
          <button
            type="button"
            onClick={() => setTab("sql")}
            className={`dba-nav-link ${tab === "sql" ? "is-active" : ""}`}
          >
            کنسول SQL
          </button>
        </nav>

        <div className="dba-topbar-actions">
          {adminUser && (
            <span className="dba-user-badge">
              {adminUser.username}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              if (onBackToApp) onBackToApp();
              else window.location.href = "/";
            }}
            className="dba-btn"
            title="بازگشت به برنامه اصلی"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">برنامه اصلی</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="dba-btn dba-btn-danger"
            title="خروج"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </header>

      {toastMsg && (
        <div className="dba-toast">
          <Check className="w-4 h-4 dba-toast-icon" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="dba-body">
        {/* Sidebar */}
        <aside className="dba-sidebar">
          <div className="dba-sidebar-head">
            <div className="dba-sidebar-title">
              <span>جداول پایگاه داده</span>
              <span className="dba-count-badge">
                {overview ? `${overview.total_tables} جدول` : "..."}
              </span>
            </div>
            <div className="dba-search-wrap">
              <Search className="dba-search-icon" />
              <input
                type="text"
                placeholder="جستجوی نام جدول..."
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="dba-input w-full pr-8"
                style={{ height: 32, fontSize: 12 }}
              />
            </div>
          </div>

          <div className="dba-table-list">
            {filteredTables.map((t) => {
              const active = selectedTable === t.table_name && (tab === "browse" || tab === "structure");
              return (
                <button
                  key={t.table_name}
                  type="button"
                  onClick={() => handleSelectTable(t.table_name, tab === "structure" ? "structure" : "browse")}
                  className={`dba-table-btn ${active ? "is-active" : ""}`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Table2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="dba-table-name">{t.table_name}</span>
                  </span>
                  <span className="dba-table-count">{t.row_count.toLocaleString("en-US")}</span>
                </button>
              );
            })}
            {!loadingOverview && filteredTables.length === 0 && (
              <p className="dba-empty-cell">جدولی یافت نشد.</p>
            )}
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="dba-main">
          {bannerError && (
            <div className="dba-alert-error">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bannerError}</span>
              </div>
              <button type="button" onClick={() => setBannerError(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-base font-extrabold dba-text-ink">وضعیت پایگاه داده</h1>
                  <p className="text-xs dba-text-muted mt-0.5 font-mono" dir="ltr">
                    {overview ? `${overview.engine} · schema: public · db: ${overview.database_name}` : "در حال بارگذاری..."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadOverview}
                  disabled={loadingOverview}
                  className="dba-btn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingOverview ? "animate-spin" : ""}`} />
                  <span>بروزرسانی</span>
                </button>
              </div>

              <div className="dba-kpi-grid">
                <div className="dba-surface dba-kpi">
                  <div className="dba-kpi-label">تعداد جداول</div>
                  <div className="dba-kpi-value">{overview ? overview.total_tables : "—"}</div>
                </div>
                <div className="dba-surface dba-kpi">
                  <div className="dba-kpi-label">مجموع رکوردها</div>
                  <div className="dba-kpi-value">
                    {overview ? overview.total_rows.toLocaleString("en-US") : "—"}
                  </div>
                </div>
                <div className="dba-surface dba-kpi">
                  <div className="dba-kpi-label">حجم کل دیتابیس</div>
                  <div className="dba-kpi-value" dir="ltr" style={{ textAlign: "right" }}>
                    {overview ? overview.database_size_formatted : "—"}
                  </div>
                </div>
                <div className="dba-surface dba-kpi">
                  <div className="dba-kpi-label">موتور فعال</div>
                  <div className="dba-kpi-value text-sm" style={{ paddingTop: 4 }}>
                    {overview ? (overview.engine.includes("PGlite") ? "PGlite (PG 16)" : "PostgreSQL") : "—"}
                  </div>
                </div>
              </div>

              <div className="dba-surface overflow-hidden">
                <div className="dba-toolbar">
                  <div className="text-sm font-bold dba-text-ink">فهرست کامل جداول (public)</div>
                  <button
                    type="button"
                    onClick={() => setTab("sql")}
                    className="dba-btn dba-btn-primary"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>باز کردن کنسول SQL</span>
                  </button>
                </div>

                <div className="dba-grid-wrap">
                  <table className="dba-table" dir="ltr">
                    <thead>
                      <tr>
                        <th>Table</th>
                        <th>Rows</th>
                        <th>Columns</th>
                        <th>Size</th>
                        <th>Primary Key</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTables.map((t) => (
                        <tr key={t.table_name}>
                          <td className="font-mono font-bold dba-text-brand">
                            <button
                              type="button"
                              onClick={() => handleSelectTable(t.table_name, "browse")}
                              className="dba-link-btn"
                            >
                              {t.table_name}
                            </button>
                          </td>
                          <td>{t.row_count.toLocaleString("en-US")}</td>
                          <td>{t.column_count}</td>
                          <td>{t.size_formatted}</td>
                          <td>{t.has_primary_key ? "Yes" : "No"}</td>
                          <td style={{ textAlign: "right" }}>
                            <div className="inline-flex items-center gap-1.5" dir="rtl">
                              <button
                                type="button"
                                onClick={() => handleSelectTable(t.table_name, "browse")}
                                className="dba-btn"
                                style={{ height: 28, padding: "0 10px" }}
                              >
                                مرور
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectTable(t.table_name, "structure")}
                                className="dba-btn"
                                style={{ height: 28, padding: "0 10px" }}
                              >
                                ساختار
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportTable(t.table_name, "csv")}
                                className="dba-btn"
                                style={{ height: 28, padding: "0 10px" }}
                              >
                                CSV
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportTable(t.table_name, "json")}
                                className="dba-btn"
                                style={{ height: 28, padding: "0 10px" }}
                              >
                                JSON
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* BROWSE TAB */}
          {tab === "browse" && (
            <div className="dba-surface overflow-hidden">
              <div className="dba-toolbar">
                <div className="flex items-center gap-2 min-w-0">
                  <Table2 className="w-4 h-4 dba-text-brand shrink-0" />
                  <h2 className="text-sm font-extrabold font-mono truncate" dir="ltr">
                    {selectedTable || "انتخاب جدول"}
                  </h2>
                  <span className="text-xs dba-text-muted font-mono">
                    ({browseTotal.toLocaleString("en-US")} ردیف)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!selectedTable) return;
                      setBrowseSearch(browseSearchInput);
                      setBrowsePage(1);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      placeholder="جستجو در ستون‌ها..."
                      value={browseSearchInput}
                      onChange={(e) => setBrowseSearchInput(e.target.value)}
                      className="dba-input"
                      style={{ width: 180 }}
                    />
                    <button type="submit" className="dba-btn">
                      <Search className="w-3.5 h-3.5" />
                      <span>جستجو</span>
                    </button>
                  </form>

                  <select
                    value={browsePageSize}
                    onChange={(e) => {
                      const nextSize = Number(e.target.value);
                      setBrowsePageSize(nextSize);
                      setBrowsePage(1);
                    }}
                    className="dba-input"
                    aria-label="تعداد در صفحه"
                  >
                    <option value={25}>25 ردیف</option>
                    <option value={50}>50 ردیف</option>
                    <option value={100}>100 ردیف</option>
                  </select>

                  {selectedTable && (
                    <>
                      <button
                        type="button"
                        onClick={openInsertModal}
                        className="dba-btn dba-btn-primary"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>افزودن ردیف</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportTable(selectedTable, "csv")}
                        className="dba-btn"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportTable(selectedTable, "json")}
                        className="dba-btn"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>JSON</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void reloadCurrentBrowse()}
                        disabled={loadingBrowse}
                        className="dba-btn"
                        title="بروزرسانی"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingBrowse ? "animate-spin" : ""}`} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {!selectedTable ? (
                <div className="dba-empty-cell">
                  یک جدول از نوار کناری انتخاب کنید.
                </div>
              ) : (
                <>
                  <div className="dba-grid-wrap">
                    <table className="dba-table" dir="ltr">
                      <thead>
                        <tr>
                          <th style={{ width: 90 }}>Actions</th>
                          {browseCols.map((col) => (
                            <th key={col.column_name}>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextDir =
                                    browseSortBy === col.column_name && browseSortDir === "ASC"
                                      ? "DESC"
                                      : "ASC";
                                  setBrowseSortBy(col.column_name);
                                  setBrowseSortDir(nextDir);
                                  setBrowsePage(1);
                                }}
                                className="dba-sort-btn"
                              >
                                {col.is_primary_key && (
                                  <KeyRound className="w-3 h-3 text-amber-600 shrink-0" />
                                )}
                                <span>{col.column_name}</span>
                                <ArrowUpDown className="w-3 h-3 opacity-50" />
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {browseRows.map((row, idx) => (
                          <tr key={String(row.__ctid || idx)}>
                            <td>
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(row)}
                                  className="dba-icon-btn"
                                  title="ویرایش"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(row)}
                                  className="dba-icon-btn dba-icon-btn-danger"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            {browseCols.map((col) => {
                              const formatted = formatCellValue(row[col.column_name]);
                              return (
                                <td
                                  key={col.column_name}
                                  onClick={() =>
                                    setInspectCell({
                                      column: col.column_name,
                                      value: row[col.column_name],
                                    })
                                  }
                                  className="cursor-pointer"
                                  title="کلیک برای مشاهده کامل مقدار"
                                >
                                  {formatted.isNull ? (
                                    <span className="dba-null">NULL</span>
                                  ) : (
                                    formatted.text
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {!loadingBrowse && browseRows.length === 0 && (
                          <tr>
                            <td colSpan={browseCols.length + 1} className="dba-empty-cell">
                              <span dir="rtl">رکوردی در این جدول یافت نشد.</span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="dba-toolbar" style={{ borderBottom: "none", borderTop: "1px solid #EEF2F6" }}>
                    <div className="text-xs dba-text-muted font-mono">
                      صفحه {browsePage} از {browseTotalPages} · مجموع {browseTotal.toLocaleString("en-US")} رکورد
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={browsePage <= 1 || loadingBrowse}
                        onClick={() => setBrowsePage((p) => Math.max(1, p - 1))}
                        className="dba-btn"
                      >
                        <ChevronRight className="w-4 h-4" />
                        <span>قبلی</span>
                      </button>
                      <button
                        type="button"
                        disabled={browsePage >= browseTotalPages || loadingBrowse}
                        onClick={() => setBrowsePage((p) => p + 1)}
                        className="dba-btn"
                      >
                        <span>بعدی</span>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STRUCTURE TAB */}
          {tab === "structure" && (
            <div className="dba-stack-lg">
              <div className="dba-surface overflow-hidden">
                <div className="dba-toolbar">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 dba-text-brand" />
                    <h2 className="text-sm font-extrabold font-mono" dir="ltr">
                      {selectedTable || "—"}
                    </h2>
                    {structure && (
                      <span className="text-xs dba-text-muted font-mono">
                        {structure.columns.length} ستون · {structure.row_count.toLocaleString("en-US")} ردیف
                      </span>
                    )}
                  </div>
                  {selectedTable && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTab("browse")}
                        className="dba-btn"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>مشاهده داده‌ها</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => loadStructure(selectedTable)}
                        disabled={loadingStructure}
                        className="dba-btn"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingStructure ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  )}
                </div>

                {structure ? (
                  <div className="dba-grid-wrap">
                    <table className="dba-table" dir="ltr">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Column</th>
                          <th>Data Type</th>
                          <th>Nullable</th>
                          <th>Default</th>
                          <th>Key</th>
                        </tr>
                      </thead>
                      <tbody>
                        {structure.columns.map((col) => (
                          <tr key={col.column_name}>
                            <td>{col.ordinal_position}</td>
                            <td className="font-mono font-bold dba-text-ink">{col.column_name}</td>
                            <td className="font-mono dba-text-brand">
                              {col.data_type}
                              {col.character_maximum_length ? `(${col.character_maximum_length})` : ""}
                            </td>
                            <td>{col.is_nullable}</td>
                            <td className="font-mono text-xs dba-text-muted">
                              {col.column_default ? col.column_default : <span className="dba-null">NULL</span>}
                            </td>
                            <td>{col.is_primary_key ? "PRIMARY KEY" : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="dba-empty-cell">
                    {loadingStructure ? "در حال دریافت ساختار..." : "جدولی انتخاب نشده است."}
                  </div>
                )}
              </div>

              {structure && structure.foreignKeys.length > 0 && (
                <div className="dba-surface overflow-hidden">
                  <div className="dba-toolbar">
                    <h3 className="text-xs font-bold dba-text-ink">روابط و کلیدهای خارجی (Foreign Keys)</h3>
                  </div>
                  <div className="dba-grid-wrap">
                    <table className="dba-table" dir="ltr">
                      <thead>
                        <tr>
                          <th>Constraint</th>
                          <th>Column</th>
                          <th>References Table</th>
                          <th>References Column</th>
                        </tr>
                      </thead>
                      <tbody>
                        {structure.foreignKeys.map((fk) => (
                          <tr key={`${fk.constraint_name}-${fk.column_name}`}>
                            <td className="font-mono">{fk.constraint_name}</td>
                            <td className="font-mono font-semibold">{fk.column_name}</td>
                            <td className="font-mono">
                              <button
                                type="button"
                                onClick={() => handleSelectTable(fk.foreign_table_name, "structure")}
                                className="dba-link-btn"
                              >
                                {fk.foreign_table_name}
                              </button>
                            </td>
                            <td className="font-mono">{fk.foreign_column_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {structure && structure.indexes.length > 0 && (
                <div className="dba-surface overflow-hidden">
                  <div className="dba-toolbar">
                    <h3 className="text-xs font-bold dba-text-ink">ایندکس‌ها (Indexes)</h3>
                  </div>
                  <div className="dba-grid-wrap">
                    <table className="dba-table" dir="ltr">
                      <thead>
                        <tr>
                          <th>Index Name</th>
                          <th>Definition</th>
                        </tr>
                      </thead>
                      <tbody>
                        {structure.indexes.map((idx) => (
                          <tr key={idx.indexname}>
                            <td className="font-mono font-semibold">{idx.indexname}</td>
                            <td className="font-mono text-xs" style={{ maxWidth: 640 }}>
                              {idx.indexdef}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SQL CONSOLE TAB */}
          {tab === "sql" && (
            <div className="dba-stack-md">
              <div className="dba-surface p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 dba-text-brand" />
                    <h2 className="text-sm font-extrabold dba-text-ink">کنسول اجرای دستورات SQL</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setSqlText(
                          selectedTable
                            ? `SELECT * FROM "${selectedTable}" LIMIT 50;`
                            : "SELECT * FROM tenants LIMIT 50;",
                        )
                      }
                      className="dba-btn"
                      style={{ height: 30, fontSize: 11 }}
                    >
                      SELECT نمونه
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSqlText(
                          "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;",
                        )
                      }
                      className="dba-btn"
                      style={{ height: 30, fontSize: 11 }}
                    >
                      لیست جداول
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlText("SELECT version(), current_database(), pg_database_size(current_database()) AS bytes;")}
                      className="dba-btn"
                      style={{ height: 30, fontSize: 11 }}
                    >
                      اطلاعات موتور
                    </button>
                    <button
                      type="button"
                      onClick={handleRunSql}
                      disabled={sqlRunning || !sqlText.trim()}
                      className="dba-btn dba-btn-primary"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{sqlRunning ? "در حال اجرا..." : "اجرای کوئری (Ctrl+Enter)"}</span>
                    </button>
                  </div>
                </div>

                <textarea
                  value={sqlText}
                  onChange={(e) => setSqlText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      void handleRunSql();
                    }
                  }}
                  placeholder="SELECT * FROM tenants;"
                  className="dba-sql-editor"
                  spellCheck={false}
                />

                {sqlHistory.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pt-1">
                    <span className="dba-count-badge shrink-0">تاریخچه:</span>
                    {sqlHistory.map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSqlText(q)}
                        className="dba-btn font-mono"
                        style={{ height: 26, fontSize: 11, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}
                        dir="ltr"
                        title={q}
                      >
                        {q.replace(/\s+/g, " ").slice(0, 32)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {sqlError && (
                <div className="dba-alert-error" style={{ flexDirection: "column", alignItems: "stretch" }}>
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>خطای PostgreSQL</span>
                  </div>
                  <p className="font-mono" dir="ltr">
                    {sqlError.message}
                  </p>
                  {sqlError.detail && (
                    <p className="font-mono" dir="ltr">
                      DETAIL: {sqlError.detail}
                    </p>
                  )}
                  {sqlError.hint && (
                    <p className="font-mono" dir="ltr">
                      HINT: {sqlError.hint}
                    </p>
                  )}
                </div>
              )}

              {sqlResults &&
                sqlResults.map((block, bIdx) => (
                  <div key={bIdx} className="dba-surface overflow-hidden">
                    <div className="dba-toolbar">
                      <div className="text-xs font-mono dba-text-label">
                        {block.command} · {block.rowCount.toLocaleString("en-US")} rows
                        {sqlDurationMs !== null ? ` · ${sqlDurationMs} ms` : ""}
                        {block.truncated ? " (نمایش ۵۰۰ ردیف اول)" : ""}
                      </div>
                    </div>

                    {block.fields.length > 0 ? (
                      <div className="dba-grid-wrap">
                        <table className="dba-table" dir="ltr">
                          <thead>
                            <tr>
                              {block.fields.map((f) => (
                                <th key={f}>{f}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {block.rows.map((r, rIdx) => (
                              <tr key={rIdx}>
                                {block.fields.map((f) => {
                                  const fmt = formatCellValue(r[f]);
                                  return (
                                    <td
                                      key={f}
                                      onClick={() => setInspectCell({ column: f, value: r[f] })}
                                      className="cursor-pointer"
                                    >
                                      {fmt.isNull ? <span className="dba-null">NULL</span> : fmt.text}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-xs dba-text-success font-semibold">
                        دستور با موفقیت اجرا شد ({block.rowCount} ردیف متأثر شد).
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </main>
      </div>

      {/* Insert / Edit Row Modal */}
      {rowModalMode && (
        <div className="dba-modal-backdrop" onClick={() => setRowModalMode(null)}>
          <div className="dba-modal" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="dba-toolbar">
              <h3 className="text-sm font-extrabold dba-text-ink">
                {rowModalMode === "insert" ? "افزودن ردیف جدید" : "ویرایش ردیف"} ·{" "}
                <span className="font-mono dba-text-brand">{selectedTable}</span>
              </h3>
              <button type="button" onClick={() => setRowModalMode(null)} className="cursor-pointer">
                <X className="w-4 h-4 dba-text-muted" />
              </button>
            </div>

            <form onSubmit={handleSaveRow} className="dba-modal-body">
              {rowModalError && (
                <div className="dba-alert-error" style={{ marginBottom: 0 }}>
                  {rowModalError}
                </div>
              )}

              {browseCols.map((col) => {
                const name = col.column_name;
                const isNull = Boolean(nullFlags[name]);
                const isJson = isJsonColumn(col);
                const isBool = isBooleanColumn(col);
                return (
                  <div key={name} className="dba-stack-sm">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-mono font-bold dba-text-ink" dir="ltr">
                        {name}{" "}
                        <span className="font-normal dba-text-muted">
                          ({col.data_type}
                          {col.is_primary_key ? " · PK" : ""})
                        </span>
                      </label>
                      {col.is_nullable === "YES" && (
                        <label className="inline-flex items-center gap-1.5 text-xs dba-text-muted cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isNull}
                            onChange={(e) =>
                              setNullFlags((prev) => ({ ...prev, [name]: e.target.checked }))
                            }
                          />
                          <span className="font-mono">NULL</span>
                        </label>
                      )}
                    </div>

                    {isBool ? (
                      <select
                        disabled={isNull}
                        value={formValues[name] ?? ""}
                        onChange={(e) =>
                          setFormValues((prev) => ({ ...prev, [name]: e.target.value }))
                        }
                        className="dba-input w-full font-mono"
                        dir="ltr"
                      >
                        {rowModalMode === "insert" && <option value="">(پیش‌فرض)</option>}
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : isJson || col.data_type === "text" ? (
                      <textarea
                        disabled={isNull}
                        rows={isJson ? 3 : 2}
                        dir="ltr"
                        value={isNull ? "" : formValues[name] ?? ""}
                        onChange={(e) =>
                          setFormValues((prev) => ({ ...prev, [name]: e.target.value }))
                        }
                        placeholder={
                          isNull
                            ? "NULL"
                            : col.column_default
                              ? `Default: ${col.column_default}`
                              : ""
                        }
                        className="dba-input w-full font-mono py-2"
                        style={{ height: "auto", minHeight: 56 }}
                      />
                    ) : (
                      <input
                        type="text"
                        disabled={isNull}
                        dir="ltr"
                        value={isNull ? "" : formValues[name] ?? ""}
                        onChange={(e) =>
                          setFormValues((prev) => ({ ...prev, [name]: e.target.value }))
                        }
                        placeholder={
                          isNull
                            ? "NULL"
                            : col.column_default
                              ? `Default: ${col.column_default}`
                              : ""
                        }
                        className="dba-input w-full font-mono"
                      />
                    )}
                  </div>
                );
              })}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRowModalMode(null)}
                  className="dba-btn"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={rowSaving}
                  className="dba-btn dba-btn-primary"
                >
                  {rowSaving ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="dba-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="dba-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="dba-toolbar">
              <h3 className="text-sm font-extrabold dba-text-danger">تأیید حذف ردیف</h3>
              <button type="button" onClick={() => setDeleteTarget(null)} className="cursor-pointer">
                <X className="w-4 h-4 dba-text-muted" />
              </button>
            </div>
            <div className="dba-modal-body">
              <p className="text-xs dba-text-label leading-relaxed">
                آیا از حذف دائمی این ردیف از جدول{" "}
                <span className="font-mono font-bold">{selectedTable}</span> مطمئن هستید؟ این عملیات قابل بازگشت نیست.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="dba-btn"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="dba-btn dba-btn-danger"
                >
                  {deleting ? "در حال حذف..." : "حذف قطعی ردیف"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cell Inspector Modal */}
      {inspectCell && (
        <div className="dba-modal-backdrop" onClick={() => setInspectCell(null)}>
          <div className="dba-modal" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="dba-toolbar">
              <h3 className="text-sm font-extrabold font-mono dba-text-brand" dir="ltr">
                {inspectCell.column}
              </h3>
              <button type="button" onClick={() => setInspectCell(null)} className="cursor-pointer">
                <X className="w-4 h-4 dba-text-muted" />
              </button>
            </div>
            <div className="dba-modal-body">
              <pre dir="ltr" className="dba-code-pre">
                {inspectCell.value === null || inspectCell.value === undefined
                  ? "NULL"
                  : typeof inspectCell.value === "object"
                    ? JSON.stringify(inspectCell.value, null, 2)
                    : String(inspectCell.value)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
