import React from "react";
import {
  CircleAlert,
  Clock,
  Calendar,
  Search,
  Building2,
  Users,
  Plus,
  UserPlus,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { TaskCard } from "../components/common/TaskCard.tsx";

export const HomePage: React.FC<{
  data: any;
  onOpenQuickAdd: (kind: string) => void;
  onOpenSearch: () => void;
  onNavigateTab: (tab: string) => void;
  onCompleteTask: (id: string, result?: string) => void;
  onSelectProperty?: (property: any) => void;
  onSelectCustomer?: (customer: any) => void;
}> = ({
  data: e,
  onOpenQuickAdd: t,
  onOpenSearch: n,
  onNavigateTab: r,
  onCompleteTask: i,
  onSelectProperty: a,
}) => {
  const {
    metrics: s,
    overdueTasks: c,
    todayTasks: l,
    upcomingVisits: u,
    smartMatches: d,
    recentActivities: f,
  } = e;

  return (
    <div className="space-y-4 pb-20 select-none">
      <div className="bg-white border-b border-[#E2E8F0] p-4 -mt-2 -mx-3 mb-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#172033]">
              امروز، چه کارهایی در اولویت است؟
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              {e.agent.display_name} • {e.agent.agency_name}
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#145DB5] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
            {new Set([...c, ...l].map((task: any) => task.id)).size} اقدام باز
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div
          onClick={() => r("tasks")}
          className={`rounded-xl p-3 border transition cursor-pointer ${
            s.overdue_count > 0
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-white border-slate-200 text-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold">عقب‌افتاده</span>
            <CircleAlert className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black">{s.overdue_count}</div>
          <span className="text-[10px] text-rose-700/80">نیاز به تماس فوری</span>
        </div>

        <div
          onClick={() => r("tasks")}
          className="bg-white rounded-xl p-3 border border-slate-200 text-slate-800 shadow-2xs cursor-pointer hover:border-[#145DB5]"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#667085]">
              کارهای امروز
            </span>
            <Clock className="w-3.5 h-3.5 text-[#145DB5]" />
          </div>
          <div className="text-xl font-black text-[#145DB5]">{s.today_count}</div>
          <span className="text-[10px] text-[#667085]">پیگیری‌های زمان‌دار</span>
        </div>

        <div
          onClick={() => r("tasks")}
          className="bg-white rounded-xl p-3 border border-slate-200 text-slate-800 shadow-2xs cursor-pointer hover:border-[#145DB5]"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[#667085]">
              بازدید بعدی
            </span>
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700">
            {s.upcoming_visits_count}
          </div>
          <span className="text-[10px] text-[#667085]">هماهنگ شده</span>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#667085]">
            دسترسی سریع به بخش‌ها
          </span>
          <button
            onClick={n}
            className="text-[11px] font-bold text-[#145DB5] flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Search className="w-3 h-3" />
            <span>جستجو</span>
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1.5 text-center">
          <button
            onClick={() => r("properties")}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#F7F9FC] border border-slate-200/80 hover:bg-blue-50 hover:border-[#145DB5] active:scale-95 transition cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-[#145DB5] mb-1" />
            <span className="text-[10px] font-bold text-[#172033]">املاک</span>
          </button>
          <button
            onClick={() => r("customers")}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#F7F9FC] border border-slate-200/80 hover:bg-emerald-50 hover:border-emerald-500 active:scale-95 transition cursor-pointer"
          >
            <Users className="w-4 h-4 text-emerald-600 mb-1" />
            <span className="text-[10px] font-bold text-[#172033]">مشتریان</span>
          </button>
          <button
            onClick={() => r("tasks")}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#F7F9FC] border border-slate-200/80 hover:bg-amber-50 hover:border-amber-500 active:scale-95 transition cursor-pointer"
          >
            <Clock className="w-4 h-4 text-amber-600 mb-1" />
            <span className="text-[10px] font-bold text-[#172033]">امروز</span>
          </button>
          <button
            onClick={() => t("property")}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#F7F9FC] border border-slate-200/80 hover:bg-blue-50 hover:border-[#145DB5] active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#145DB5] mb-1" />
            <span className="text-[10px] font-bold text-[#172033]">ثبت ملک</span>
          </button>
          <button
            onClick={() => t("customer")}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#F7F9FC] border border-slate-200/80 hover:bg-emerald-50 hover:border-emerald-500 active:scale-95 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-emerald-600 mb-1" />
            <span className="text-[10px] font-bold text-[#172033]">ثبت مشتری</span>
          </button>
        </div>
      </div>

      {c.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
              <CircleAlert className="w-4 h-4" />
              <span>پیگیری‌های عقب‌افتاده ({c.length} مورد)</span>
            </div>
            <button
              onClick={() => r("tasks")}
              className="text-[11px] text-[#145DB5] font-semibold flex items-center"
            >
              <span>مشاهده همه</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {c.slice(0, 2).map((task: any) => (
              <TaskCard key={task.id} task={task} onComplete={i} />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#172033]">
            <Clock className="w-4 h-4 text-[#145DB5]" />
            <span>کارهای برنامه‌ریزی‌شده امروز</span>
          </div>
          <button
            onClick={() => r("tasks")}
            className="text-[11px] text-[#145DB5] font-semibold flex items-center"
          >
            <span>مشاهده همه</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
        {l.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center text-xs text-[#667085]">
            همه پیگیری‌های امروز انجام شده‌اند. برای برنامه‌ریزی بعدی می‌توانید پیگیری جدید ثبت فرمایید.
          </div>
        ) : (
          <div className="space-y-2">
            {l.slice(0, 2).map((task: any) => (
              <TaskCard key={task.id} task={task} onComplete={i} />
            ))}
          </div>
        )}
      </div>

      {u.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>بازدیدهای هماهنگ‌شده</span>
            </div>
          </div>
          <div className="space-y-2">
            {u.map((visit: any) => {
              const formattedTime = new Date(visit.scheduled_at).toLocaleString(
                "fa-IR",
                {
                  timeZone: "Asia/Tehran",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              );
              return (
                <div
                  key={visit.id}
                  className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-3 flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        {formattedTime}
                      </span>
                      <span className="text-xs font-bold text-[#172033]">
                        {visit.customer_name}
                      </span>
                    </div>
                    <p className="text-xs text-[#667085] flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#145DB5]" />
                      کد {visit.property_code}: {visit.property_title}
                    </p>
                    {visit.notes && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        {visit.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {d.length > 0 && (
        <div className="bg-linear-to-l from-blue-50/60 to-white border border-blue-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#145DB5]">
              <Sparkles className="w-4 h-4" />
              <span>پیشنهادهای هوشمند سیستم ({d.length} مورد)</span>
            </div>
            <span className="text-[10px] text-blue-600 font-semibold bg-blue-100 px-1.5 py-0.5 rounded">
              تطبیق خودکار
            </span>
          </div>
          <p className="text-[11px] text-[#667085] mb-3">
            این فایل‌های نوسپرده با خواسته‌ها و بودجه متقاضیان شما همخوانی دقیق دارند:
          </p>
          <div className="space-y-2">
            {d.slice(0, 2).map((match: any, idx: number) => (
              <div
                key={idx}
                className="bg-white border border-blue-100 rounded-lg p-2.5 shadow-xs flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#172033] line-clamp-1">
                      {match.property.title}
                    </span>
                    <span className="text-[10px] text-[#145DB5] bg-blue-50 px-1.5 rounded font-mono">
                      کد {match.property.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#667085] mt-0.5">
                    متقاضی:{" "}
                    <strong className="text-slate-800">
                      {match.customer.display_name}
                    </strong>{" "}
                    ({match.matchReasons[0] || "همخوانی بودجه"})
                  </p>
                </div>
                <button
                  onClick={() => a?.(match.property)}
                  className="px-2.5 py-1 rounded bg-[#145DB5] text-white text-[11px] font-semibold hover:bg-[#0F4383] shrink-0 active:scale-95 transition"
                >
                  مشاهده فایل
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {f.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs">
          <span className="text-xs font-bold text-[#667085] block mb-2">
            آخرین فعالیت‌ها در سیستم
          </span>
          <div className="space-y-2.5 divide-y divide-slate-100">
            {f.slice(0, 4).map((act: any) => {
              const formattedTime = new Date(act.created_at).toLocaleTimeString(
                "fa-IR",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              );
              return (
                <div
                  key={act.id}
                  className="pt-2 first:pt-0 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-[#172033] block">
                      {act.title}
                    </span>
                    <span className="text-[11px] text-[#667085]">
                      {act.description}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {formattedTime}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
