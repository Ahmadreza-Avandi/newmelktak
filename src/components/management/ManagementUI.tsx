import React, { useRef, useEffect, useState } from "react";
import { api } from "../../services/apiClient.ts";

export interface ManagementModuleInfo {
  title: string;
  description: string;
  icon: string;
}

export const managementModules: Record<string, ManagementModuleInfo> = {
  documents: {
    title: "اسناد و مدارک",
    description: "اسناد ملکی و مدارک مشتریان؛ مرتب، مرتبط و در دسترس",
    icon: "file",
  },
  transactions: {
    title: "مدیریت قراردادها",
    description: "مبایعه‌نامه، اجاره‌نامه و سوابق مالی معاملات",
    icon: "contract",
  },
  report: {
    title: "گزارش عملکرد",
    description: "شاخص‌های دفتر، بازدهی مشاوران و حجم معاملات",
    icon: "chart",
  },
  branches: {
    title: "مدیریت شعب",
    description: "شعب تابعه، مدیران شعب و ساختار دفتر",
    icon: "building",
  },
  agents: {
    title: "مدیریت مشاورین",
    description: "پرونده کاری، سطح دسترسی و انتقال مسئولیت‌ها",
    icon: "users",
  },
  settings: {
    title: "تنظیمات دفتر",
    description: "نام، اطلاعات تماس و نشانی آژانس",
    icon: "settings",
  },
  audit: {
    title: "گزارش ممیزی",
    description: "رخدادهای ثبت‌شده و تاریخچه تغییرات آژانس",
    icon: "shield",
  },
  security: {
    title: "امنیت و گذرواژه",
    description: "تغییر گذرواژه و پایان دادن به نشست‌های قبلی",
    icon: "lock",
  },
  subscription: {
    title: "اشتراک و پلن",
    description: "وضعیت اشتراک و ظرفیت‌های دفتر",
    icon: "building",
  },
};

const managers = ["ADMIN", "OWNER", "BRANCH_MANAGER"];

export function canOpenModule(module: string, role?: string | null): boolean {
  if (module === "hub") return true;
  if (!managementModules[module] || !role) return false;
  if (["documents", "transactions", "security"].includes(module)) return true;
  if (module === "settings") return ["ADMIN", "OWNER"].includes(role);
  return managers.includes(role);
}

const paths: Record<string, string[]> = {
  file: [
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z",
    "M14 2v6h6",
    "M8 13h8",
    "M8 17h5",
  ],
  contract: [
    "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
    "m16 3 5 5-9 9-5 1 1-5Z",
  ],
  chart: ["M4 3v17h17", "m7 14 4-5 4 3 5-7"],
  building: [
    "M4 21V5h10v16",
    "M14 11h6v10",
    "M8 9h2",
    "M8 13h2",
    "M8 17h2",
    "M2 21h20",
  ],
  users: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
    "M16 3a4 4 0 0 1 0 8",
    "M22 21v-2a4 4 0 0 0-3-3.87",
  ],
  settings: [
    "M12 3v3",
    "M12 18v3",
    "m3 12 3 0",
    "m18 12 3 0",
    "m5.6 5.6 2.1 2.1",
    "m16.3 16.3 2.1 2.1",
    "m5.6 18.4 2.1-2.1",
    "m16.3 7.7 2.1-2.1",
  ],
  shield: ["m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7Z", "m8 12 3 3 5-6"],
  lock: ["M5 10h14v11H5Z", "M8 10V6a4 4 0 0 1 8 0v4", "M12 14v3"],
  arrow: ["m9 5 7 7-7 7"],
  calendar: ["M4 5h16v16H4Z", "M8 3v4", "M16 3v4", "M4 11h16"],
};

