"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Home, LayoutGrid, Package, Search, Sprout, User } from "lucide-react";
import { useLanguage } from "./i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

// ಟ್ಯಾಬ್ಲೆಟ್ / ಲ್ಯಾಪ್‌ಟಾಪ್ ಮೆನು (md ಮತ್ತು ಮೇಲ್ಪಟ್ಟು). ಮೊಬೈಲ್‌ನಲ್ಲಿ ಇದರ ಬದಲು ಕೆಳಗಿನ BottomNav.
const LINKS: { href: string; label: TranslationKey; short?: TranslationKey; icon: React.ComponentType<{ className?: string }>; match: (p: string) => boolean }[] = [
  { href: "/", label: "nav.home", icon: Home, match: (p) => p === "/" },
  { href: "/#categories", label: "nav.categories", icon: LayoutGrid, match: () => false },
  { href: "/stories", label: "nav.stories", icon: Sprout, match: (p) => p.startsWith("/stories") },
  { href: "/search", label: "nav.search", icon: Search, match: (p) => p.startsWith("/search") || p.startsWith("/farmer") },
  { href: "/reels", label: "nav.reels", icon: Clapperboard, match: (p) => p.startsWith("/reels") },
  { href: "/orders", label: "nav.orders", short: "nav.ordersShort", icon: Package, match: (p) => p.startsWith("/orders") },
  { href: "/profile", label: "nav.profile", icon: User, match: (p) => p.startsWith("/profile") },
];

function Links({ pathname, dark }: { pathname: string | null; dark: boolean }) {
  const { t } = useLanguage();
  return (
    <ul className="flex items-center gap-0.5 lg:gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {LINKS.map(({ href, label, short, icon: Icon, match }) => {
        const active = pathname !== null && match(pathname);
        const tone = dark
          ? active
            ? "bg-white/15 text-white"
            : "text-emerald-100 hover:bg-white/10 hover:text-white"
          : active
            ? "bg-emerald-50 text-emerald-800"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
        return (
          <li key={href} className="flex-none">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 lg:px-3 py-1.5 text-[13px] lg:text-sm font-semibold transition ${tone}`}
            >
              {/* ಟ್ಯಾಬ್ಲೆಟ್‌ನಲ್ಲಿ ಜಾಗ ಉಳಿಸಲು ಐಕಾನ್ ಇಲ್ಲ, ಚಿಕ್ಕ ಹೆಸರು */}
              <Icon className="w-4 h-4 hidden lg:block" />
              <span className="lg:hidden">{t(short ?? label)}</span>
              <span className="hidden lg:inline">{t(label)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function WithPath({ dark }: { dark: boolean }) {
  return <Links pathname={usePathname()} dark={dark} />;
}

export default function SiteNav({ dark = false }: { dark?: boolean }) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t("nav.main")} className={`hidden md:block border-t ${dark ? "border-white/10" : "border-slate-100"}`}>
      <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 py-1.5">
        {/* usePathname ಡೈನಾಮಿಕ್ ಪುಟಗಳಲ್ಲಿ Suspense ಒಳಗೆ ಇರಬೇಕು (cacheComponents) */}
        <Suspense fallback={<Links pathname={null} dark={dark} />}>
          <WithPath dark={dark} />
        </Suspense>
      </div>
    </nav>
  );
}
