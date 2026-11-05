"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutGrid, Package, User } from "lucide-react";
import { useLanguage } from "./i18n/LanguageProvider";
import { useCustomer } from "./customer/CustomerProvider";

type Tab = "home" | "categories" | "orders" | "profile";

const noopSubscribe = () => () => {};

// ಮೊಬೈಲ್ ಕೆಳಗಿನ ನ್ಯಾವಿಗೇಷನ್: ಮುಖಪುಟ | ವರ್ಗಗಳು | ನನ್ನ ಆರ್ಡರ್‌ಗಳು | ಪ್ರೊಫೈಲ್
// ಪ್ರಾಡಕ್ಟ್ ಪುಟದಲ್ಲಿ (ಅಲ್ಲಿ ಕೆಳಗೆ "ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ / ಖರೀದಿಸಿ" ಬಾರ್ ಇದೆ) ಮತ್ತು ಅಡ್ಮಿನ್‌ನಲ್ಲಿ ಮರೆಯಾಗುತ್ತದೆ.
export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { customer } = useCustomer();
  const [categoriesFor, setCategoriesFor] = useState<string | null>(null);
  // ಈ ಬಾರ್ Suspense ಒಳಗೆ ತಡವಾಗಿ hydrate ಆಗುತ್ತದೆ; ಅಷ್ಟರಲ್ಲಿ ಲಾಗಿನ್ ಮಾಹಿತಿ ಬಂದಿರಬಹುದು.
  // ಸರ್ವರ್ HTML ಜೊತೆ ಹೊಂದಲು hydration ಮುಗಿದ ನಂತರವೇ ಗ್ರಾಹಕರ ಮೊದಲಕ್ಷರ ತೋರಿಸುವುದು.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const profileInitial = hydrated && customer ? customer.name.charAt(0).toUpperCase() : null;

  if (pathname.startsWith("/products/") || pathname.startsWith("/admin")) return null;

  const active: Tab | null =
    pathname === "/orders" ? "orders"
    : pathname === "/profile" ? "profile"
    : pathname === "/" ? (categoriesFor === pathname ? "categories" : "home")
    : null;

  const goHome = (e: React.MouseEvent) => {
    setCategoriesFor(null);
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goCategories = () => {
    setCategoriesFor("/");
    if (pathname === "/") {
      document.getElementById("categories")?.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/#categories");
    }
  };

  const item = (tab: Tab) =>
    `relative flex flex-col items-center justify-center gap-0.5 py-2 px-0.5 text-[10px] min-[400px]:text-[11px] leading-tight whitespace-nowrap font-semibold transition ${
      active === tab ? "text-emerald-700" : "text-slate-500 hover:text-slate-700"
    }`;
  const indicator = (tab: Tab) =>
    active === tab ? <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full bg-emerald-600" /> : null;
  const iconClass = (tab: Tab) => `w-5 h-5 ${active === tab ? "stroke-[2.5]" : ""}`;

  return (
    <nav
      aria-label={t("nav.main")}
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t shadow-[0_-2px_10px_rgba(0,0,0,0.06)] grid grid-cols-4 pb-[env(safe-area-inset-bottom)]"
    >
      <Link href="/" onClick={goHome} aria-current={active === "home" ? "page" : undefined} className={item("home")}>
        {indicator("home")}
        <Home className={iconClass("home")} />
        {t("nav.home")}
      </Link>
      <button type="button" onClick={goCategories} aria-current={active === "categories" ? "page" : undefined} className={item("categories")}>
        {indicator("categories")}
        <LayoutGrid className={iconClass("categories")} />
        {t("nav.categories")}
      </button>
      <Link href="/orders" onClick={() => setCategoriesFor(null)} aria-current={active === "orders" ? "page" : undefined} className={item("orders")}>
        {indicator("orders")}
        <Package className={iconClass("orders")} />
        {t("nav.orders")}
      </Link>
      <Link href="/profile" onClick={() => setCategoriesFor(null)} aria-current={active === "profile" ? "page" : undefined} className={item("profile")}>
        {indicator("profile")}
        {hydrated && customer?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={customer.avatar}
            alt=""
            className={`w-5 h-5 rounded-full object-cover ${active === "profile" ? "ring-2 ring-emerald-600" : ""}`}
          />
        ) : profileInitial ? (
          <span
            className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
              active === "profile" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            {profileInitial}
          </span>
        ) : (
          <User className={iconClass("profile")} />
        )}
        {t("nav.profile")}
      </Link>
    </nav>
  );
}
