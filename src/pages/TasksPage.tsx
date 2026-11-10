import React, { useState, useMemo } from "react";
import {
  Plus,
  ListFilter,
  Calendar,
  SquareCheckBig,
  ChevronRight,
  CalendarRange,
  ChevronLeft,
  Clock,
} from "lucide-react";
import {
  getTodayJalaali,
  toJalaali,
  daysInJalaaliMonth,
  toGregorian,
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS,
} from "../utils/jalaali.ts";
import { taskIsOverdue } from "../utils/crmWorkflows.tsx";
import { TaskCard } from "../components/common/TaskCard.tsx";
import { EmptyState } from "../components/common/EmptyState.tsx";

export const TasksPage: React.FC<{
  tasks: any[];
  onOpenQuickAdd: () => void;
  onCompleteTask: (id: string, result?: string) => void;
  onCancelTask: (id: string) => void;
}> = ({ tasks: e, onOpenQuickAdd: t, onCompleteTask: n, onCancelTask: r }) => {
  const [i, a] = useState<"LIST" | "CALENDAR">("LIST");
  const [o, s] = useState<"TODAY" | "OVERDUE" | "FUTURE" | "COMPLETED">("TODAY");
  const [c, l] = useState<"MONTH" | "WEEK" | "DAY">("MONTH");
  const u = new Date();
  const d = getTodayJalaali();
  const [f, p] = useState(d.jy);
  const [m, h] = useState(d.jm);
  const [g, v] = useState(d.jd);

  const y = (task: any, jy: number, jm: number, jd: number) => {
    try {
      const date = new Date(task.due_at);
      if (isNaN(date.getTime())) return false;
      const tehranMs = date.getTime() + 12600000;
      const tehranDate = new Date(tehranMs);
      const j = toJalaali(
        tehranDate.getUTCFullYear(),
        tehranDate.getUTCMonth() + 1,
        tehranDate.getUTCDate()
      );
      return j.jy === jy && j.jm === jm && j.jd === jd;
    } catch {
      return false;
    }
  };

  const b = useMemo(
    () =>
      e.filter((task) => {
        const dueDate = new Date(task.due_at);
        const overdue = taskIsOverdue(task, u);
        if (o === "OVERDUE") {
          return (
            overdue && task.status !== "COMPLETED" && task.status !== "CANCELLED"
          );
        }
        if (o === "TODAY") {
          if (task.status === "COMPLETED" || task.status === "CANCELLED") {
            return false;
          }
          return y(task, d.jy, d.jm, d.jd);
        }
        if (o === "FUTURE") {
          if (task.status === "COMPLETED" || task.status === "CANCELLED") {
            return false;
          }
          return dueDate >= u && !y(task, d.jy, d.jm, d.jd);
        }
        return (
          o !== "COMPLETED" ||
          task.status === "COMPLETED" ||
          task.status === "CANCELLED"
        );
      }),
    [e, o, d]
  );

  const x = useMemo(
    () => e.filter((task) => taskIsOverdue(task, u)).length,
    [e, u]
  );

  const C = useMemo(
    () =>
      e.filter((task) => {
        if (task.status === "COMPLETED" || task.status === "CANCELLED") {
          return false;
        }
        return y(task, d.jy, d.jm, d.jd);
      }).length,
    [e, d, u]
  );

  const w = daysInJalaaliMonth(f, m);

  const T = useMemo(() => {
    try {
      const greg = toGregorian(f, m, 1);
      return (new Date(greg.gy, greg.gm - 1, greg.gd).getDay() + 1) % 7;
    } catch {
      return 0;
    }
  }, [f, m]);

  const E = () => {
    if (m === 1) {
      h(12);
      p((prev) => prev - 1);
    } else {
      h((prev) => prev - 1);
    }
    v(1);
  };

  const D = () => {
    if (m === 12) {
      h(1);
      p((prev) => prev + 1);
    } else {
      h((prev) => prev + 1);
    }
    v(1);
  };

  const O = () => {
    if (g === 1) {
      if (m === 1) {
        p((prev) => prev - 1);
        h(12);
        v(daysInJalaaliMonth(f - 1, 12));
      } else {
        const prevDays = daysInJalaaliMonth(f, m - 1);
        h((prev) => prev - 1);
        v(prevDays);
      }
    } else {
      v((prev) => prev - 1);
    }
  };

  const k = () => {
    if (g >= w) {
      if (m === 12) {
        p((prev) => prev + 1);
        h(1);
        v(1);
      } else {
        h((prev) => prev + 1);
        v(1);
      }
    } else {
      v((prev) => prev + 1);
    }
  };

  const A = useMemo(() => {
    try {
      const greg = toGregorian(f, m, g);
      const dt = new Date(greg.gy, greg.gm - 1, greg.gd);
      const weekday = (dt.getDay() + 1) % 7;
      const start = new Date(dt.getTime() - weekday * 24 * 60 * 60 * 1000);
      return Array.from({ length: 7 }).map((_, idx) => {
        const dayDate = new Date(start.getTime() + idx * 24 * 60 * 60 * 1000);
        const j = toJalaali(
          dayDate.getFullYear(),
          dayDate.getMonth() + 1,
          dayDate.getDate()
        );
        return {
          jy: j.jy,
          jm: j.jm,
          jd: j.jd,
          label: PERSIAN_WEEKDAYS[idx],
        };
      });
    } catch {
      return [];
    }
  }, [f, m, g]);

  const j = useMemo(
    () =>
      c === "MONTH" || c === "DAY"
        ? e.filter((task) => y(task, f, m, g))
        : e.filter((task) =>
            A.some((day) => y(task, day.jy, day.jm, day.jd))
          ),
    [e, c, f, m, g, A]
  );

  const M = PERSIAN_MONTHS.find((month) => month.id === m)?.name || "";

  return (
    <div className="space-y-4 pb-24 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-[#172033]">
            مدیریت فعالیت‌ها و پیگیری‌ها
          </h2>
          <p className="text-xs text-[#667085]">
            {x > 0
              ? `${x} پیگیری عقب‌افتاده نیاز به پیگیری فوری دارد`
              : "وضعیت برنامه کاری منظم است"}
          </p>
        </div>
        <button
          onClick={t}
          className="flex items-center gap-1 bg-[#145DB5] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:bg-[#0F4383] active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت اقدام</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => a("LIST")}
          className={`py-2 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
            i === "LIST"
              ? "bg-white text-[#145DB5] shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>نمایش لیست پیگیری‌ها</span>
        </button>
        <button
          onClick={() => a("CALENDAR")}
          className={`py-2 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
            i === "CALENDAR"
              ? "bg-white text-[#145DB5] shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>تقویم و برنامه زمانی</span>
        </button>
      </div>

      {i === "LIST" && (
        <div className="space-y-3.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { id: "TODAY", label: `کارهای امروز (${C})` },
              { id: "OVERDUE", label: `عقب‌افتاده (${x})` },
              { id: "FUTURE", label: "کارهای آینده" },
              { id: "COMPLETED", label: "بایگانی‌شده" },
            ].map((item: any) => (
              <button
                key={item.id}
                onClick={() => s(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition shrink-0 ${
                  o === item.id
                    ? "bg-[#145DB5] text-white border-[#145DB5]"
                    : item.id === "OVERDUE" && x > 0
                    ? "bg-rose-50 text-rose-700 border-rose-200 font-bold"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {b.length === 0 ? (
            <EmptyState
              icon={SquareCheckBig}
              title="پیگیری‌ای در این وضعیت وجود ندارد"
              description="تمام قرارهای بازدید، جلسات، تماس‌ها و پیگیری‌های شما در موعد مشخص شده نمایش داده خواهند شد."
              actionText="ثبت پیگیری یا اقدام جدید"
              onAction={t}
            />
          ) : (
            <div className="space-y-2.5">
              {b.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={n}
                  onCancel={r}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {i === "CALENDAR" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#F1F5F9] p-1 rounded-xl">
            {[
              { id: "MONTH", label: "ماهانه" },
              { id: "WEEK", label: "هفتگی" },
              { id: "DAY", label: "روزانه" },
            ].map((item: any) => (
              <button
                key={item.id}
                onClick={() => l(item.id)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  c === item.id
                    ? "bg-white text-[#172033] shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
            <button
              onClick={c === "MONTH" ? E : O}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition border border-slate-200 active:scale-95"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-xs sm:text-sm font-extrabold text-[#172033] flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4 text-[#145DB5]" />
              {c === "MONTH" && (
                <span>
                  {M} {f}
                </span>
              )}
              {c === "WEEK" && (
                <span>
                  هفته اولویت‌دار — {M} {f}
                </span>
              )}
              {c === "DAY" && (
                <span className="text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-lg">
                  {g} {M} {f}
                </span>
              )}
            </span>
            <button
              onClick={c === "MONTH" ? D : k}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition border border-slate-200 active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {c === "MONTH" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
              <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-extrabold text-slate-500 pb-1.5 border-b border-slate-100">
                {PERSIAN_WEEKDAYS.map((wd) => (
                  <div key={wd} className="py-1">
                    {wd}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: T }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="aspect-square bg-slate-50/40 rounded-lg"
                  />
                ))}
                {Array.from({ length: w }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const isToday =
                    d.jy === f && d.jm === m && d.jd === dayNum;
                  const isSelected = g === dayNum;
                  const dayTasks = e.filter((task) => y(task, f, m, dayNum));
                  const pendingCount = dayTasks.filter(
                    (task) => task.status === "TODO" || task.status === "OVERDUE"
                  ).length;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => v(dayNum)}
                      className={`aspect-square relative rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ${
                        isSelected
                          ? "bg-[#145DB5] text-white shadow-md"
                          : isToday
                          ? "bg-emerald-50 border-2 border-emerald-500 text-emerald-900 font-extrabold"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="z-10">{dayNum}</span>
                      {dayTasks.length > 0 && (
                        <div className="absolute bottom-1.5 flex gap-0.5 justify-center">
                          {pendingCount > 0 ? (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected
                                  ? "bg-white"
                                  : "bg-red-500 animate-pulse"
                              }`}
                            />
                          ) : (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? "bg-white" : "bg-slate-400"
                              }`}
                            />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {c === "WEEK" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-100 pb-2">
                {A.map((day) => {
                  const isSelected = g === day.jd && m === day.jm;
                  const isToday =
                    d.jy === day.jy && d.jm === day.jm && d.jd === day.jd;
                  const count = e.filter((task) =>
                    y(task, day.jy, day.jm, day.jd)
                  ).length;

                  return (
                    <button
                      key={day.jd}
                      type="button"
                      onClick={() => {
                        v(day.jd);
                        h(day.jm);
                        p(day.jy);
                      }}
                      className={`py-2 rounded-lg flex flex-col items-center transition relative ${
                        isSelected
                          ? "bg-[#145DB5] text-white shadow-xs font-bold"
                          : isToday
                          ? "bg-emerald-50 border border-emerald-500 text-emerald-800"
                          : "hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <span className="text-[10px] text-slate-400">
                        {day.label}
                      </span>
                      <span className="text-xs font-extrabold">{day.jd}</span>
                      {count > 0 && (
                        <span
                          className={`w-1 h-1 rounded-full absolute bottom-1 ${
                            isSelected ? "bg-white" : "bg-[#145DB5]"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#172033] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#145DB5]" />
                <span>
                  لیست رویدادهای {g} {M}:
                </span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500">
                {j.length} فعالیت برنامه‌ریزی شده
              </span>
            </div>
            {j.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <p className="text-xs text-slate-500 mb-3">
                  هیچ برنامه‌ای برای این روز ثبت نشده است.
                </p>
                <button
                  onClick={t}
                  className="px-3.5 py-1.5 bg-[#145DB5] text-white rounded-lg text-xs font-bold shadow-xs hover:bg-[#0F4383]"
                >
                  تعریف قرار بازدید / تماس
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {j
                  .slice()
                  .sort((aTask, bTask) =>
                    aTask.due_at.localeCompare(bTask.due_at)
                  )
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={n}
                      onCancel={r}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
