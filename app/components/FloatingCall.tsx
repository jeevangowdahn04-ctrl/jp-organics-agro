"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { useLanguage } from "./i18n/LanguageProvider";

// ಸಹಾಯವಾಣಿ: ಸ್ಕ್ರೀನ್‌ನ ಕೆಳಗಿನ ಬಲ ಮೂಲೆಯಲ್ಲಿ ತೇಲುವ ಕರೆ ಬಟನ್ (ಒತ್ತಿದರೆ ನೇರವಾಗಿ ಕರೆ).
// ಮೊಬೈಲ್: ಕೆಳಗಿನ ನ್ಯಾವಿಗೇಷನ್ ಬಾರ್ / ಪ್ರಾಡಕ್ಟ್ ಪುಟದ "ಖರೀದಿಸಿ" ಬಾರ್‌ನ ಮೇಲೆ; ಟ್ಯಾಬ್ಲೆಟ್/ಲ್ಯಾಪ್‌ಟಾಪ್: ಮೂಲೆಯಲ್ಲೇ.
// ರೀಲ್ಸ್ (ವಿಡಿಯೋ ಬಟನ್‌ಗಳು ಅಲ್ಲೇ ಇವೆ) ಮತ್ತು ಅಡ್ಮಿನ್ ಪುಟದಲ್ಲಿ ತೋರಿಸುವುದಿಲ್ಲ.
export const HELPLINE_NUMBER = "6360628048";

export default function FloatingCall() {
  const pathname = usePathname();
  const { t } = useLanguage();
  if (pathname.startsWith("/reels") || pathname.startsWith("/admin")) return null;
  // ಪ್ರಾಡಕ್ಟ್ ಪುಟದ ಕೆಳಗಿನ "ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ / ಈಗ ಖರೀದಿಸಿ" ಬಾರ್ ಎತ್ತರವಾಗಿರುವುದರಿಂದ ಅಲ್ಲಿ ಇನ್ನಷ್ಟು ಮೇಲೆ
  const mobileBottom = pathname.startsWith("/products/")
    ? "bottom-[calc(6.75rem+env(safe-area-inset-bottom))]"
    : "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]";

  return (
    <a
      href={`tel:+91${HELPLINE_NUMBER}`}
      aria-label={t("call.aria", { n: HELPLINE_NUMBER })}
      title={t("call.aria", { n: HELPLINE_NUMBER })}
      className={`group fixed z-40 right-4 ${mobileBottom} md:right-6 md:bottom-6 flex items-center gap-2 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/25 ring-4 ring-white/80 hover:bg-emerald-700 active:scale-95 transition p-3.5 lg:pr-5`}
    >
      {/* ಗಮನ ಸೆಳೆಯುವ ಮೃದುವಾದ ಅಲೆ (ಕಡಿಮೆ ಅನಿಮೇಷನ್ ಆಯ್ಕೆ ಇದ್ದರೆ ಇಲ್ಲ) */}
      <span aria-hidden="true" className="absolute inset-0 rounded-full bg-emerald-500 opacity-40 motion-safe:animate-ping [animation-duration:2.5s] pointer-events-none" />
      <Phone className="relative w-6 h-6 fill-white/20" />
      <span className="relative hidden lg:inline text-sm font-bold whitespace-nowrap">{t("call.label")}</span>
    </a>
  );
}
