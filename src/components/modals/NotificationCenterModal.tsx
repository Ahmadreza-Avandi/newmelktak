import React, { useState } from "react";
import {
  Bell,
  BellOff,
  CheckCheck,
  Clock,
  Settings,
  Smartphone,
  Trash2,
  X,
  ArrowUpLeft,
} from "lucide-react";
import type {
  AppNotificationItem,
  NotificationCenterState,
} from "../../services/notificationEngine.ts";
import {
  NOTIFICATION_CATEGORY_META,
  type NotificationCategory,
  type NotificationPreferences,
} from "../../shared/notification-rules.ts";
import { formatJalaaliDateTime } from "../../utils/jalaali.ts";

export interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: NotificationCenterState;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onClearRead: () => void;
  onSelectNotification: (item: AppNotificationItem) => void;
  onUpdatePreference: (
    key: NotificationCategory,
    value: boolean,
  ) => Promise<{ success: boolean; error?: string }>;
  onTogglePush: (enable: boolean) => Promise<{ success: boolean; message?: string }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  two_hour_reminder: "۲ ساعت قبل پیگیری",
  visit_reminder: "بازدید هماهنگ‌شده",
  near_due_reminder: "نزدیک به موعد",
  overdue_reminder: "عقب‌افتاده",
  sync_alerts: "همگام‌سازی",
};

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  state,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClearRead,
  onSelectNotification,
  onUpdatePreference,
  onTogglePush,
}) => {
  const [activeTab, setActiveTab] = useState<"FEED" | "SETTINGS">("FEED");
  const [filterMode, setFilterMode] = useState<"ALL" | "UNREAD">("ALL");
  const [pushBusy, setPushBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const visibleItems =
    filterMode === "UNREAD"
      ? state.items.filter((i) => !i.is_read)
      : state.items;

  const handleTogglePush = async () => {
    setPushBusy(true);
    setFeedback(null);
    try {
      const res = await onTogglePush(!state.pushSubscribed);
      if (res?.message) {
        setFeedback(res.message);
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handlePrefChange = async (key: NotificationCategory, nextVal: boolean) => {
    const res = await onUpdatePreference(key, nextVal);
    if (!res.success && res.error) {
      setFeedback(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs select-none">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#145DB5] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#172033]">
                مرکز اعلان‌ها و یادآوری‌ها
              </h3>
              <p className="text-[11px] text-[#667085]">
                {state.unreadCount > 0
                  ? `${state.unreadCount} اعلان خوانده‌نشده`
                  : "همه اعلان‌ها بررسی شده‌اند"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("FEED")}
            className={`py-2.5 flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === "FEED"
                ? "bg-white text-[#145DB5] border-b-2 border-[#145DB5]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>اعلان‌ها</span>
            {state.unreadCount > 0 && (
              <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {state.unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SETTINGS")}
            className={`py-2.5 flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === "SETTINGS"
                ? "bg-white text-[#145DB5] border-b-2 border-[#145DB5]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>تنظیمات اعلان‌ها</span>
          </button>
        </div>

        {feedback && (
          <div className="bg-blue-50 border-b border-blue-100 text-[#145DB5] text-[11px] font-bold px-4 py-2 text-center">
            {feedback}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === "FEED" ? (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterMode("ALL")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      filterMode === "ALL"
                        ? "bg-white text-[#172033] shadow-2xs"
                        : "text-slate-500"
                    }`}
                  >
                    همه ({state.items.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("UNREAD")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      filterMode === "UNREAD"
                        ? "bg-white text-[#145DB5] shadow-2xs"
                        : "text-slate-500"
                    }`}
                  >
                    خوانده‌نشده ({state.unreadCount})
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {state.unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-[#145DB5] text-[11px] font-bold hover:bg-blue-100 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>خواندن همه</span>
                    </button>
                  )}
                  {state.items.some((i) => i.is_read) && (
                    <button
                      type="button"
                      onClick={onClearRead}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>پاک‌کردن خوانده‌شده‌ها</span>
                    </button>
                  )}
                </div>
              </div>

              {visibleItems.length === 0 ? (
                <div className="py-12 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <BellOff className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    {filterMode === "UNREAD"
                      ? "اعلان خوانده‌نشده‌ای وجود ندارد"
                      : "هنوز اعلانی ثبت نشده است"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    یادآوری پیگیری‌ها، بازدیدهای هماهنگ‌شده و وضعیت همگام‌سازی در این بخش نمایش داده می‌شوند.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!item.is_read) onMarkRead(item.id);
                        onSelectNotification(item);
                      }}
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        item.is_read
                          ? "bg-white border-slate-200 opacity-80 hover:border-slate-300"
                          : "bg-blue-50/50 border-blue-200 shadow-2xs hover:border-[#145DB5]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {!item.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#145DB5] shrink-0" />
                          )}
                          <span className="text-[10px] font-bold text-[#145DB5] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                            {CATEGORY_LABELS[item.category] || item.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {formatJalaaliDateTime(item.created_at)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onDelete(item.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="حذف اعلان"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="text-xs font-extrabold text-[#172033] mb-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[#667085] leading-relaxed">
                        {item.body}
                      </p>
                      <div className="flex items-center justify-end pt-1.5 text-[10px] font-bold text-[#145DB5] gap-1">
                        <span>مشاهده مورد مرتبط</span>
                        <ArrowUpLeft className="w-3 h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="bg-[#F7F9FC] border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#145DB5] flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-[#172033]">
                        اعلان پس‌زمینه اندروید (Web Push)
                      </h4>
                      <p className="text-[10px] text-[#667085]">
                        {state.pushSupported
                          ? state.pushSubscribed
                            ? "فعال روی این دستگاه (حتی هنگام بسته بودن برنامه)"
                            : state.pushPermission === "denied"
                            ? "دسترسی اعلان در تنظیمات مرورگر مسدود شده است"
                            : "برای دریافت اعلان در زمان بسته بودن برنامه فعال کنید"
                          : "مرورگر فعلی از Web Push پشتیبانی نمی‌کند"}
                      </p>
                    </div>
                  </div>
                  {state.pushSupported && (
                    <button
                      type="button"
                      disabled={pushBusy || state.pushPermission === "denied"}
                      onClick={handleTogglePush}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition shrink-0 cursor-pointer disabled:opacity-50 ${
                        state.pushSubscribed
                          ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                          : "bg-[#145DB5] text-white hover:bg-[#0F4383]"
                      }`}
                    >
                      {pushBusy
                        ? "در حال تنظیم..."
                        : state.pushSubscribed
                        ? "غیرفعال‌سازی"
                        : "فعال‌سازی"}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-[#172033] px-1">
                  دسته‌های اعلان
                </h4>
                {NOTIFICATION_CATEGORY_META.map((cat) => {
                  const enabled =
                    state.preferences[cat.key as keyof NotificationPreferences];
                  return (
                    <label
                      key={cat.key}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-blue-200 transition"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-[#172033] block">
                          {cat.label}
                        </span>
                        <span className="text-[11px] text-[#667085] block">
                          {cat.description}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(enabled)}
                        onChange={(ev) =>
                          handlePrefChange(cat.key, ev.target.checked)
                        }
                        className="w-4 h-4 rounded text-[#145DB5] shrink-0 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
