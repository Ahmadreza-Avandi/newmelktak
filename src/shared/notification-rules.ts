export type NotificationCategory =
  | "two_hour_reminder"
  | "overdue_reminder"
  | "visit_reminder"
  | "near_due_reminder"
  | "sync_alerts";

export interface NotificationPreferences {
  two_hour_reminder: boolean;
  overdue_reminder: boolean;
  visit_reminder: boolean;
  near_due_reminder: boolean;
  sync_alerts: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  two_hour_reminder: true,
  overdue_reminder: true,
  visit_reminder: true,
  near_due_reminder: true,
  sync_alerts: true,
};

export const NOTIFICATION_CATEGORY_META: Array<{
  key: NotificationCategory;
  label: string;
  description: string;
}> = [
  {
    key: "two_hour_reminder",
    label: "هشدار ۲ ساعت قبل از پیگیری",
    description: "ارسال اعلان دو ساعت پیش از موعد تماس یا پیگیری مشتری",
  },
  {
    key: "visit_reminder",
    label: "یادآوری بازدیدهای هماهنگ‌شده",
    description: "اعلان پیش از زمان بازدیدهای ثبت‌شده با متقاضی و ملک",
  },
  {
    key: "near_due_reminder",
    label: "وظایف نزدیک به موعد (۳۰ دقیقه)",
    description: "یادآوری فوری نیم ساعت مانده به سررسید هر وظیفه",
  },
  {
    key: "overdue_reminder",
    label: "پیگیری‌های عقب‌افتاده",
    description: "یادآوری روزانه برای پیگیری‌ها و قرارهایی که از زمان آن‌ها گذشته است",
  },
  {
    key: "sync_alerts",
    label: "اعلان همگام‌سازی آفلاین",
    description: "اطلاع‌رسانی درباره ارسال موفق یا تداخل تغییرات آفلاین",
  },
];

export interface ReminderTaskInput {
  id: string;
  tenant_id?: string;
  branch_id?: string | null;
  assigned_user_id?: string | null;
  assigned_to_user_id?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  property_id?: string | null;
  property_title?: string | null;
  property_code?: string | null;
  title: string;
  due_at: string;
  type?: string | null;
  status: string;
  priority?: string | null;
}

