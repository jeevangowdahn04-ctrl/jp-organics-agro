"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Camera, Image as ImageIcon, Sprout, Trash2, Check, CheckCircle2, ChevronRight, Loader2, LogOut, MapPin, MessageCircle, Package, Pencil, Phone, User } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useLanguage } from "../components/i18n/LanguageProvider";
import { PHONE_PATTERN, useCustomer, type Customer } from "../components/customer/CustomerProvider";
import { LANGS, type TranslationKey } from "@/lib/i18n";
import { WHATSAPP_NUMBER } from "@/lib/whatsapp";
import { useOrderHistory } from "@/lib/orderHistory";
import { ADDRESS_FIELDS, EMPTY_ADDRESS, PINCODE_PATTERN, type DeliveryAddress } from "@/lib/address";
import { lookupPincode } from "@/lib/pincode";
import Avatar from "../components/customer/Avatar";
import AvatarEditor from "../components/customer/AvatarEditor";
import ProfileView from "../components/community/ProfileView";
import { syncProfile } from "../community/actions";
import { communityError } from "@/lib/community";

const formatPhone = (p: string) => `+91 ${p.slice(0, 5)} ${p.slice(5)}`;

const FIELD_LABELS: Record<keyof DeliveryAddress, { label: TranslationKey; ph: TranslationKey }> = {
  village: { label: "address.village", ph: "address.villagePh" },
  post: { label: "address.post", ph: "address.postPh" },
  hobli: { label: "address.hobli", ph: "address.hobliPh" },
  taluk: { label: "address.taluk", ph: "address.talukPh" },
  district: { label: "address.district", ph: "address.districtPh" },
  state: { label: "address.state", ph: "address.statePh" },
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
  // ಪಿನ್‌ಕೋಡ್ ಆಟೋ-ಫಿಲ್
  const [pinStatus, setPinStatus] = useState<"idle" | "searching" | "ok" | "invalid" | "error">("idle");
  const [postOffices, setPostOffices] = useState<string[]>([]);
  const [postManual, setPostManual] = useState(false);
  const [foundPlace, setFoundPlace] = useState("");
  const lookupRef = useRef<AbortController | null>(null);

  const runLookup = async (pin: string) => {
    lookupRef.current?.abort();
    const controller = new AbortController();
    lookupRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    setPinStatus("searching");
    try {
      const result = await lookupPincode(pin, controller.signal);
      if (result.status !== "ok") {
        setPinStatus(result.status);
        setPostOffices([]);
        return;
      }
      setPinStatus("ok");
      setPostOffices(result.postOffices);
      setFoundPlace([result.taluk, result.district, result.state].filter(Boolean).join(", "));
      setAddress((prev) => ({
        ...prev,
        taluk: result.taluk || prev.taluk,
        district: result.district || prev.district,
        state: result.state || prev.state,
        post: result.postOffices.includes(prev.post) ? prev.post : result.postOffices.length === 1 ? result.postOffices[0] : "",
      }));
      setPostManual(false);
    } catch {
      // ಹೊಸ ಪಿನ್‌ಕೋಡ್ ಟೈಪ್ ಆದಾಗ ಹಳೆಯ ಹುಡುಕಾಟ ರದ್ದು, ಅಥವಾ ಸಮಯ ಮೀರಿತು
      if (lookupRef.current === controller) setPinStatus("error");
    } finally {
      clearTimeout(timeout);
    }
  };

  // ಈಗಾಗಲೇ ಉಳಿಸಿದ ಪಿನ್‌ಕೋಡ್ ಇದ್ದರೆ ಅಂಚೆ ಕಚೇರಿ ಪಟ್ಟಿಯನ್ನು ಮಾತ್ರ ತರುವುದು (ಫೀಲ್ಡ್‌ಗಳನ್ನು ಬದಲಿಸದೆ)
  useEffect(() => {
    const pin = initial?.address?.pincode;
    const savedPost = initial?.address?.post ?? "";
    if (!pin || !PINCODE_PATTERN.test(pin)) return;
    const controller = new AbortController();
    lookupPincode(pin, controller.signal)
      .then((result) => {
        if (result.status !== "ok") return;
        setPinStatus("ok");
        setPostOffices(result.postOffices);
        setFoundPlace([result.taluk, result.district, result.state].filter(Boolean).join(", "));
        // ಉಳಿಸಿದ ಅಂಚೆ ಕಚೇರಿ ಪಟ್ಟಿಯಲ್ಲಿ ಇಲ್ಲದಿದ್ದರೆ ಅದನ್ನು ಬರೆದ ಹಾಗೆಯೇ ತೋರಿಸುವುದು
        setPostManual(savedPost !== "" && !result.postOffices.includes(savedPost));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [initial]);

  const onPincodeChange = (value: string) => {
    const pin = value.replace(/\D/g, "").slice(0, 6);
    setAddress((prev) => ({ ...prev, pincode: pin }));
    setError("");
    if (pin.length < 6) {
      lookupRef.current?.abort();
      setPinStatus("idle");
      setPostOffices([]);
      return;
    }
    if (!PINCODE_PATTERN.test(pin)) {
      setPinStatus("invalid");
      setPostOffices([]);
      return;
    }
    runLookup(pin);
  };

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
        {/* ಪಿನ್‌ಕೋಡ್ ಮೊದಲು: ಹಾಕಿದ ತಕ್ಷಣ ಉಳಿದ ವಿವರಗಳು ತಾನಾಗೇ ತುಂಬುತ್ತವೆ */}
        <div>
          <label htmlFor="pf-pincode" className="block text-xs font-semibold text-slate-600 mb-1">{t(FIELD_LABELS.pincode.label)}</label>
          <div className="relative max-w-[220px]">
            <input
              id="pf-pincode"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              value={address.pincode}
              onChange={(e) => onPincodeChange(e.target.value)}
              placeholder={t(FIELD_LABELS.pincode.ph)}
              aria-describedby="pf-pincode-status"
              aria-invalid={pinStatus === "invalid"}
              className={`${inputClass} tracking-widest pr-9 ${pinStatus === "invalid" ? "border-red-400" : ""}`}
            />
            {pinStatus === "searching" && <Loader2 className="w-4 h-4 animate-spin text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />}
            {pinStatus === "ok" && <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />}
          </div>
          <p id="pf-pincode-status" aria-live="polite" className="mt-1 text-xs">
            {pinStatus === "searching" && <span className="text-emerald-700">{t("pincode.searching")}</span>}
            {pinStatus === "invalid" && (
              <span className="text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {t("pincode.invalid")}
              </span>
            )}
            {pinStatus === "error" && <span className="text-amber-700">{t("pincode.error")}</span>}
            {pinStatus === "ok" && <span className="text-emerald-700">{t("pincode.found", { place: foundPlace, n: postOffices.length })}</span>}
            {pinStatus === "idle" && <span className="text-slate-500">{t("pincode.hint")}</span>}
          </p>
        </div>
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
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="pf-post" className="block text-xs font-semibold text-slate-600 mb-1">{t(FIELD_LABELS.post.label)}</label>
            {postOffices.length > 0 && !postManual ? (
              <select
                id="pf-post"
                value={postOffices.includes(address.post) ? address.post : ""}
                onChange={(e) => {
                  if (e.target.value === "__other__") {
                    setPostManual(true);
                    return;
                  }
                  setAddress({ ...address, post: e.target.value });
                  setError("");
                }}
                className={`${inputClass} bg-white`}
              >
                <option value="" disabled>{t("address.postSelect")}</option>
                {postOffices.map((po) => (
                  <option key={po} value={po}>{po}</option>
                ))}
                <option value="__other__">{t("address.postOther")}</option>
              </select>
            ) : (
              <>
                <input
                  id="pf-post"
                  value={address.post}
                  onChange={(e) => { setAddress({ ...address, post: e.target.value }); setError(""); }}
                  placeholder={t(FIELD_LABELS.post.ph)}
                  className={inputClass}
                />
                {postOffices.length > 0 && (
                  <button type="button" onClick={() => setPostManual(false)} className="mt-1 text-xs font-semibold text-emerald-700 hover:underline">
                    {t("address.postList")}
                  </button>
                )}
              </>
            )}
          </div>
          {(["hobli", "taluk", "district", "state"] as const).map((f) => (
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

// ಪ್ರೊಫೈಲ್ ಫೋಟೋ: ಕ್ಯಾಮೆರಾ ಬಟನ್ ಒತ್ತಿದರೆ ಫೋನ್‌ನ ಕ್ಯಾಮೆರಾ / ಗ್ಯಾಲರಿ ಆಯ್ಕೆ; ಚಿಕ್ಕದಾಗಿಸಿ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಉಳಿಸುವುದು
// ಪ್ರೊಫೈಲ್ ಫೋಟೋ: ಪೆನ್ಸಿಲ್ ಒತ್ತಿದರೆ ಬದಲಾಯಿಸಿ / ಕ್ಯಾಮೆರಾ / ತೆಗೆದುಹಾಕಿ ಮೆನು; ಹೊಸ ಫೋಟೋ ಎಡಿಟರ್‌ನಲ್ಲಿ ಕ್ರಾಪ್ ಆಗುತ್ತದೆ
function ProfilePhoto({ customer, onChange }: { customer: Customer; onChange: (avatar: string | null) => void }) {
  const { t } = useLanguage();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState<File | null>(null);
  const [error, setError] = useState("");

  // ಮೆನುವಿನ ಹೊರಗೆ ಒತ್ತಿದರೆ ಮುಚ್ಚುವುದು
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menu]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError(t("photo.error"));
    setError("");
    setEditing(file);
  };

  const choose = (ref: React.RefObject<HTMLInputElement | null>) => {
    setMenu(false);
    ref.current?.click();
  };

  const item = "w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-slate-50";

  return (
    <div className="flex-none flex flex-col items-center gap-1">
      <div className="relative" ref={menuRef}>
        <button type="button" onClick={() => setMenu((m) => !m)} aria-label={t("photo.edit")} aria-expanded={menu} className="block rounded-full">
          <Avatar customer={customer} className="w-16 h-16 text-2xl" />
        </button>
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-label={t("photo.edit")}
          aria-expanded={menu}
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-600 border-2 border-white shadow flex items-center justify-center text-white hover:bg-emerald-700"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {menu && (
          <div role="menu" className="absolute left-0 top-full mt-2 z-30 bg-white border rounded-xl shadow-xl overflow-hidden min-w-52">
            <button type="button" role="menuitem" onClick={() => choose(galleryRef)} className={item}>
              <ImageIcon className="w-4 h-4 text-emerald-700" /> {customer.avatar ? t("photo.changeShort") : t("photo.add")}
            </button>
            <button type="button" role="menuitem" onClick={() => choose(cameraRef)} className={item}>
              <Camera className="w-4 h-4 text-emerald-700" /> {t("photo.camera")}
            </button>
            {customer.avatar && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  if (window.confirm(t("photo.confirmRemove"))) onChange(null);
                }}
                className={`${item} text-red-600 hover:bg-red-50`}
              >
                <Trash2 className="w-4 h-4" /> {t("photo.remove")}
              </button>
            )}
          </div>
        )}
        <input ref={galleryRef} type="file" accept="image/*" onChange={pick} className="hidden" aria-hidden="true" tabIndex={-1} />
        <input ref={cameraRef} type="file" accept="image/*" capture="user" onChange={pick} className="hidden" aria-hidden="true" tabIndex={-1} />
      </div>
      {error && <p className="text-[10px] text-red-600 max-w-20 text-center">{error}</p>}
      {editing && (
        <AvatarEditor
          file={editing}
          onCancel={() => setEditing(null)}
          onSave={(dataUrl) => {
            setEditing(null);
            onChange(dataUrl);
          }}
        />
      )}
    </div>
  );
}

// ಸಮುದಾಯ ಪ್ರೊಫೈಲ್: ಗ್ರಾಹಕರ ಹೆಸರು/ಊರು/ಫೋಟೋವನ್ನು ಸಮುದಾಯಕ್ಕೆ ಹೊಂದಿಸಿ, ಪೋಸ್ಟ್/ರೀಲ್ಸ್/ಫ್ರೆಂಡ್ಸ್ ತೋರಿಸುವುದು
function MyCommunity({ customer }: { customer: Customer }) {
  const { t } = useLanguage();
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const village = [customer.address?.village, customer.address?.taluk].filter(Boolean).join(", ");
  const avatar = customer.avatar ?? null;

  useEffect(() => {
    let active = true;
    syncProfile({ name: customer.name, phone: customer.phone, village, avatar }).then((res) => {
      if (!active) return;
      const r = res as { id?: string; error?: string };
      if (r.id) setId(r.id);
      else setError(t(communityError(r.error)));
    });
    return () => {
      active = false;
    };
  }, [customer.name, customer.phone, village, avatar, t]);

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 px-1">
        <Sprout className="w-4 h-4 text-emerald-700" /> {t("community.title")}
        {id && (
          <Link href={`/farmer/${id}`} aria-label={t("community.title")} className="ml-auto text-emerald-700 hover:text-emerald-900">
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </h2>
      {error ? (
        <p className="bg-white border rounded-2xl p-5 text-sm text-slate-500">{error}</p>
      ) : id ? (
        <ProfileView key={id} id={id} embedded />
      ) : (
        <p className="bg-white border rounded-2xl p-8 text-center">
          <Loader2 className="w-5 h-5 animate-spin inline text-emerald-700" />
        </p>
      )}
    </div>
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
                <ProfilePhoto customer={customer} onChange={(avatar) => saveProfile({ ...customer, avatar })} />
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

        {customer ? (
          <MyCommunity customer={customer} />
        ) : (
          <p className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-2xl px-5 py-4 flex items-center gap-2">
            <Sprout className="w-5 h-5 flex-none" /> {t("community.loginToJoin")}
          </p>
        )}

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

          <Link href="/stories" className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50">
            <Sprout className="w-5 h-5 text-emerald-700" />
            <span className="flex-1 font-semibold">{t("nav.stories")}</span>
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
