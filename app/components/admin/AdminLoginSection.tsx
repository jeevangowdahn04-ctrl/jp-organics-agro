"use client";

import React, { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Eye, EyeOff, LogOut, Settings, ShieldCheck } from "lucide-react";
import { useLanguage } from "../i18n/LanguageProvider";
import { adminLoginInline, adminLogoutInline } from "../../admin/actions";
import { useAdminMode } from "./InlineAdmin";

// ಪ್ರೊಫೈಲ್ ಪುಟದ "ಅಂಗಡಿ ಮಾಲೀಕರ ಲಾಗಿನ್": ಸರಿಯಾದ ಅಡ್ಮಿನ್ ಪಾಸ್‌ವರ್ಡ್ ಹಾಕಿದರೆ ಮುಖಪುಟದಲ್ಲಿ ಅಡ್ಮಿನ್ ಮೋಡ್
export default function AdminLoginSection() {
  const { t } = useLanguage();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useAdminMode();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string; ok?: boolean } | null, formData: FormData) => {
      const res = await adminLoginInline(prev, formData);
      if (res?.ok) {
        setIsAdmin(true);
        router.push("/");
      }
      return res;
    },
    null
  );

  if (isAdmin) {
    return (
      <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
        <p className="font-bold text-amber-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" /> {t("admin.on")}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded-full"
          >
            <Settings className="w-4 h-4" /> {t("admin.goStore")}
          </button>
          <button
            type="button"
            onClick={async () => {
              await adminLogoutInline();
              setIsAdmin(false);
            }}
            className="flex items-center gap-1.5 text-red-700 border border-red-300 hover:bg-red-50 font-semibold text-sm px-4 py-2 rounded-full"
          >
            <LogOut className="w-4 h-4" /> {t("admin.logout")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <ShieldCheck className="w-5 h-5 text-slate-500" />
        <span className="flex-1 font-semibold text-slate-700">{t("admin.section")}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <form action={formAction} className="px-5 pb-5 space-y-3">
          <p className="text-xs text-slate-500">{t("admin.hint")}</p>
          <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-600">{t("admin.password")}</label>
          <div className="relative">
            <input
              id="admin-password"
              name="password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              required
              className="w-full border border-slate-300 rounded-lg pl-3 pr-10 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500"
            >
              {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {state?.error && <p role="alert" className="text-sm text-red-600">{t("admin.wrong")}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-full disabled:opacity-60"
          >
            {pending ? t("admin.checking") : t("admin.login")}
          </button>
        </form>
      )}
    </section>
  );
}
