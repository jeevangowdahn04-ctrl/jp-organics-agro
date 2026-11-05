"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { MessageCircle, Minus, Plus, ShoppingCart, Sprout, Trash2, X } from "lucide-react";
import { formatRupees, whatsappOrderUrl } from "@/lib/whatsapp";
import { MAX_QUANTITY, useCart } from "./CartProvider";
import { useCustomer } from "../customer/CustomerProvider";
import { useLanguage } from "../i18n/LanguageProvider";
import { saveOrder } from "@/lib/orderHistory";

// ಬಲಭಾಗದಿಂದ ಜಾರಿ ಬರುವ ಕಾರ್ಟ್ ಪ್ಯಾನೆಲ್
export default function CartDrawer() {
  const { items, count, total, isOpen, closeCart, setQuantity, removeItem, clearCart } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, closeCart]);

  const { requireLogin } = useCustomer();
  const { t, lang } = useLanguage();
  // ಆಯ್ಕೆ ಮಾಡಿದ ಭಾಷೆಯ ಹೆಸರು; ಇಲ್ಲದಿದ್ದರೆ ಇನ್ನೊಂದು
  const nameOf = (i: { name: string; nameEn?: string | null }) => (lang === "en" ? i.nameEn?.trim() || i.name : i.name || i.nameEn || "");
  const orderViaWhatsApp = () =>
    requireLogin((customer) => {
      const lines = items.map((i) => ({ name: nameOf(i), price: i.price, quantity: i.quantity, weight: i.weight }));
      window.open(whatsappOrderUrl(lines, customer), "_blank", "noopener,noreferrer");
      saveOrder(lines, customer);
    }, t("login.reasonOrder"));

  return (
    <div className={`fixed inset-0 z-[90] ${isOpen ? "" : "pointer-events-none"}`} aria-hidden={!isOpen}>
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("cart.title")}
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" /> {t("cart.title")}
            <span className="text-sm font-semibold text-slate-500">{t("cart.items", { n: count })}</span>
          </h2>
          <button onClick={closeCart} aria-label={t("cart.close")} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="font-semibold text-slate-700">{t("cart.empty")}</p>
            <p className="text-sm text-slate-500">{t("cart.emptyHint")}</p>
            <button onClick={closeCart} className="mt-2 text-sm font-semibold text-emerald-700 hover:underline">
              {t("cart.continue")} →
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto divide-y px-5">
              {items.map((item) => (
                <li key={item.id} className="py-4 flex gap-3">
                  <Link
                    href={`/products/${item.id}`}
                    onClick={closeCart}
                    className="flex-none w-20 h-20 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center"
                  >
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={nameOf(item)} className="w-full h-full object-cover" />
                    ) : (
                      <Sprout className="w-8 h-8 text-emerald-500" />
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.id}`}
                      onClick={closeCart}
                      className="font-semibold text-sm text-slate-900 line-clamp-2 hover:text-emerald-700"
                    >
                      {nameOf(item)}
                    </Link>
                    {item.weight && <p className="text-xs text-slate-500">{item.weight}</p>}
                    <p className="text-sm font-bold text-slate-900 mt-1">{formatRupees(item.price)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-slate-300 rounded-full overflow-hidden">
                        <button
                          onClick={() => (item.quantity <= 1 ? removeItem(item.id) : setQuantity(item.id, item.quantity - 1))}
                          aria-label={item.quantity <= 1 ? t("cart.remove", { name: nameOf(item) }) : t("detail.qtyLess")}
                          className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 text-slate-700"
                        >
                          {item.quantity <= 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        </button>
                        <span className="w-8 text-center text-sm font-bold" aria-label={t("cart.qty")}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= MAX_QUANTITY}
                          aria-label={t("detail.qtyMore")}
                          className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 text-slate-700 disabled:opacity-40"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-emerald-700">{formatRupees(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t px-5 py-4 space-y-3 bg-slate-50">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-slate-600">{t("cart.total", { n: count })}</span>
                <span className="text-xl font-extrabold text-slate-900">{formatRupees(total)}</span>
              </div>
              <button
                type="button"
                onClick={orderViaWhatsApp}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 transition shadow"
              >
                <MessageCircle className="w-5 h-5" /> {t("cart.order")}
              </button>
              <div className="flex justify-between text-xs">
                <button onClick={closeCart} className="font-semibold text-emerald-700 hover:underline">
                  ← {t("cart.continue")}
                </button>
                <button
                  onClick={() => window.confirm(t("cart.clearConfirm")) && clearCart()}
                  className="text-slate-500 hover:text-red-600"
                >
                  {t("cart.clear")}
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
