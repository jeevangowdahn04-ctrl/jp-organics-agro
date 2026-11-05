"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, ChevronRight, LogOut, MapPin, MessageCircle, Package, Pencil, Phone, User } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useLanguage } from "../components/i18n/LanguageProvider";
import { PHONE_PATTERN, useCustomer, type Customer } from "../components/customer/CustomerProvider";
import { LANGS, type TranslationKey } from "@/lib/i18n";
import { WHATSAPP_NUMBER } from "@/lib/whatsapp";
import { useOrderHistory } from "@/lib/orderHistory";
import { ADDRESS_FIELDS, EMPTY_ADDRESS, PINCODE_PATTERN, type DeliveryAddress } from "@/lib/address";

const formatPhone = (p: string) => `+91 ${p.slice(0, 5)} ${p.slice(5)}`;

const FIELD_LABELS: Record<keyof DeliveryAddress, { label: TranslationKey; ph: TranslationKey }> = {
  village: { label: "address.village", ph: "address.villagePh" },
  post: { label: "address.post", ph: "address.postPh" },
  hobli: { label: "address.hobli", ph: "address.hobliPh" },
  taluk: { label: "address.taluk", ph: "address.talukPh" },
  district: { label: "address.district", ph: "address.districtPh" },
  pincode: { label: "address.pincode", ph: "address.pincodePh" },
};

const inputClass =
  "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

// ಹೆಸರು, ಮೊಬೈಲ್ ಮತ್ತು ವಿಳಾಸದ ಫಾರ್ಮ್ (ಲಾಗಿನ್ ಆಗಿರದಿದ್ದರೆ ಇದೇ ಲಾಗಿನ್)
function ProfileForm({ initial, onSave, onCancel }: { initial: Customer | null; onSave: (c: Customer) => void; onCancel?: () => void }) {
  const { t } = useLanguage();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState<DeliveryAddress>({ ...EMPTY_ADDRESS, ...(initial?.address ?? {}) });
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, " ");
    const cleanPhone = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    const cleanAddr = Object.fromEntries(ADDRESS_FIELDS.map((f) => [f, address[f].trim()])) as unknown as DeliveryAddress;
    const hasAddress = ADDRESS_FIELDS.some((f) => cleanAddr[f]);

    if (cleanName.length < 2) return setError(t("login.errName"));
    if (!PHONE_PATTERN.test(cleanPhone)) return setError(t("login.errPhone"));
    if (hasAddress && !cleanAddr.village) return setError(t("profile.errVillage"));
    if (cleanAddr.pincode && !PINCODE_PATTERN.test(cleanAddr.pincode)) return setError(t("profile.errPincode"));

    onSave({ name: cleanName.slice(0, 60), phone: cleanPhone, address: hasAddress ? cleanAddr : null });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="pf-name" className="block text-xs font-semibold text-slate-600 mb-1">{t("profile.fullName")}</label>
          <input id="pf-name" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder={t("profile.fullNamePh")} className={inputClass} />
        </div>
        <div>
          <label htmlFor="pf-phone" className="block text-xs font-semibold text-slate-600 mb-1">{t("profile.mobile")}</label>
          <div className="flex items-center border border-slate-300 rounded-lg focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
            <span className="pl-3 pr-2 text-sm font-semibold text-slate-700 border-r border-slate-200">+91</span>
            <input
              id="pf-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={14}
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/[^\d\s]/g, "")); setError(""); }}
              placeholder="98765 43210"
              className="flex-1 px-3 py-2.5 rounded-lg outline-none text-sm tracking-wide"
            />
          </div>
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-1">
          <MapPin className="w-4 h-4 text-emerald-700" /> {t("profile.address")}
        </legend>
        <div>
          <label htmlFor="pf-village" className="block text-xs font-semibold text-slate-600 mb-1">{t(FIELD_LABELS.village.label)}</label>
          <textarea
            id="pf-village"
            rows={2}
            autoComplete="street-address"
            value={address.village}
            onChange={(e) => { setAddress({ ...address, village: e.target.value }); setError(""); }}
            placeholder={t(FIELD_LABELS.village.ph)}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["post", "hobli", "taluk", "district"] as const).map((f) => (
            <div key={f}>
              <label htmlFor={`pf-${f}`} className="block text-xs font-semibold text-slate-600 mb-1">{t(FIELD_LABELS[f].label)}</label>
              <input
                id={`pf-${f}`}
                value={address[f]}
                onChange={(e) => { setAddress({ ...address, [f]: e.target.value }); setError(""); }}
                placeholder={t(FIELD_LABELS[f].ph)}
                className={inputClass}
              />
            </div>
          ))}
          <div>
            <label htmlFor="pf-pincode" className="block text-xs font-semibold text-slate-600 mb-1">{t(FIELD_LABELS.pincode.label)}</label>
            <input
              id="pf-pincode"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              value={address.pincode}
              onChange={(e) => { setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "") }); setError(""); }}
              placeholder={t(FIELD_LABELS.pincode.ph)}
              className={`${inputClass} tracking-widest`}
            />
          </div>
        </div>
      </fieldset>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" className="flex-1 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-900 font-bold py-3 rounded-full transition shadow-sm">
          {t("profile.save")}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-5 py-3 rounded-full border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">
            {t("profile.cancel")}
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-500 text-center">{t("profile.storageNote")}</p>
    </form>
  );
}

