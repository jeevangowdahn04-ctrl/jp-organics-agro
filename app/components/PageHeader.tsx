"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CartButton from "./cart/CartButton";
import LanguageSwitcher from "./i18n/LanguageSwitcher";

// ಆರ್ಡರ್‌ಗಳು / ಪ್ರೊಫೈಲ್ ಪುಟಗಳ ಸರಳ ಹೆಡರ್
export default function PageHeader({ title }: { title: string }) {
  return (
    <header className="bg-emerald-900 text-white sticky top-0 z-40 shadow">
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <Link href="/" aria-label="JP Organics" className="flex items-center gap-2 font-semibold hover:text-emerald-200 min-w-0">
          <ArrowLeft className="w-5 h-5 flex-none" />
          <span className="truncate">{title}</span>
        </Link>
        <div className="flex items-center gap-2 flex-none">
          <LanguageSwitcher dark />
          <CartButton className="bg-white/10 hover:bg-white/20 [&_svg]:text-white" />
        </div>
      </div>
    </header>
  );
}
