import React, { useState, useEffect } from "react";
import { Save, SquareCheckBig, X } from "lucide-react";
import { PersianDatePicker } from "../common/PersianDatePicker.tsx";
import { TASK_TYPE_OPTIONS } from "./CreateTaskModal.tsx";

export interface EditTaskModalProps {
  isOpen: boolean;
  task: any | null;
  onClose: () => void;
  onSave: (
    taskId: string,
    patch: {
      title: string;
      type: string;
      priority: string;
      due_at: string;
      end_at?: string | null;
      description?: string;
    },
    expectedUpdatedAt?: string | null,
  ) => Promise<{ success: boolean; error?: string }>;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("FOLLOW_UP");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [hasEndAt, setHasEndAt] = useState(false);
  const [endAt, setEndAt] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title || "");
      setType(task.type || "FOLLOW_UP");
      setPriority(task.priority || "MEDIUM");
      setDueAt(task.due_at || "");
      setHasEndAt(Boolean(task.end_at));
      setEndAt(task.end_at || "");
      setDescription(task.description || "");
      setError(null);
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (saving) return;
    if (!title.trim()) {
      setError("عنوان پیگیری الزامی است.");
      return;
    }
    if (!dueAt) {
      setError("موعد پیگیری الزامی است.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await onSave(
        task.id,
        {
          title: title.trim(),
          type,
          priority,
          due_at: dueAt,
          end_at: hasEndAt && endAt ? endAt : null,
          description: description.trim() || undefined,
        },
        task.updated_at || null,
      );
      if (res.success) {
        onClose();
      } else {
        setError(res.error || "خطا در ویرایش پیگیری.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <SquareCheckBig className="w-4 h-4 text-[#145DB5]" />
            <h3 className="text-sm font-bold text-[#172033]">
              ویرایش پیگیری و زمان‌بندی
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1">
              نوع فعالیت
            </label>
            <select
              value={type}
              onChange={(ev) => setType(ev.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-[#172033] font-bold bg-white"
            >
              {TASK_TYPE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1">
              عنوان اقدام
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-[#172033] font-semibold"
            />
          </div>

          <PersianDatePicker
            valueIso={dueAt}
            onChange={(iso) => setDueAt(iso)}
            label="موعد شروع / تاریخ اقدام"
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[#667085]">
                زمان پایان
              </span>
              <button
                type="button"
                onClick={() => setHasEndAt(!hasEndAt)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  hasEndAt
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {hasEndAt ? "فعال - حذف" : "غیرفعال - افزودن"}
              </button>
            </div>
            {hasEndAt && (
              <PersianDatePicker
                valueIso={endAt}
                onChange={(iso) => setEndAt(iso)}
                label="زمان پایان"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1">
              اولویت
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "LOW", label: "کم" },
                { id: "MEDIUM", label: "عادی" },
                { id: "HIGH", label: "مهم" },
                { id: "URGENT", label: "فوری" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPriority(item.id)}
                  className={`py-1.5 rounded-lg text-xs font-bold border ${
                    priority === item.id
                      ? "bg-[#145DB5] text-white border-[#145DB5]"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1">
              توضیحات
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={saving}
              className="py-2.5 rounded-xl bg-[#145DB5] text-white text-xs font-bold hover:bg-[#0F4383] flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "در حال ذخیره..." : "ذخیره تغییرات"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
