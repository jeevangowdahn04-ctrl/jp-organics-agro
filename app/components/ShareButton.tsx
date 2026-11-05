"use client";

import React, { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useLanguage } from "./i18n/LanguageProvider";

// ಪ್ರಾಡಕ್ಟ್ ಲಿಂಕ್ ಹಂಚುವುದು: ಮೊಬೈಲ್‌ನಲ್ಲಿ ಫೋನ್‌ನ share ಮೆನು (WhatsApp ಇತ್ಯಾದಿ), ಇಲ್ಲದಿದ್ದರೆ ಲಿಂಕ್ ಕಾಪಿ
export default function ShareButton({ title, className = "" }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  const share = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${title} - JP Organics`, url });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return; // ಬಳಕೆದಾರ share ರದ್ದು ಮಾಡಿದರು
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("share.prompt"), url);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label={copied ? t("share.copied") : t("share.label")}
      className={`flex items-center gap-1 rounded-full bg-white/90 hover:bg-white shadow text-slate-700 text-xs font-semibold transition ${className}`}
    >
      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
      {copied && <span className="pr-1">{t("share.copied")}</span>}
    </button>
  );
}
