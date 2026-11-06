"use client";

import React, { useRef, useState } from "react";
import { Check, Link2, Loader2, Trash2, Upload } from "lucide-react";
import CategoryLogo, { setCategoryImagesCache, useCategoryImages } from "./CategoryLogo";
import { useLanguage } from "../i18n/LanguageProvider";
import { createCategoryUploadUrl, setCategoryImage } from "@/app/categories/actions";
import { supabase } from "@/lib/supabase";
import { IMAGE_TYPES, MEDIA_BUCKET } from "@/lib/media";
import { CATEGORIES, type Category, type CategoryImages } from "@/lib/categories";
import type { TranslationKey } from "@/lib/i18n";

type Result = { error?: string; images?: CategoryImages };

const ERR: Record<string, TranslationKey> = {
  auth: "catAdmin.err.auth",
  type: "catAdmin.err.type",
  size: "catAdmin.err.size",
  url: "catAdmin.err.url",
};

function Row({ cat }: { cat: Category }) {
  const { t, lang } = useLanguage();
  const current = useCategoryImages()[cat.slug];
  const fileRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState<"" | "upload" | "link" | "remove">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const apply = (res: Result) => {
    if (res.error || !res.images) {
      setMsg({ ok: false, text: t(ERR[res.error ?? ""] ?? "catAdmin.err.server") });
      return false;
    }
    setCategoryImagesCache(res.images);
    setMsg({ ok: true, text: t("catAdmin.saved") });
    return true;
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg(null);
    if (!IMAGE_TYPES.includes(file.type)) return setMsg({ ok: false, text: t("catAdmin.err.type") });
    if (file.size > 5 * 1024 * 1024) return setMsg({ ok: false, text: t("catAdmin.err.size") });
    setBusy("upload");
    try {
      const signed = (await createCategoryUploadUrl(cat.slug, { contentType: file.type, size: file.size })) as Result & {
        path?: string;
        token?: string;
        publicUrl?: string;
      };
      if (signed.error || !signed.path || !signed.token || !signed.publicUrl) return void apply(signed);
      const { error } = await supabase.storage.from(MEDIA_BUCKET).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
      if (error) return void setMsg({ ok: false, text: t("catAdmin.err.server") });
      apply((await setCategoryImage(cat.slug, signed.publicUrl)) as Result);
    } finally {
      setBusy("");
    }
  };

  const saveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!/^https:\/\/\S+$/i.test(link.trim())) return setMsg({ ok: false, text: t("catAdmin.err.url") });
    setBusy("link");
    const ok = apply((await setCategoryImage(cat.slug, link.trim())) as Result);
    setBusy("");
    if (ok) setLink("");
  };

  const remove = async () => {
    if (!window.confirm(t("catAdmin.confirmRemove"))) return;
    setMsg(null);
    setBusy("remove");
    apply((await setCategoryImage(cat.slug, null)) as Result);
    setBusy("");
  };

  const name = lang === "en" ? cat.en : cat.kn;
  return (
    <li className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
      <div className="flex items-center gap-3 sm:w-56 flex-none min-w-0">
        <CategoryLogo slug={cat.slug} name={name} className="w-14 h-14" />
        <div className="min-w-0">
          <p className="font-bold text-sm text-slate-800 truncate">{name}</p>
          <p className="text-xs text-slate-500 truncate">{lang === "en" ? cat.kn : cat.en}</p>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={!!busy}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
          >
            {busy === "upload" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {current ? t("catAdmin.change") : t("catAdmin.upload")}
          </button>
          {current && (
            <button
              type="button"
              onClick={remove}
              disabled={!!busy}
              className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
            >
              {busy === "remove" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} {t("catAdmin.remove")}
            </button>
          )}
          <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(",")} onChange={upload} className="hidden" aria-hidden="true" tabIndex={-1} />
        </div>
        <form onSubmit={saveLink} className="flex gap-2">
          <label className="relative flex-1 min-w-0">
            <span className="sr-only">{t("catAdmin.link")}</span>
            <Link2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              inputMode="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={t("catAdmin.linkPh")}
              disabled={!!busy}
              className="w-full border border-slate-300 rounded-lg pl-8 pr-2 py-2 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <button
            type="submit"
            disabled={!!busy || !link.trim()}
            className="flex-none text-xs font-semibold border border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-3 py-2 rounded-lg disabled:opacity-40"
          >
            {busy === "link" ? <Loader2 className="w-4 h-4 animate-spin" /> : t("catAdmin.saveLink")}
          </button>
        </form>
        {msg && (
          <p role="status" className={`text-xs flex items-center gap-1 ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>
            {msg.ok && <Check className="w-3.5 h-3.5" />} {msg.text}
          </p>
        )}
      </div>
    </li>
  );
}

// ಅಡ್ಮಿನ್: ಪ್ರತಿ ವರ್ಗಕ್ಕೂ ಲೋಗೋ ಅಪ್‌ಲೋಡ್ ಅಥವಾ ಇಮೇಜ್ ಲಿಂಕ್
export default function CategoryLogosManager() {
  const { t } = useLanguage();
  return (
    <section id="category-logos" className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3 sm:p-4 font-sans scroll-mt-20">
      <h3 className="font-bold text-slate-800 text-base">{t("catAdmin.title")}</h3>
      <p className="text-xs text-slate-600 mt-1 mb-3">{t("catAdmin.hint")}</p>
      <ul className="space-y-2">
        {CATEGORIES.map((c) => (
          <Row key={c.slug} cat={c} />
        ))}
      </ul>
    </section>
  );
}
