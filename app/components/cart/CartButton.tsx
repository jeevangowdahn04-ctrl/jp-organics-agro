"use client";

import React from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./CartProvider";

// ಹೆಡರ್‌ನ ಕಾರ್ಟ್ ಐಕಾನ್ ಮತ್ತು ವಸ್ತುಗಳ ಸಂಖ್ಯೆಯ ಬ್ಯಾಡ್ಜ್
export default function CartButton({ className = "" }: { className?: string }) {
  const { count, openCart } = useCart();
  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`ಕಾರ್ಟ್ ತೆರೆಯಿರಿ (${count} ವಸ್ತು)`}
      className={`relative w-10 h-10 rounded-full bg-slate-100 hover:bg-emerald-50 flex items-center justify-center transition ${className}`}
    >
      <ShoppingCart className="w-5 h-5 text-slate-700" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-amber-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
