"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, MessageCircle, Package, RotateCcw } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useLanguage } from "../components/i18n/LanguageProvider";
import { clearOrders, useOrderHistory } from "@/lib/orderHistory";
import { formatRupees, WHATSAPP_NUMBER, whatsappOrderUrl } from "@/lib/whatsapp";

export default function OrdersPage() {
  const orders = useOrderHistory();
  const { t, lang } = useLanguage();

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(lang === "kn" ? "kn-IN" : "en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
      <PageHeader title={t("orders.title")} />

      <main className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 py-5 space-y-4">
        <p className="text-xs text-slate-500 bg-white border rounded-lg px-3 py-2">{t("orders.note")}</p>

        {orders.length === 0 ? (
          <div className="bg-white border rounded-2xl py-14 px-6 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
              <Package className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="font-semibold text-slate-700">{t("orders.empty")}</p>
            <p className="text-sm text-slate-500">{t("orders.emptyHint")}</p>
            <Link
              href="/"
              className="inline-block bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-5 py-2.5 rounded-full text-sm"
            >
              {t("orders.shop")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            {orders.map((order) => {
              const date = formatDate(order.createdAt);
              const count = order.lines.reduce((s, l) => s + l.quantity, 0);
              const trackUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                t("orders.trackText", { date, total: formatRupees(order.total) })
              )}`;
              return (
                <article key={order.id} className="bg-white border rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b text-xs">
                    <span className="text-slate-600">{date}</span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" /> {t("orders.status")}
                    </span>
                  </div>
                  <ul className="px-4 py-3 space-y-1.5 text-sm">
                    {order.lines.map((line, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="text-slate-800">
                          {line.name}
                          {line.weight ? <span className="text-slate-400"> ({line.weight})</span> : null}
                          <span className="text-slate-500"> × {line.quantity}</span>
                        </span>
                        <span className="font-semibold flex-none">{formatRupees(line.price * line.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-t">
                    <span className="text-sm text-slate-600">
                      {t("orders.total")} ({t("orders.itemsCount", { n: count })}):{" "}
                      <b className="text-slate-900 text-base">{formatRupees(order.total)}</b>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                    <a
                      href={trackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 border border-emerald-600 text-emerald-700 font-semibold text-xs py-2 rounded-full hover:bg-emerald-50"
                    >
                      <MessageCircle className="w-4 h-4" /> {t("orders.track")}
                    </a>
                    <a
                      href={whatsappOrderUrl(order.lines, order.customer)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs py-2 rounded-full"
                    >
                      <RotateCcw className="w-4 h-4" /> {t("orders.reorder")}
                    </a>
                  </div>
                </article>
              );
            })}
            <div className="text-center">
              <button
                type="button"
                onClick={() => window.confirm(t("orders.clearConfirm")) && clearOrders()}
                className="text-xs text-slate-500 hover:text-red-600"
              >
                {t("orders.clear")}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
