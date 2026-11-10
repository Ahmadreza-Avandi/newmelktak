import React, { useState, useEffect } from "react";
import { Calendar, ChevronDown, Clock } from "lucide-react";
import {
  PERSIAN_MONTHS,
  daysInJalaaliMonth,
  getTodayJalaali,
  jalaaliToUtcIso,
} from "../../utils/jalaali.ts";

export const PersianDatePicker: React.FC<{
  valueIso?: string;
  onChange: (iso: string) => void;
  label?: string;
}> = ({ onChange, label = "زمان موعد پیگیری" }) => {
  const today = getTodayJalaali();
  const [year, setYear] = useState(today.jy);
  const [month, setMonth] = useState(today.jm);
  const [day, setDay] = useState(today.jd);
  const [hour, setHour] = useState(
    today.hour >= 23 ? 10 : Math.min(23, today.hour + 1)
  );
  const [minute, setMinute] = useState(0);

  const daysInMonth = daysInJalaaliMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, idx) => idx + 1);
  const years = [today.jy - 1, today.jy, today.jy + 1, today.jy + 2];
  const hours = Array.from({ length: 24 }, (_, idx) => idx);
  const minutes = [0, 15, 30, 45];

  useEffect(() => {
    if (day > daysInMonth) setDay(daysInMonth);
  }, [daysInMonth, day]);

  useEffect(() => {
    onChange(jalaaliToUtcIso(year, month, day, hour, minute));
  }, [year, month, day, hour, minute, onChange]);

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const monthName = PERSIAN_MONTHS.find((m) => m.id === month)?.name || "";

  return (
    <div className="space-y-2 rounded-2xl bg-[#F7F9FC] border border-slate-200 p-3.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-extrabold text-[#172033]">
          <Calendar className="w-4 h-4 text-[#145DB5]" />
          <span>{label}</span>
        </label>
        <span className="text-[11px] font-mono font-bold text-[#145DB5] bg-white px-2 py-0.5 rounded-lg border border-blue-200">
          {year}/{pad2(month)}/{pad2(day)} — {pad2(hour)}:{pad2(minute)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">روز</label>
          <div className="relative">
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full text-xs font-bold rounded-lg border border-slate-300 bg-white p-2 appearance-none outline-none focus:border-[#145DB5]"
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">ماه</label>
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full text-xs font-bold rounded-lg border border-slate-300 bg-white p-2 appearance-none outline-none focus:border-[#145DB5]"
            >
              {PERSIAN_MONTHS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">سال</label>
          <div className="relative">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full text-xs font-bold rounded-lg border border-slate-300 bg-white p-2 appearance-none outline-none focus:border-[#145DB5]"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>
      <div className="pt-1.5 border-t border-slate-200">
        <label className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
          <Clock className="w-3.5 h-3.5 text-[#145DB5]" />
          <span>ساعت دقیق تماس / پیگیری</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1.5">
            <span className="text-[11px] text-slate-500 shrink-0">ساعت:</span>
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-full text-xs font-bold bg-transparent outline-none"
            >
              {hours.map((h) => (
                <option key={h} value={h}>
                  {pad2(h)}:00
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1.5">
            <span className="text-[11px] text-slate-500 shrink-0">دقیقه:</span>
            <select
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
              className="w-full text-xs font-bold bg-transparent outline-none"
            >
              {minutes.map((m) => (
                <option key={m} value={m}>
                  {pad2(m)} دقیقه
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="text-[11px] text-slate-600 bg-white/80 rounded-lg p-2 border border-slate-200/80 flex items-center justify-between font-medium">
        <span>تاریخ انتخابی:</span>
        <span className="font-bold text-[#145DB5]">
          {day} {monthName} {year} ساعت {pad2(hour)}:{pad2(minute)}
        </span>
      </div>
    </div>
  );
};
