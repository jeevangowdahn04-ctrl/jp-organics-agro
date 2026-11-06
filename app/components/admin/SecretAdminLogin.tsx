"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, LogOut, Settings, X } from "lucide-react";
import { useLanguage } from "../i18n/LanguageProvider";
import { adminLoginInline, adminLogoutInline } from "../../admin/actions";
import { useAdminMode } from "./InlineAdmin";

// ರಹಸ್ಯ ಅಡ್ಮಿನ್ ಲಾಗಿನ್: ಸಾರ್ವಜನಿಕರಿಗೆ ಯಾವುದೇ ಬಟನ್ ಕಾಣಿಸುವುದಿಲ್ಲ.
//  • ಮೊಬೈಲ್: ಲೋಗೋ (data-admin-tap) ಮೇಲೆ 3 ಬಾರಿ ವೇಗವಾಗಿ ಟ್ಯಾಪ್
//  • ಲ್ಯಾಪ್‌ಟಾಪ್: Alt + A ಅಥವಾ Ctrl + Shift + A
// ಪಾಸ್‌ವರ್ಡ್ ಪರಿಶೀಲನೆ ಯಾವಾಗಲೂ ಸರ್ವರ್‌ನಲ್ಲೇ; ಈ ರಹಸ್ಯ ದಾರಿ ಕೇವಲ ಬಟನ್ ಅನ್ನು ಮರೆಮಾಡುತ್ತದೆ.

const TAPS = 3;
const TAP_WINDOW_MS = 800;

export default function SecretAdminLogin() {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useAdminMode();
  const [open, setOpen] = useState(false);
  const taps = useRef<number[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isA = e.code === "KeyA" || e.key.toLowerCase() === "a";
      if (!isA) return;
      const altA = e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
      const ctrlShiftA = (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey;
      if (altA || ctrlShiftA) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onTap = (e: MouseEvent) => {
      if (!(e.target as Element | null)?.closest?.("[data-admin-tap]")) return;
      const now = Date.now();
      taps.current = [...taps.current.filter((ts) => now - ts < TAP_WINDOW_MS), now];
      if (taps.current.length >= TAPS) {
        taps.current = [];
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onTap, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onTap, true);
    };
  }, []);

  if (!open) return null;
  return (
    <AdminDialog
      isAdmin={isAdmin}
      onClose={() => setOpen(false)}
      onLoggedIn={() => {
        setIsAdmin(true);
        setOpen(false);
        if (pathname !== "/") router.push("/");
        else window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      onExit={async () => {
        await adminLogoutInline();
        setIsAdmin(false);
        setOpen(false);
      }}
      goHome={() => {
        setOpen(false);
        router.push("/");
      }}
      t={t}
    />
  );
}

function AdminDialog({
  isAdmin,
  onClose,
  onLoggedIn,
  onExit,
  goHome,
  t,
}: {
  isAdmin: boolean;
  onClose: () => void;
  onLoggedIn: () => void;
  onExit: () => Promise<void>;
  goHome: () => void;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: { error?: string; ok?: boolean; minutes?: number; remaining?: number } | null, formData: FormData) => {
    const res = await adminLoginInline(prev, formData);
    if (res?.ok) onLoggedIn();
    return res;
  }, null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("admin.dialogTitle")}
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-slate-900 w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="font-bold flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-700" /> {t("admin.dialogTitle")}
          </p>
          <button type="button" onClick={onClose} aria-label={t("photo.cancel")} className="p-1 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isAdmin ? (
          <div className="p-4 space-y-2">
            <p className="text-sm text-emerald-800 font-semibold">{t("admin.on")}</p>
            <button
              type="button"
              onClick={goHome}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl"
            >
              <Settings className="w-4 h-4" /> {t("admin.goStore")}
            </button>
            <button
              type="button"
              disabled={exiting}
              onClick={async () => {
                setExiting(true);
                await onExit();
              }}
              className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-700 hover:bg-red-50 font-semibold py-2.5 rounded-xl disabled:opacity-60"
            >
              <LogOut className="w-4 h-4" /> {t("admin.exit")}
            </button>
          </div>
        ) : (
          <form action={formAction} className="p-4 space-y-3">
            <div className="relative">
              <input
                name="password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                autoFocus
                required
                aria-label={t("admin.password")}
                placeholder={t("admin.password")}
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
            {state?.error && (
              <p role="alert" className="text-sm text-red-600">
                {state.error === "locked"
                  ? t("admin.locked", { m: state.minutes ?? 15 })
                  : state.remaining != null
                    ? t("admin.wrongLeft", { n: state.remaining })
                    : t("admin.wrong")}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl disabled:opacity-60"
            >
              {pending ? t("admin.checking") : t("admin.login")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
