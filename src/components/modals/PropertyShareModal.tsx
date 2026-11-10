import React, { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  PhoneCall,
  Search,
  Share2,
  X,
} from "lucide-react";
import { api } from "../../services/apiClient.ts";

export const PropertyShareModal: React.FC<{
  property: any;
  customers: any[];
  isOpen: boolean;
  onClose: () => void;
  onShareComplete?: (data: any) => void;
}> = ({ property, customers, isOpen, onClose, onShareComplete }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [channel, setChannel] = useState("WHATSAPP");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shareResult, setShareResult] = useState<{
    share_token: string;
    share_url: string;
    fullUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.display_name?.toLowerCase().includes(q) || c.phone?.includes(q)
    );
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#145DB5] flex items-center justify-center font-bold">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#172033]">
                اشتراک‌گذاری امن فایل ملک
              </h3>
              <p className="text-[11px] text-slate-500">
                کد {property.code} • {property.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {shareResult ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>لینک امن فایل ملکی با موفقیت ایجاد شد!</span>
                </div>
                {selectedCustomer && (
                  <p className="text-[11px] text-emerald-700">
                    رویداد ارسال فایل در سوابق و تایم‌لاین{" "}
                    <b>{selectedCustomer.display_name}</b> ثبت گردید.
                  </p>
                )}
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  لینک دسترسی مشتری به کاتالوگ آنلاین ملک:
                </label>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-2">
                  <input
                    type="text"
                    readOnly
                    value={shareResult.fullUrl}
                    className="flex-1 bg-transparent text-[11px] text-slate-700 outline-none select-all"
                  />
                  <button
                    onClick={async () => {
                      if (shareResult?.fullUrl) {
                        try {
                          await navigator.clipboard.writeText(
                            shareResult.fullUrl
                          );
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2500);
                        } catch {
                          // Ignore clipboard errors
                        }
                      }
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      copied
                        ? "bg-emerald-600 text-white"
                        : "bg-[#145DB5] text-white hover:bg-[#0F4383]"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>کپی شد</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>کپی لینک</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={shareResult.fullUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-slate-100 text-slate-800 py-2 rounded-xl font-bold hover:bg-slate-200 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>پیش‌نمایش آنلاین</span>
                </a>
                <button
                  onClick={() => {
                    const text = encodeURIComponent(
                      `مشخصات فایل ملکی کد ${property.code} (${property.title}):\n${shareResult.fullUrl}`
                    );
                    window.open(
                      `https://api.whatsapp.com/send?text=${text}`,
                      "_blank"
                    );
                  }}
                  className="flex items-center justify-center gap-1.5 bg-emerald-700 text-white py-2 rounded-xl font-bold hover:bg-emerald-800 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>ارسال مجدد در واتس‌اپ</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  انتخاب مشتری جهت ثبت خودکار در پرونده (اختیاری):
                </label>
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="جستجوی متقاضی بر اساس نام یا شماره..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 pr-8 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50">
                  <div
                    onClick={() => setSelectedCustomerId("")}
                    className={`p-2 cursor-pointer flex items-center justify-between text-xs transition ${
                      selectedCustomerId
                        ? "hover:bg-white text-slate-700"
                        : "bg-blue-50 text-[#145DB5] font-bold"
                    }`}
                  >
                    <span>اشتراک عمومی (بدون انتخاب مشتری)</span>
                    {!selectedCustomerId && <Check className="w-3.5 h-3.5" />}
                  </div>
                  {filteredCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => setSelectedCustomerId(cust.id)}
                      className={`p-2 cursor-pointer flex items-center justify-between text-xs transition ${
                        selectedCustomerId === cust.id
                          ? "bg-blue-50 text-[#145DB5] font-bold"
                          : "hover:bg-white text-slate-700"
                      }`}
                    >
                      <div>
                        <span className="block">{cust.display_name}</span>
                        <span className="text-[10px] text-slate-500" dir="ltr">
                          {cust.phone}
                        </span>
                      </div>
                      {selectedCustomerId === cust.id && (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  نحوه اشتراک‌گذاری:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: "WHATSAPP",
                      label: "واتس‌اپ مستقیم",
                      icon: MessageSquare,
                    },
                    { id: "LINK", label: "کپی لینک امن", icon: Copy },
                    { id: "SMS", label: "پیامک اختصاصی", icon: PhoneCall },
                  ].map((item) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setChannel(item.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center font-bold gap-1 transition ${
                          channel === item.id
                            ? "bg-blue-50 border-[#145DB5] text-[#145DB5]"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[11px]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  یادداشت ارسال (در تایم‌لاین مشتری ثبت می‌شود):
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: متناسب با بودجه مطرح‌شده در تماس دیروز ارسال شد..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-[#172033] outline-none focus:border-[#145DB5]"
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                <span className="font-bold text-[#145DB5] block mb-0.5">
                  حفظ محرمانگی اطلاعات:
                </span>
                لینک اشتراک‌گذاری فقط شامل مشخصات بصری، نقشه محله و مشخصات آژانس
                است. نام مالک، شماره مالک و یادداشت‌های خصوصی به هیچ وجه در صفحه
                عمومی نمایش داده نمی‌شود.
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0">
          {shareResult ? (
            <button
              onClick={onClose}
              className="w-full bg-slate-800 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-slate-900 transition"
            >
              بستن
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  const res = await api.post(
                    `/api/v1/properties/${property.id}/share`,
                    {
                      customer_id: selectedCustomerId || undefined,
                      channel,
                      notes: notes.trim() || undefined,
                    }
                  );
                  if (res.success && res.data) {
                    const fullUrl = `${window.location.origin}#/p/${res.data.share_token}`;
                    setShareResult({
                      share_token: res.data.share_token,
                      share_url: res.data.share_url,
                      fullUrl,
                    });
                    if (onShareComplete) onShareComplete(res.data);

                    if (channel === "WHATSAPP") {
                      const msgText = encodeURIComponent(
                        `سلام و احترام ${
                          selectedCustomer ? selectedCustomer.display_name : ""
                        } عزیز،\nمشخصات فایل ملکی جدید کد ${property.code} (${
                          property.title
                        }) جهت بررسی خدمت شما:\nمتراژ: ${
                          property.area_sqm
                        } متر • محله: ${
                          property.address?.neighborhood ||
                          property.address?.city
                        }\nمشاهده تصاویر و جزئیات آنلاین:\n${fullUrl}\n\nسامانه مدیریت املاک`
                      );
                      if (selectedCustomer?.phone) {
                        let digits = selectedCustomer.phone.replace(/\D/g, "");
                        if (digits.startsWith("0")) {
                          digits = "98" + digits.substring(1);
                        }
                        window.open(
                          `https://api.whatsapp.com/send?phone=${digits}&text=${msgText}`,
                          "_blank"
                        );
                      } else {
                        window.open(
                          `https://api.whatsapp.com/send?text=${msgText}`,
                          "_blank"
                        );
                      }
                    } else if (channel === "LINK") {
                      await navigator.clipboard.writeText(fullUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 3000);
                    }
                  }
                } catch (err) {
                  console.error("Share error:", err);
                } finally {
                  setSubmitting(false);
                }
              }}
              className="w-full bg-[#145DB5] text-white py-2.5 rounded-xl font-bold text-xs shadow-md hover:bg-[#0F4383] active:scale-98 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              <span>
                {submitting
                  ? "در حال صدور لینک امن..."
                  : "تولید لینک و ارسال به مشتری"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