export interface NotificationCandidate {
  category: NotificationCategory;
  dedup_key: string;
  title: string;
  body: string;
  entity_type: "TASK" | "CUSTOMER" | "PROPERTY";
  entity_id: string;
  target_url: string;
  scheduled_for: string;
  metadata: Record<string, any>;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export function getDayKeyInTimeZone(date: Date, timeZone = "Asia/Tehran"): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const y = parts.find((p) => p.type === "year")?.value || "0000";
    const m = parts.find((p) => p.type === "month")?.value || "00";
    const d = parts.find((p) => p.type === "day")?.value || "00";
    return `${y}-${m}-${d}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatTimeInTimeZone(date: Date, timeZone = "Asia/Tehran"): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return date.toTimeString().slice(0, 5);
  }
}

export function buildTaskTargetUrl(task: ReminderTaskInput): string {
  const params = new URLSearchParams();
  params.set("tab", "tasks");
  params.set("taskId", task.id);
  if (task.customer_id) params.set("customerId", task.customer_id);
  if (task.property_id) params.set("propertyId", task.property_id);
  return `/?${params.toString()}`;
}

export function evaluateTaskReminderCandidates(
  tasks: ReminderTaskInput[],
  now: Date = new Date(),
  prefs: Partial<NotificationPreferences> = DEFAULT_NOTIFICATION_PREFERENCES,
  timeZone = "Asia/Tehran",
): NotificationCandidate[] {
  const mergedPrefs: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...prefs,
  };
  const nowMs = now.getTime();
  const dayKey = getDayKeyInTimeZone(now, timeZone);
  const candidates: NotificationCandidate[] = [];

  for (const task of tasks) {
    if (!task || !task.id || !task.due_at) continue;
    const status = String(task.status || "").toUpperCase();
    if (status === "COMPLETED" || status === "CANCELLED") continue;

    const dueDate = new Date(task.due_at);
    const dueMs = dueDate.getTime();
    if (!Number.isFinite(dueMs)) continue;

    const diffMs = dueMs - nowMs;
    const dueTimeText = formatTimeInTimeZone(dueDate, timeZone);
    const isVisit = String(task.type || "").toUpperCase() === "VISIT";
    const customerSuffix = task.customer_name ? ` (${task.customer_name})` : "";
    const propSuffix = task.property_code ? ` — کد ${task.property_code}` : "";
    const targetUrl = buildTaskTargetUrl(task);

    // 1. Two hours before follow-up or coordinated visit
    if (diffMs > 0 && diffMs <= TWO_HOURS_MS) {
      if (isVisit && mergedPrefs.visit_reminder) {
        candidates.push({
          category: "visit_reminder",
          dedup_key: `visit_2h:${task.id}:${dueDate.toISOString()}`,
          title: `یادآوری بازدید${customerSuffix}`,
          body: `بازدید «${task.title}»${propSuffix} ساعت ${dueTimeText} هماهنگ شده است.`,
          entity_type: "TASK",
          entity_id: task.id,
          target_url: targetUrl,
          scheduled_for: dueDate.toISOString(),
          metadata: {
            task_id: task.id,
            customer_id: task.customer_id || null,
            property_id: task.property_id || null,
            task_type: task.type || "VISIT",
            due_at: task.due_at,
          },
        });
      } else if (!isVisit && mergedPrefs.two_hour_reminder) {
        candidates.push({
          category: "two_hour_reminder",
          dedup_key: `followup_2h:${task.id}:${dueDate.toISOString()}`,
          title: `پیگیری نزدیک است${customerSuffix}`,
          body: `کمتر از ۲ ساعت تا «${task.title}» (ساعت ${dueTimeText}) مانده است.`,
          entity_type: "TASK",
          entity_id: task.id,
          target_url: targetUrl,
          scheduled_for: dueDate.toISOString(),
          metadata: {
            task_id: task.id,
            customer_id: task.customer_id || null,
            property_id: task.property_id || null,
            task_type: task.type || "FOLLOW_UP",
            due_at: task.due_at,
          },
        });
      }
    }

    // 2. Near-due task reminder (within 30 minutes)
    if (diffMs > 0 && diffMs <= THIRTY_MINUTES_MS && mergedPrefs.near_due_reminder) {
      const minsLeft = Math.max(1, Math.round(diffMs / 60000));
      candidates.push({
        category: "near_due_reminder",
        dedup_key: `near_due_30m:${task.id}:${dueDate.toISOString()}`,
        title: `موعد فوری وظیفه (${minsLeft} دقیقه دیگر)`,
        body: `«${task.title}»${customerSuffix}${propSuffix} رأس ساعت ${dueTimeText} سررسید می‌شود.`,
        entity_type: "TASK",
        entity_id: task.id,
        target_url: targetUrl,
        scheduled_for: dueDate.toISOString(),
        metadata: {
          task_id: task.id,
          customer_id: task.customer_id || null,
          property_id: task.property_id || null,
          task_type: task.type || "FOLLOW_UP",
          due_at: task.due_at,
        },
      });
    }

    // 3. Overdue task reminder (once per day in Tehran timezone)
    if (diffMs < 0 && mergedPrefs.overdue_reminder) {
      candidates.push({
        category: "overdue_reminder",
        dedup_key: `overdue:${task.id}:${dayKey}`,
        title: isVisit ? `بازدید عقب‌افتاده${customerSuffix}` : `پیگیری عقب‌افتاده${customerSuffix}`,
        body: `موعد «${task.title}»${propSuffix} گذشته است؛ لطفاً نتیجه را ثبت کنید.`,
        entity_type: "TASK",
        entity_id: task.id,
        target_url: targetUrl,
        scheduled_for: dueDate.toISOString(),
        metadata: {
          task_id: task.id,
          customer_id: task.customer_id || null,
          property_id: task.property_id || null,
          task_type: task.type || "FOLLOW_UP",
          due_at: task.due_at,
          day_key: dayKey,
        },
      });
    }
  }

  return candidates;
}
