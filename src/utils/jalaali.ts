import { api } from "../services/apiClient.ts";

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181,
  1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
];
const MIN_J_YEAR = BREAKS[0];
const MAX_J_YEAR = BREAKS[BREAKS.length - 1] - 1;

function div(a: number, b: number): number {
  return ~~(a / b);
}

function mod(a: number, b: number): number {
  return a - ~~(a / b) * b;
}

function jalCalLeap(r: number, i: number): number {
  let n = i;
  if (r - i < 6) {
    n = i - r + div(r + 4, 33) * 33;
  }
  let res = mod(mod(n + 1, 33) - 1, 4);
  if (res === -1) res = 4;
  return res;
}

function jalCal(jy: number) {
  if (!Number.isFinite(jy) || jy < MIN_J_YEAR || jy > MAX_J_YEAR) {
    throw new RangeError(
      `Invalid Jalaali year ${jy}: must be a finite number between ${MIN_J_YEAR} and ${MAX_J_YEAR} (inclusive)`
    );
  }
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jm = 0;
  let jump = 0;

  for (let i = 1; i < BREAKS.length; i += 1) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  const n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) {
    leapJ += 1;
  }
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  return { gy, march, jump, n };
}

function isLeapJalaaliYear(jy: number): boolean {
  if (!Number.isFinite(jy) || jy < MIN_J_YEAR || jy > MAX_J_YEAR) {
    throw new RangeError(
      `Invalid Jalaali year ${jy}: must be a finite number between ${MIN_J_YEAR} and ${MAX_J_YEAR} (inclusive)`
    );
  }
  let jp = BREAKS[0];
  let jm = 0;
  let jump = 0;
  for (let i = 1; i < BREAKS.length; i += 1) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    jp = jm;
  }
  return jalCalLeap(jump, jy - jp) === 0;
}

export function daysInJalaaliMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaaliYear(jy) ? 30 : 29;
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

const MIN_JDN = j2d(MIN_J_YEAR, 1, 1);
const MAX_JDN = j2d(MAX_J_YEAR, 12, daysInJalaaliMonth(MAX_J_YEAR, 12));

function d2j(jdn: number) {
  if (jdn < MIN_JDN || jdn > MAX_JDN) {
    throw new RangeError(
      `Invalid Julian Day number ${jdn}: outside the supported Jalaali range [${MIN_J_YEAR}, ${MAX_J_YEAR}]`
    );
  }
  const gy = d2g(jdn).gy;
  let jy = Math.min(gy - 621, MAX_J_YEAR);
  const r = jalCal(jy);
  const jdn1f = g2d(r.gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      return {
        jy,
        jm: 1 + div(k, 31),
        jd: mod(k, 31) + 1,
      };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    const calPrev = jalCal(jy);
    if (jalCalLeap(calPrev.jump, calPrev.n) === 1) {
      k += 1;
    }
  }
  return {
    jy,
    jm: 7 + div(k, 30),
    jd: mod(k, 30) + 1,
  };
}

export function toJalaali(gyOrDate: number | Date, gm?: number, gd?: number) {
  if (gyOrDate instanceof Date) {
    return d2j(g2d(gyOrDate.getFullYear(), gyOrDate.getMonth() + 1, gyOrDate.getDate()));
  }
  return d2j(g2d(gyOrDate, gm!, gd!));
}

export function toGregorian(jy: number, jm: number, jd: number) {
  return d2g(j2d(jy, jm, jd));
}

export const PERSIAN_MONTHS = [
  { id: 1, name: "فروردین" },
  { id: 2, name: "اردیبهشت" },
  { id: 3, name: "خرداد" },
  { id: 4, name: "تیر" },
  { id: 5, name: "مرداد" },
  { id: 6, name: "شهریور" },
  { id: 7, name: "مهر" },
  { id: 8, name: "آبان" },
  { id: 9, name: "آذر" },
  { id: 10, name: "دی" },
  { id: 11, name: "بهمن" },
  { id: 12, name: "اسفند" },
];

