"use client";

import React, { useEffect, useState } from "react";
import { Leaf, Phone, User, X } from "lucide-react";
import { Customer, PHONE_PATTERN } from "./CustomerProvider";
import { useLanguage } from "../i18n/LanguageProvider";

// ಲಾಗಿನ್ ಪಾಪ್-ಅಪ್: ಹೆಸರು + +91 ಮೊಬೈಲ್ ನಂಬರ್ → Continue
export default function LoginModal({
  reason,
  onClose,
  onLogin,
}: {
  reason?: string;
  onClose: () => void;
  onLogin: (customer: Customer) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const { t } = useLanguage();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, " ");
    const cleanPhone = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (cleanName.length < 2) return setError(t("login.errName"));
    if (!PHONE_PATTERN.test(cleanPhone)) return setError(t("login.errPhone"));
    onLogin({ name: cleanName.slice(0, 60), phone: cleanPhone });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 text-white px-5 pt-5 pb-6">
          <button onClick={onClose} aria-label={t("btn.close")} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/15">
            <X className="w-5 h-5" />
          </button>
          <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center mb-3">
            <Leaf className="w-6 h-6" />
          </div>
          <h2 id="login-title" className="text-lg font-bold">{t("login.title")}</h2>
          <p className="text-sm text-emerald-100">{reason || t("login.subtitle")}</p>
        </div>

        <form onSubmit={submit} className="px-5 py-5 space-y-4">
          <div>
            <label htmlFor="customer-name" className="block text-xs font-semibold text-slate-600 mb-1">{t("login.name")}</label>
            <div className="flex items-center border border-slate-300 rounded-lg focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
              <User className="w-4 h-4 text-slate-400 ml-3" />
              <input
                id="customer-name"
                autoFocus
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder={t("login.namePlaceholder")}
                className="flex-1 px-3 py-2.5 rounded-lg outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="customer-phone" className="block text-xs font-semibold text-slate-600 mb-1">{t("login.phone")}</label>
            <div className="flex items-center border border-slate-300 rounded-lg focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
              <span className="flex items-center gap-1 pl-3 pr-2 text-sm font-semibold text-slate-700 border-r border-slate-200">
                <Phone className="w-4 h-4 text-slate-400" /> +91
              </span>
              <input
                id="customer-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={14}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/[^\d\s]/g, ""));
                  setError("");
                }}
                placeholder="98765 43210"
                className="flex-1 px-3 py-2.5 rounded-lg outline-none text-sm tracking-wide"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-900 font-bold py-3 rounded-full transition shadow-sm"
          >
            {t("login.continue")}
          </button>
          <p className="text-[11px] text-slate-500 text-center leading-relaxed">{t("login.privacy")}</p>
        </form>
      </div>
    </div>
  );
}
