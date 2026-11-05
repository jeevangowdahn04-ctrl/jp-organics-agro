"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { LANGS } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

// ಹೆಡರ್‌ನ ಭಾಷಾ ಡ್ರಾಪ್‌ಡೌನ್: English (E) / ಕನ್ನಡ (ಕ)
export default function LanguageSwitcher({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = LANGS.find((l) => l.code === lang) ?? LANGS[0];

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

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("lang.label")}: ${active.label}`}
        className={`flex items-center gap-1 h-10 px-2.5 rounded-full text-sm font-bold transition ${
          dark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-slate-100 hover:bg-emerald-50 text-slate-700"
        }`}
      >
        <Languages className="w-5 h-5" />
        <span className="w-4 text-center">{active.short}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("lang.label")}
          className="absolute right-0 mt-2 w-44 bg-white text-slate-800 rounded-xl shadow-xl border z-50 overflow-hidden py-1"
        >
          {LANGS.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === lang}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-emerald-50 ${
                  l.code === lang ? "font-bold text-emerald-700" : ""
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    l.code === lang ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {l.short}
                </span>
                <span className="flex-1 text-left">{l.label}</span>
                {l.code === lang && <Check className="w-4 h-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