export const PERSIAN_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function getTodayJalaali() {
  const now = new Date();
  const tehranMs = now.getTime() + (now.getTimezoneOffset() + 210) * 60 * 1000;
  const tehranDate = new Date(tehranMs);
  const j = toJalaali(
    tehranDate.getFullYear(),
    tehranDate.getMonth() + 1,
    tehranDate.getDate()
  );
  return {
    jy: j.jy,
    jm: j.jm,
    jd: j.jd,
    hour: tehranDate.getHours(),
    minute: tehranDate.getMinutes(),
  };
}

export function jalaaliToUtcIso(
  jy: number,
  jm: number,
  jd: number,
  hour: number = 0,
  minute: number = 0
): string {
  const g = toGregorian(jy, jm, jd);
  const utcMs = Date.UTC(g.gy, g.gm - 1, g.gd, hour, minute, 0) - 12600000;
  return new Date(utcMs).toISOString();
}

export function formatJalaaliDateTime(
  dateInput: string | Date | null | undefined,
  includeTime: boolean = true
): string {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";
  const tehranDate = new Date(date.getTime() + 12600000);
  const gy = tehranDate.getUTCFullYear();
  const gm = tehranDate.getUTCMonth() + 1;
  const gd = tehranDate.getUTCDate();
  const hour = tehranDate.getUTCHours();
  const minute = tehranDate.getUTCMinutes();
  const j = toJalaali(gy, gm, gd);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const datePart = `${j.jy}/${pad2(j.jm)}/${pad2(j.jd)}`;
  return includeTime ? `${datePart} - ${pad2(hour)}:${pad2(minute)}` : datePart;
}

export function formatJalaaliDate(dateInput: string | Date | null | undefined): string {
  return formatJalaaliDateTime(dateInput, false);
}