export default function ProfilePage() {
  const { t, lang, setLang } = useLanguage();
  const { customer, saveProfile, logout } = useCustomer();
  const orders = useOrderHistory();
  const [editing, setEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const save = (c: Customer) => {
    saveProfile(c);
    setEditing(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 4000);
  };

  const address = customer?.address;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-8">
      <PageHeader title={t("profile.title")} />

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {justSaved && (
          <p role="status" className="flex items-start gap-2 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 flex-none" /> {t("profile.saved")}
          </p>
        )}

        {/* ಗ್ರಾಹಕರ ವಿವರ ಮತ್ತು ವಿಳಾಸ */}
        <section className="bg-white border rounded-2xl p-5">
          {!customer || editing ? (
            <>
              {!customer && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center flex-none">
                    <User className="w-6 h-6 text-slate-500" />
                  </span>
                  <div>
                    <p className="font-semibold">{t("profile.guest")}</p>
                    <p className="text-xs text-slate-500">{t("profile.guestHint")}</p>
                  </div>
                </div>
              )}
              <ProfileForm initial={customer} onSave={save} onCancel={customer ? () => setEditing(false) : undefined} />
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="w-14 h-14 rounded-full bg-emerald-600 text-white text-2xl font-bold flex items-center justify-center flex-none">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold truncate">{customer.name}</p>
                  <p className="text-sm text-slate-600 flex items-center gap-1 whitespace-nowrap">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="sr-only">{t("profile.mobile")}:</span> {formatPhone(customer.phone)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex-none flex items-center gap-1 text-sm font-semibold text-emerald-700 border border-emerald-600 rounded-full px-3 py-1.5 hover:bg-emerald-50"
                >
                  <Pencil className="w-3.5 h-3.5" /> {t("profile.edit")}
                </button>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-bold flex items-center gap-1.5 mb-2">
                  <MapPin className="w-4 h-4 text-emerald-700" /> {t("profile.address")}
                </p>
                {address ? (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                    {ADDRESS_FIELDS.filter((f) => address[f]).map((f) => (
                      <React.Fragment key={f}>
                        <dt className="text-slate-500">{t(FIELD_LABELS[f].label)}</dt>
                        <dd className="text-slate-900 font-medium break-words">{address[f]}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                ) : (
                  <div className="text-sm text-slate-500 space-y-2">
                    <p>{t("profile.noAddress")}</p>
                    <button type="button" onClick={() => setEditing(true)} className="font-semibold text-emerald-700 hover:underline">
                      + {t("profile.addAddress")}
                    </button>
                  </div>
                )}
              </div>
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
              onClick={() => {
                setEditing(false);
                logout();
              }}
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
