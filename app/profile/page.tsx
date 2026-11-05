"use client";

import React from "react";
import Link from "next/link";
import { Check, ChevronRight, LogOut, MessageCircle, Package, Phone, User } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useLanguage } from "../components/i18n/LanguageProvider";
import { useCustomer } from "../components/customer/CustomerProvider";
import { LANGS } from "@/lib/i18n";
import { WHATSAPP_NUMBER } from "@/lib/whatsapp";
import { useOrderHistory } from "@/lib/orderHistory";

const formatPhone = (p: string) => `+91 ${p.slice(0, 5)} ${p.slice(5)}`;

export default function ProfilePage() {
  const { t, lang, setLang } = useLanguage();
  const { customer, openLogin, logout } = useCustomer();
  const orders = useOrderHistory();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-8">
      <PageHeader title={t("profile.title")} />

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* ಗ್ರಾಹಕರ ವಿವರ */}
        <section className="bg-white border rounded-2xl p-5">
          {customer ? (
            <div className="flex items-center gap-4">
              <span className="w-14 h-14 rounded-full bg-emerald-600 text-white text-2xl font-bold flex items-center justify-center flex-none">
                {customer.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-lg font-bold truncate">{customer.name}</p>
                <p className="text-sm text-slate-600 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="sr-only">{t("profile.mobile")}:</span> {formatPhone(customer.phone)}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3 py-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center">
                <User className="w-7 h-7 text-slate-500" />
              </div>
              <p className="font-semibold">{t("profile.guest")}</p>
              <p className="text-sm text-slate-500">{t("profile.guestHint")}</p>
              <button
                type="button"
                onClick={openLogin}
                className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-6 py-2.5 rounded-full text-sm"
              >
                {t("login.button")}
              </button>
            </div>
          )}
        </section>

        {/* ಆಯ್ಕೆಗಳು */}
        <section className="bg-white border rounded-2xl divide-y">
          <Link href="/orders" className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50">
            <Package className="w-5 h-5 text-emerald-700" />
            <span className="flex-1 font-semibold">{t("nav.orders")}</span>
            {orders.length > 0 && (
              <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{orders.length}</span>
            )}
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

          <div className="px-5 py-4">
            <p className="font-semibold mb-2">{t("profile.language")}</p>
            <div className="grid grid-cols-2 gap-2">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-semibold ${
                    lang === l.code ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
                  }`}
                >
                  {lang === l.code && <Check className="w-4 h-4" />} {l.label}
                </button>
              ))}
            </div>
          </div>

          <a href="tel:7795198610" className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50">
            <Phone className="w-5 h-5 text-emerald-700" />
            <span className="flex-1 font-semibold">{t("profile.help")}</span>
            <span className="text-sm text-slate-500">7795198610</span>
          </a>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t("hero.whatsappText"))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50"
          >
            <MessageCircle className="w-5 h-5 text-emerald-700" />
            <span className="flex-1 font-semibold">{t("profile.whatsapp")}</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </a>

          {customer && (
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-3 px-5 py-4 text-red-600 font-semibold hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" /> {t("profile.logout")}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