export function toWords(val: string | number | null | undefined): string {
  const n = parseInt(String(val || "").replace(/\D/g, ""), 10);
  if (isNaN(n) || n <= 0) return "";
  const ones = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
  const tens = ["", "ده", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
  const teens = [
    "ده",
    "یازده",
    "دوازده",
    "سیزده",
    "چهارده",
    "پانزده",
    "شانزده",
    "هفده",
    "هجده",
    "نوزده",
  ];
  const hundreds = [
    "",
    "یکصد",
    "دویست",
    "سیصد",
    "چهارصد",
    "پانصد",
    "ششصد",
    "هفتصد",
    "هشتصد",
    "نهصد",
  ];
  const scales = ["", "هزار", "میلیون", "میلیارد", "تریلیون"];

  const threeDigits = (num: number): string[] => {
    if (num === 0) return [];
    const parts: string[] = [];
    const h = Math.floor(num / 100);
    const rem = num % 100;
    if (h > 0) parts.push(hundreds[h]);
    if (rem >= 10 && rem <= 19) {
      parts.push(teens[rem - 10]);
    } else {
      const t = Math.floor(rem / 10);
      const u = rem % 10;
      if (t > 0) parts.push(tens[t]);
      if (u > 0) parts.push(ones[u]);
    }
    return parts;
  };

  const chunks: number[] = [];
  let tmp = n;
  while (tmp > 0) {
    chunks.push(tmp % 1000);
    tmp = Math.floor(tmp / 1000);
  }
  const words: string[] = [];
  for (let i = chunks.length - 1; i >= 0; i--) {
    if (chunks[i] > 0) {
      let str = threeDigits(chunks[i]).join(" و ");
      if (scales[i]) str += " " + scales[i];
      words.push(str);
    }
  }
  return "به حروف: " + words.join(" و ") + " تومان";
}

export async function downloadDocumentSafe(doc: any, allowArchived: boolean = false) {
  try {
    const token = api.getToken();
    const url = `/api/v1/documents/${doc.id}/download${
      token ? `?token=${encodeURIComponent(token)}` : ""
    }${allowArchived ? "&allow_archived=true" : ""}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      window.alert(err?.error?.message || "خطا در بارگیری سند از سرور.");
      return;
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = doc.file_name || `${doc.display_name || "document"}.pdf`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 1000);
  } catch {
    window.alert("خطا در دریافت فایل سند.");
  }
}

export function formatCompactPrice(amount: number | null | undefined): string {
  if (!amount || amount <= 0) return "توافقی";
  if (amount >= 1e9) {
    const billions = amount / 1e9;
    return `${billions % 1 === 0 ? billions : billions.toFixed(1)} میلیارد تومان`;
  }
  return amount >= 1e6
    ? `${Math.round(amount / 1e6)} میلیون تومان`
    : `${amount.toLocaleString("fa-IR")} تومان`;
}

const PERSIAN_ONES = [
  "",
  "یک",
  "دو",
  "سه",
  "چهار",
  "پنج",
  "شش",
  "هفت",
  "هشت",
  "نه",
  "ده",
  "یازده",
  "دوازده",
  "سیزده",
  "چهارده",
  "پانزده",
  "شانزده",
  "هفده",
  "هجده",
  "نوزده",
];
const PERSIAN_TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const PERSIAN_HUNDREDS = [
  "",
  "صد",
  "دویست",
  "سیصد",
  "چهارصد",
  "پانصد",
  "ششصد",
  "هفتصد",
  "هشتصد",
  "نهصد",
];
const PERSIAN_SCALES = ["", "هزار", "میلیون", "میلیارد", "تریلیون", "کادریلیون"];

function threeDigitsToWords(num: number): string {
  if (num === 0) return "";
  const parts: string[] = [];
  const h = Math.floor(num / 100);
  const rem = num % 100;
  if (h > 0) parts.push(PERSIAN_HUNDREDS[h]);
  if (rem > 0) {
    if (rem < 20) {
      parts.push(PERSIAN_ONES[rem]);
    } else {
      const t = Math.floor(rem / 10);
      const u = rem % 10;
      parts.push(PERSIAN_TENS[t]);
      if (u > 0) parts.push(PERSIAN_ONES[u]);
    }
  }
  return parts.join(" و ");
}

export function toEnglishDigits(input: string | number | null | undefined): string {
  if (input == null) return "";
  let s = String(input).trim();
  if (!s) return "";
  s = s.replace(/[۰-۹]/g, (ch) => String(ch.charCodeAt(0) - 1776));
  s = s.replace(/[٠-٩]/g, (ch) => String(ch.charCodeAt(0) - 1632));
  s = s.replace(/[^\d]/g, "");
  s = s.replace(/^0+(?=\d)/, "");
  return s;
}

export function formatTomanWords(
  val: string | number | null | undefined,
  suffix: string = " تومان"
): string {
  const digits = toEnglishDigits(val);
  if (!digits) return "";
  if (digits === "0") return `صفر${suffix}`;
  const groups: number[] = [];
  let remaining = digits;
  while (remaining.length > 0) {
    const take = remaining.length % 3 === 0 ? 3 : remaining.length % 3;
    const chunk = remaining.slice(0, take);
    groups.unshift(parseInt(chunk, 10));
    remaining = remaining.slice(take);
  }
  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const num = groups[i];
    if (num > 0) {
      const w = threeDigitsToWords(num);
      const scale = PERSIAN_SCALES[i];
      words.push(scale ? `${w} ${scale}` : w);
    }
  }
  return words.length === 0 ? "" : `${words.join(" و ")}${suffix}`;
}

export function formatNumberWithCommas(val: string | number | null | undefined): string {
  const digits = toEnglishDigits(val);
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "";
}

if (typeof window !== "undefined") {
  (window as any).__toWords = toWords;
  (window as any).__downloadDoc = downloadDocumentSafe;
}