const MtIcon: React.FC<{ name: string; className?: string }> = ({
  name,
  className = "",
}) => (
  <svg
    className={`mt-icon ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={true}
  >
    {(paths[name] || paths.file).map((d, key) => (
      <path d={d} key={key} />
    ))}
    {name === "users" ? <circle cx={9} cy={7} r={4} /> : null}
    {name === "settings" ? <circle cx={12} cy={12} r={4} /> : null}
  </svg>
);

export const ManagementHub: React.FC<{
  role?: string | null;
  onOpen: (id: string) => void;
  onTasks?: (tab: string) => void;
}> = ({ role, onOpen, onTasks }) => {
  const groups = [
    {
      title: "پرونده‌ها و معاملات",
      detail: "ابزارهای روزانه دفتر",
      items: ["documents", "transactions"],
    },
    {
      title: "مدیریت آژانس و نظارت",
      detail: "بر اساس سطح دسترسی شما",
      items: ["report", "branches", "agents", "settings", "audit"],
    },
    {
      title: "حساب کاربری و امکانات",
      detail: "امنیت و برنامه‌ریزی",
      items: ["security", "subscription", "calendar"],
    },
  ];

  return (
    <div className="mt-management-hub">
      {groups.map((group) => {
        const items = group.items.filter(
          (id) => id === "calendar" || canOpenModule(id, role)
        );
        if (!items.length) return null;
        return (
          <section
            className="mt-hub-group"
            key={group.title}
            aria-label={group.title}
          >
            <div className="mt-group-heading">
              <h3>{group.title}</h3>
              <p>{group.detail}</p>
            </div>
            <div className="mt-hub-grid">
              {items.map((id) => {
                const item =
                  id === "calendar"
                    ? {
                        title: "تقویم و پیگیری‌ها",
                        description: "بازدیدها، تماس‌ها و برنامه کاری",
                        icon: "calendar",
                      }
                    : managementModules[id];
                return (
                  <button
                    type="button"
                    className="mt-module-card"
                    key={id}
                    onClick={() =>
                      id === "calendar" ? onTasks?.("tasks") : onOpen(id)
                    }
                    data-module-link={id}
                  >
                    <span className="mt-card-icon">
                      <MtIcon name={item.icon} />
                    </span>
                    <span className="mt-card-copy">
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </span>
                    <MtIcon name="arrow" className="mt-card-arrow" />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export const ManagementPage: React.FC<{
  module: string;
  onBack: () => void;
  children: React.ReactNode;
}> = ({ module, onBack, children }) => {
  const container = useRef<HTMLElement | null>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    container.current?.focus({ preventScroll: true });
  }, [module]);

  return (
    <section
      ref={container}
      tabIndex={-1}
      className="melktak-module"
      data-module={module}
      dir="rtl"
      aria-label={managementModules[module]?.title || "مدیریت آژانس"}
    >
      <div className="mt-breadcrumb">
        <button type="button" onClick={onBack}>
          <MtIcon name="arrow" />
          بازگشت به بیشتر
        </button>
        <span aria-hidden={true}>/</span>
        <span>{managementModules[module]?.title}</span>
      </div>
      <div className="mt-module-content">{children}</div>
    </section>
  );
};

const Heading: React.FC<{ module: string }> = ({ module }) => {
  const item = managementModules[module];
  return (
    <header className="mt-page-heading">
      <span className="mt-card-icon">
        <MtIcon name={item.icon} />
      </span>
      <div>
        <h1>{item.title}</h1>
        <p>{item.description}</p>
      </div>
    </header>
  );
};

const Notice: React.FC<{ children?: React.ReactNode; error?: boolean }> = ({
  children,
  error = false,
}) =>
  children ? (
    <div
      className={`mt-notice${error ? " mt-notice-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  ) : null;

const Field: React.FC<any> = ({ label, name, multiline, ...props }) => (
  <label className="mt-field">
    <span>{label}</span>
    {multiline ? (
      <textarea {...props} name={name} rows={3} />
    ) : (
      <input name={name} {...props} />
    )}
  </label>
);

export const ManagementSettings: React.FC<{
  auth: { tenant?: any; refreshAuth?: () => Promise<void> };
  onRefresh?: () => void;
}> = ({ auth, onRefresh }) => {
  const [values, setValues] = useState(() => ({
    name: auth.tenant?.name || "",
    phone: auth.tenant?.phone || "",
    address: auth.tenant?.address || "",
  }));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ error?: boolean; text: string } | null>(null);

  const change = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues({ ...values, [event.target.name]: event.target.value });
    setResult(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await api.patch("/api/v1/agency/settings", {
        ...values,
        name: values.name.trim(),
      });
      if (!response.success) {
        throw new Error(response.error?.message || "ذخیره تنظیمات انجام نشد.");
      }
      setResult({ text: "اطلاعات دفتر با موفقیت ذخیره شد." });
      await auth.refreshAuth?.();
      onRefresh?.();
    } catch (error: any) {
      setResult({
        error: true,
        text: error.message || "ارتباط با سرور برقرار نشد.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Heading module="settings" />
      <div className="mt-page-columns">
        <form
          className="mt-panel mt-form"
          onSubmit={submit}
          aria-label="اطلاعات دفتر"
        >
          <h2>مشخصات آژانس</h2>
          <p className="mt-muted">اطلاعات تماس دفتر را به‌روز نگه دارید.</p>
          <Field
            label="نام دفتر آژانس"
            name="name"
            value={values.name}
            onChange={change}
            minLength={2}
            required
            autoComplete="organization"
            disabled={busy}
          />
          <Field
            label="تلفن دفتر"
            name="phone"
            value={values.phone}
            onChange={change}
            type="tel"
            dir="ltr"
            autoComplete="tel"
            disabled={busy}
          />
          <Field
            label="نشانی دفتر"
            name="address"
            value={values.address}
            onChange={change}
            multiline
            autoComplete="street-address"
            disabled={busy}
          />
          <Notice error={result?.error}>{result?.text}</Notice>
          <button className="mt-primary" type="submit" disabled={busy}>
            {busy ? "در حال ذخیره…" : "ذخیره تغییرات"}
          </button>
        </form>
        <aside className="mt-panel mt-info-panel">
          <MtIcon name="building" />
          <h2>هویت دفتر شما</h2>
          <p>این مشخصات برای معرفی دفتر در سامانه استفاده می‌شوند.</p>
          <dl>
            <dt>کد آژانس</dt>
            <dd dir="ltr">{auth.tenant?.agency_code || "—"}</dd>
          </dl>
        </aside>
      </div>
    </>
  );
};

export const ManagementSecurity: React.FC<{
  auth: { refreshAuth?: () => Promise<void> };
}> = ({ auth }) => {
  const [values, setValues] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ error?: boolean; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (values.new_password !== values.confirm_password) {
      setResult({ error: true, text: "گذرواژه جدید و تکرار آن یکسان نیستند." });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const response = await api.post("/api/v1/auth/change-password", values);
      if (!response.success) {
        throw new Error(response.error?.message || "تغییر گذرواژه انجام نشد.");
      }
      setValues({ current_password: "", new_password: "", confirm_password: "" });
      setResult({
        text: "گذرواژه تغییر کرد. برای ادامه با گذرواژه جدید وارد شوید.",
      });
      await auth.refreshAuth?.();
    } catch (error: any) {
      setResult({
        error: true,
        text: error.message || "ارتباط با سرور برقرار نشد.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Heading module="security" />
      <div className="mt-page-columns">
        <form
          className="mt-panel mt-form"
          onSubmit={submit}
          aria-label="تغییر گذرواژه"
        >
          <h2>تغییر گذرواژه حساب</h2>
          {(
            [
              ["current_password", "گذرواژه فعلی"],
              ["new_password", "گذرواژه جدید"],
              ["confirm_password", "تکرار گذرواژه جدید"],
            ] as const
          ).map(([name, label]) => (
            <Field
              key={name}
              name={name}
              label={label}
              value={values[name]}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setValues({ ...values, [name]: event.target.value });
                setResult(null);
              }}
              required
              minLength={name === "new_password" ? 6 : 1}
              type={visible ? "text" : "password"}
              dir="ltr"
              autoComplete={
                name === "current_password" ? "current-password" : "new-password"
              }
              disabled={busy}
            />
          ))}
          <label className="mt-checkbox">
            <input
              type="checkbox"
              checked={visible}
              onChange={(event) => setVisible(event.target.checked)}
            />
            نمایش گذرواژه‌ها
          </label>
          <Notice error={result?.error}>{result?.text}</Notice>
          <button className="mt-primary" type="submit" disabled={busy}>
            {busy ? "در حال تغییر…" : "تغییر گذرواژه و خروج از نشست‌ها"}
          </button>
        </form>
        <aside className="mt-panel mt-info-panel">
          <MtIcon name="shield" />
          <h2>امنیت حساب شما</h2>
          <p>
            گذرواژه جدید باید حداقل ۶ کاراکتر داشته باشد. از گذرواژه‌ای طولانی و
            منحصربه‌فرد استفاده کنید.
          </p>
          <p>
            پس از ذخیره، تمام نشست‌های قبلی بسته می‌شوند و باید دوباره وارد شوید.
          </p>
        </aside>
      </div>
    </>
  );
};

const auditLabels: Record<string, string> = {
  PROPERTY_CREATED: "ثبت ملک جدید",
  PROPERTY_UPDATED: "ویرایش اطلاعات ملک",
  PROPERTY_STATUS_CHANGED: "تغییر وضعیت ملک",
  PROPERTY_ARCHIVED: "بایگانی ملک",
  PROPERTY_RESTORED: "بازیابی ملک",
  CUSTOMER_CREATED: "ثبت مشتری جدید",
  CUSTOMER_UPDATED: "ویرایش پرونده مشتری",
  TASK_CREATED: "ثبت پیگیری جدید",
  TASK_COMPLETED: "تکمیل پیگیری",
  TASK_CANCELLED: "لغو پیگیری",
  TRANSACTION_CREATED: "ثبت قرارداد",
  TRANSACTION_UPDATED: "ویرایش قرارداد",
  TRANSACTION_DELETED: "حذف قرارداد",
  DOCUMENT_UPLOADED: "بارگذاری سند",
  DOCUMENT_UPDATED: "ویرایش سند",
  DOCUMENT_ARCHIVED: "بایگانی سند",
  DOCUMENT_RESTORED: "بازیابی سند",
  LOGIN_SUCCESS: "ورود موفق به سامانه",
  LOGIN_FAILED: "تلاش ناموفق برای ورود",
  LOGOUT: "خروج از حساب",
  PROFILE_UPDATED: "ویرایش پروفایل کاربری",
  AGENCY_SETTINGS_UPDATED: "بروزرسانی تنظیمات دفتر",
  PASSWORD_CHANGED: "تغییر گذرواژه",
  AGENT_CREATED: "افزودن مشاور",
  AGENT_UPDATED: "ویرایش مشاور",
  AGENT_STATUS_CHANGED: "تغییر وضعیت مشاور",
  BRANCH_CREATED: "افزودن شعبه",
  BRANCH_UPDATED: "ویرایش شعبه",
  BRANCH_DEACTIVATED: "غیرفعال‌سازی شعبه",
  SYSTEM_BOOT: "راه‌اندازی سامانه",
};

export const ManagementAudit: React.FC = () => {
  const [state, setState] = useState<{
    loading: boolean;
    logs: any[];
    error: string;
  }>({ loading: true, logs: [], error: "" });
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let current = true;
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    api
      .get("/api/v1/agency/audit-logs")
      .then((response) => {
        if (!response.success) {
          throw new Error(response.error?.message || "دریافت گزارش انجام نشد.");
        }
        if (current) {
          setState({ loading: false, logs: response.data || [], error: "" });
          setPage(1);
        }
      })
      .catch((error: any) => {
        if (current) {
          setState({
            loading: false,
            logs: [],
            error: error.message || "ارتباط با سرور برقرار نشد.",
          });
        }
      });
    return () => {
      current = false;
    };
  }, [refresh]);

  const filtered = state.logs.filter((log) =>
    [log.title, log.description, log.action, log.entity_type].some((value) =>
      String(value || "")
        .toLocaleLowerCase("fa")
        .includes(search.trim().toLocaleLowerCase("fa"))
    )
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);

  return (
    <>
      <Heading module="audit" />
      <div className="mt-panel mt-audit-toolbar">
        <Field
          label="جستجو در رخدادها"
          name="audit-search"
          type="search"
          value={search}
          placeholder="عنوان یا نوع تغییر…"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <button
          type="button"
          className="mt-secondary"
          disabled={state.loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          بروزرسانی گزارش
        </button>
      </div>
      <p className="mt-muted">
        نمایش آخرین ۵۰ رخداد ثبت‌شده؛ {filtered.length.toLocaleString("fa-IR")} رخداد در این
        فهرست
      </p>
      {state.error ? <Notice error>{state.error}</Notice> : null}
      {state.loading ? (
        <div className="mt-panel mt-empty" role="status">
          در حال دریافت رخدادها…
        </div>
      ) : !state.error && !filtered.length ? (
        <div className="mt-panel mt-empty">
          <MtIcon name="shield" />
          <h2>{search ? "نتیجه‌ای پیدا نشد" : "هنوز رخدادی ثبت نشده"}</h2>
          <p>
            {search
              ? "عبارت جستجو را تغییر دهید."
              : "تغییرات ثبت‌شده دفتر در این بخش نمایش داده می‌شوند."}
          </p>
        </div>
      ) : (
        <ol className="mt-audit-list">
          {filtered
            .slice((currentPage - 1) * 10, currentPage * 10)
            .map((log) => (
              <li className="mt-panel mt-audit-item" key={log.id}>
                <span className="mt-card-icon">
                  <MtIcon name="shield" />
                </span>
                <div className="mt-audit-copy">
                  <h2>
                    {auditLabels[log.action] || log.title || "تغییر در سامانه"}
                  </h2>
                  <p>
                    {log.description && !log.description.includes(log.action)
                      ? log.description
                      : "این تغییر در سابقه فعالیت دفتر ثبت شده است."}
                  </p>
                </div>
                <time dateTime={log.created_at}>
                  {new Date(log.created_at).toLocaleString("fa-IR", {
                    timeZone: "Asia/Tehran",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </li>
            ))}
        </ol>
      )}
      {!state.loading && pages > 1 ? (
        <div className="mt-pagination" aria-label="صفحه‌بندی گزارش">
          <button
            type="button"
            className="mt-secondary"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            قبلی
          </button>
          <span aria-live="polite">
            صفحه {currentPage.toLocaleString("fa-IR")} از{" "}
            {pages.toLocaleString("fa-IR")}
          </span>
          <button
            type="button"
            className="mt-secondary"
            disabled={currentPage === pages}
            onClick={() => setPage(currentPage + 1)}
          >
            بعدی
          </button>
        </div>
      ) : null}
    </>
  );
};
