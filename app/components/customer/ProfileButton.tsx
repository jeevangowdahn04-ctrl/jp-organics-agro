"use client";

import React, { useEffect, useRef, useState } from "react";
import { LogOut, Phone, User } from "lucide-react";
import { useCustomer } from "./CustomerProvider";
import Avatar from "./Avatar";
import { useLanguage } from "../i18n/LanguageProvider";

const formatPhone = (p: string) => `+91 ${p.slice(0, 5)} ${p.slice(5)}`;

// ಹೆಡರ್‌ನ ಪ್ರೊಫೈಲ್ / ಲಾಗಿನ್ ಐಕಾನ್
export default function ProfileButton({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  const { customer, openLogin, logout } = useCustomer();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const base = dark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-slate-100 hover:bg-emerald-50 text-slate-700";

  if (!customer) {
    return (
      <button
        type="button"
        onClick={openLogin}
        aria-label={t("login.button")}
        className={`flex items-center gap-1.5 h-10 px-3 rounded-full text-sm font-semibold transition ${base} ${className}`}
      >
        <User className="w-5 h-5" />
        <span className="hidden sm:inline">{t("login.button")}</span>
      </button>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("profile.label", { name: customer.name })}
        className={`flex items-center gap-2 h-10 pl-1 pr-3 rounded-full text-sm font-semibold transition ${base}`}
      >
        <Avatar customer={customer} className="w-8 h-8" />
        <span className="hidden sm:inline max-w-24 truncate">{customer.name.split(" ")[0]}</span>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 bg-white text-slate-800 rounded-xl shadow-xl border z-50 overflow-hidden">
          <div className="px-4 py-3 bg-emerald-50 border-b">
            <p className="font-bold truncate">{customer.name}</p>
            <p className="text-sm text-slate-600 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> {formatPhone(customer.phone)}
            </p>
          </div>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" /> {t("profile.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
