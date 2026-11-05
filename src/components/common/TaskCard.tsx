import React, { useState } from "react";
import {
  Building2,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  CreditCard,
  FileText,
  Handshake,
  MessageSquare,
  Phone,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { formatJalaaliDateTime } from "../../utils/jalaali.ts";

export const TaskCard: React.FC<{
  task: any;
  onComplete?: (id: string, visitResult?: string) => void;
  onCancel?: (id: string) => void;
}> = ({ task, onComplete, onCancel }) => {
  const isOverdue =
    task.status === "OVERDUE" ||
    (task.status === "TODO" && new Date(task.due_at) < new Date());
  const isCompleted = task.status === "COMPLETED";
  const isCancelled = task.status === "CANCELLED";
  const [showVisitModal, setShowVisitModal] = useState(false);

  const typeMeta = (() => {
    switch (task.type) {
      case "CALL":
        return {
          label: "تماس تلفنی",
          icon: Phone,
          color: "text-indigo-600 bg-blue-50 border-indigo-100",
        };
      case "VISIT":
        return {
          label: "بازدید ملک",
          icon: Building2,
          color: "text-emerald-700 bg-emerald-50 border-emerald-100",
        };
      case "MEETING":
        return {
          label: "جلسه حضوری",
          icon: Users,
          color: "text-teal-700 bg-teal-50 border-teal-100",
        };
      case "NEGOTIATION":
        return {
          label: "مذاکره قرارداد",
          icon: Handshake,
          color: "text-amber-700 bg-amber-50 border-amber-100",
        };
      case "PAYMENT_REMINDER":
        return {
          label: "یادآوری پرداخت",
          icon: CreditCard,
          color: "text-rose-700 bg-rose-50 border-rose-100",
        };
      case "OTHER":
        return {
          label: "سایر اقدامات",
          icon: FileText,
          color: "text-slate-700 bg-slate-50 border-slate-100",
        };
      default:
        return {
          label: "پیگیری عمومی",
          icon: MessageSquare,
          color: "text-sky-700 bg-sky-50 border-sky-100",
        };
    }
  })();

  const TypeIcon = typeMeta.icon;

  const completeWithResult = (visitResult?: string) => {
    if (onComplete) onComplete(task.id, visitResult);
    setShowVisitModal(false);
  };

  return (
    <div
      className={`border rounded-xl p-3.5 transition select-none ${
        isOverdue
          ? "bg-rose-50/40 border-rose-200"
          : isCompleted
          ? "bg-slate-50 border-slate-200 opacity-70"
          : isCancelled
          ? "bg-slate-100/50 border-slate-200 opacity-50 line-through"
          : "bg-white border-[#E2E8F0] shadow-xs"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${typeMeta.color}`}
          >
            <TypeIcon className="w-3 h-3" />
            <span>{typeMeta.label}</span>
          </span>
          {isOverdue && (
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-lg">
              <CircleAlert className="w-3 h-3" />
              عقب‌افتاده
            </span>
          )}
          {task.priority === "URGENT" && (
            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-lg">
              فوری
            </span>
          )}
          <span className="text-[10px] text-[#667085] flex items-center gap-1 font-mono font-bold bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
            <Clock className="w-3 h-3 text-[#145DB5]" />
            <span>موعد: {formatJalaaliDateTime(task.due_at)}</span>
          </span>
          {task.end_at && (
            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
              <span>
                تا:{" "}
                {formatJalaaliDateTime(task.end_at).split(" ")[1] ||
                  formatJalaaliDateTime(task.end_at)}
              </span>
            </span>
          )}
        </div>
        {!isCompleted && !isCancelled && (
          <div className="flex items-center gap-1.5">
            {onComplete && (
              <button
                onClick={() => {
                  task.type === "VISIT"
                    ? setShowVisitModal(true)
                    : completeWithResult();
                }}
                className="flex items-center gap-1 text-[11px] text-[#145DB5] hover:text-emerald-700 font-extrabold px-2 py-1 rounded-lg hover:bg-slate-100 active:scale-95 transition"
                title="علامت‌گذاری به عنوان انجام شده"
              >
                <CircleCheck className="w-4 h-4 text-emerald-600" />
                <span>انجام شد</span>
              </button>
            )}
            {onCancel && (
              <button
                onClick={() => onCancel(task.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition"
                title="لغو اقدام"
              >
                <CircleX className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        {isCompleted && (
          <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 flex items-center gap-1">
            <CircleCheck className="w-3 h-3 text-emerald-600" />
            انجام شد
          </span>
        )}
        {isCancelled && (
          <span className="text-[11px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
            لغو شد
          </span>
        )}
      </div>
      <h4
        className={`text-xs sm:text-sm font-bold mb-1.5 ${
          isCompleted || isCancelled
            ? "line-through text-slate-400"
            : "text-[#172033]"
        }`}
      >
        {task.title}
      </h4>
      {task.description && (
        <p className="text-xs text-[#667085] mb-2 leading-relaxed line-clamp-2">
          {task.description}
        </p>
      )}
      {isCompleted && task.visit_result && (
        <div className="text-[11px] text-emerald-800 bg-emerald-50/50 rounded-lg p-2 border border-emerald-100 font-semibold mb-2 flex items-center gap-1.5">
          <span>نتیجه بازدید متقاضی:</span>
          <span className="font-bold underline">
            {(
              {
                INTERESTED: "علاقه‌مند به خرید/اجاره",
                NOT_INTERESTED: "عدم تمایل / نپسندید",
                NEED_FOLLOW_UP: "نیاز به پیگیری مجدد",
                NEGOTIATION_STARTED: "شروع مذاکره برای قرارداد",
              } as Record<string, string>
            )[task.visit_result] || task.visit_result}
          </span>
        </div>
      )}
      {(task.customer_name || task.property_title) && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-2 text-xs">
          <div className="flex items-center gap-3">
            {task.customer_name && (
              <span className="flex items-center gap-1 text-[#145DB5] font-extrabold hover:underline cursor-pointer">
                <User className="w-3.5 h-3.5 text-[#145DB5]" />
                {task.customer_name}
              </span>
            )}
            {task.property_title && (
              <span
                className="flex items-center gap-1 text-slate-600 max-w-[200px] truncate"
                title={task.property_title}
              >
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>کد {task.property_code || "ملک"}</span>
              </span>
            )}
          </div>
          {task.customer_phone && !isCompleted && !isCancelled && (
            <a
              href={`tel:${task.customer_phone}`}
              className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
              title={`تماس با ${task.customer_name}`}
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}
      {showVisitModal && (
        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2">
          <p className="text-[11px] font-extrabold text-[#172033] flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-[#145DB5]" />
            <span>نتیجه و بازخورد بازدید ملک را ثبت کنید:</span>
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              onClick={() => completeWithResult("INTERESTED")}
              className="flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg font-bold transition"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>علاقه‌مند است</span>
            </button>
            <button
              onClick={() => completeWithResult("NEGOTIATION_STARTED")}
              className="flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg font-bold transition"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>شروع مذاکره</span>
            </button>
            <button
              onClick={() => completeWithResult("NEED_FOLLOW_UP")}
              className="flex items-center justify-center gap-1 py-1.5 px-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-bold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>نیاز به پیگیری</span>
            </button>
            <button
              onClick={() => completeWithResult("NOT_INTERESTED")}
              className="flex items-center justify-center gap-1 py-1.5 px-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-bold transition"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              <span>پسندیده نشد</span>
            </button>
          </div>
          <div className="flex justify-end pt-1">
            <button
              onClick={() => setShowVisitModal(false)}
              className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold"
            >
              انصراف
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
