import React, { useMemo } from "react";
import {
  formatNumberWithCommas,
  formatTomanWords,
  toEnglishDigits,
} from "../../utils/jalaali.ts";

export const CurrencyInput: React.FC<{
  label: string;
  value: string | number;
  onChange: (rawDigits: string, numericValue: number) => void;
  placeholder?: string;
  required?: boolean;
  unitSuffix?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}> = ({
  label,
  value,
  onChange,
  placeholder = "مثلاً ۱,۵۰۰,۰۰۰,۰۰۰",
  required = false,
  unitSuffix = "تومان",
  disabled = false,
  className = "",
  id,
}) => {
  const digits = toEnglishDigits(value);
  const numericValue = digits ? parseInt(digits, 10) : 0;
  const words = useMemo(
    () =>
      !digits || numericValue <= 0
        ? ""
        : formatTomanWords(digits, ` ${unitSuffix}`),
    [digits, numericValue, unitSuffix]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = toEnglishDigits(e.target.value);
    onChange(cleaned, cleaned ? parseInt(cleaned, 10) : 0);
  };

  const formatted = formatNumberWithCommas(digits);

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-xs font-bold text-[#172033]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {unitSuffix && (
          <span className="text-[10px] text-[#667085]">{unitSuffix}</span>
        )}
      </div>
      <div className="relative">
        <input
          id={id}
          type="text"
          dir="ltr"
          inputMode="numeric"
          disabled={disabled}
          value={formatted}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          className="w-full text-left font-mono font-bold text-xs tracking-wider rounded-xl border border-slate-300 bg-white p-2.5 text-[#172033] outline-none focus:border-[#145DB5] focus:ring-1 focus:ring-[#145DB5] disabled:bg-slate-100"
        />
        {digits && (
          <button
            type="button"
            onClick={() => onChange("", 0)}
            className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs px-1"
            title="پاک کردن"
          >
            ✕
          </button>
        )}
      </div>
      {words ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-[#145DB5] text-[11px] font-bold animate-in fade-in duration-200">
          <span className="shrink-0 text-[#145DB5]">معادل:</span>
          <span className="leading-tight text-slate-800 font-extrabold">
            {words}
          </span>
        </div>
      ) : null}
    </div>
  );
};
