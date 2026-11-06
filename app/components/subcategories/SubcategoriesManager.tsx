"use client";

import React, { useRef, useState } from "react";
import { BadgeCheck, Link2, Loader2, PackagePlus, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import CategoryLogo from "../categories/CategoryLogo";
import { refreshSubcategories, SubLogo, useSubcategories, type Subcategory } from "./useSubcategories";
import { createSubcategoryUploadUrl, deleteSubcategory, discardSubcategoryLogo, saveSubcategory } from "@/app/subcategories/actions";
import { supabase } from "@/lib/supabase";
import { IMAGE_TYPES, MEDIA_BUCKET, getProductImages } from "@/lib/media";
import { CATEGORIES, categoryOf, type CategorySlug } from "@/lib/categories";

type Result = { error?: string; ok?: boolean };

export interface SubAdminProduct {
  id: number;
  name: string;
  price?: number | string | null;
  category?: string | null;
  category_en?: string | null;
  subcategory_id?: number | null;
  image_url?: string | null;
  image_urls?: string[] | null;
}

const ERR: Record<string, string> = {
  auth: "ಅಡ್ಮಿನ್ ಲಾಗಿನ್ ಅವಧಿ ಮುಗಿದಿದೆ. ಮತ್ತೆ ಲಾಗಿನ್ ಆಗಿ.",
  name: "ಉಪವರ್ಗದ ಹೆಸರು (ಕನ್ನಡ) ನಮೂದಿಸಿ.",
  url: "https:// ನಿಂದ ಆರಂಭವಾಗುವ ಸರಿಯಾದ ಇಮೇಜ್ ಲಿಂಕ್ ಹಾಕಿ.",
  type: "PNG, JPG, WebP ಅಥವಾ GIF ಫೋಟೋ ಮಾತ್ರ.",
  size: "ಲೋಗೋ 5MB ಒಳಗಿರಬೇಕು.",
  duplicate: "ಈ ವರ್ಗದಲ್ಲಿ ಈ ಹೆಸರಿನ ಉಪವರ್ಗ ಈಗಾಗಲೇ ಇದೆ.",
  table: "ಉಪವರ್ಗ ಟೇಬಲ್ ಇನ್ನೂ ಇಲ್ಲ: supabase/subcategories.sql ರನ್ ಮಾಡಿ.",
  missing: "ಈ ಉಪವರ್ಗ ಸಿಗಲಿಲ್ಲ (ಬಹುಶಃ ಅಳಿಸಲಾಗಿದೆ).",
  category: "ವರ್ಗ ಸರಿಯಿಲ್ಲ.",
};
const errText = (code?: string) => ERR[code ?? ""] ?? "ಉಳಿಸಲು ಆಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.";
const input =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 bg-white";

// ಅಡ್ಮಿನ್: ಪ್ರತಿ ವರ್ಗದ ಉಪವರ್ಗಗಳು (ಸೇರಿಸು / ಎಡಿಟ್ / ಅಳಿಸು) ಮತ್ತು ಆ ವರ್ಗದ ಪ್ರಾಡಕ್ಟ್‌ಗಳು
export default function SubcategoriesManager({
  products = [],
  onAddProduct,
  onEditProduct,
  onOpenBrands,
}: {
  products?: SubAdminProduct[];
  onAddProduct: (categorySlug: CategorySlug, subcategoryId?: number) => void;
  onEditProduct: (p: SubAdminProduct) => void;
  onOpenBrands: () => void;
}) {
  const subs = useSubcategories();
  const [slug, setSlug] = useState<CategorySlug>("seeds");
  const [editing, setEditing] = useState<Subcategory | null>(null);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [link, setLink] = useState("");
  const [fresh, setFresh] = useState("");
  const [busy, setBusy] = useState<"" | "upload" | "save" | number>("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const cat = CATEGORIES.find((c) => c.slug === slug)!;
  const mine = (subs ?? []).filter((s) => s.category_slug === slug);
  const catProducts = products.filter((p) => categoryOf(p)?.slug === slug);
  const countFor = (id: number) => products.filter((p) => p.subcategory_id === id).length;
  const subLabel = (id?: number | null) => (id != null ? (subs ?? []).find((s) => s.id === id)?.name : null);

  const dropFresh = () => {
    if (fresh) discardSubcategoryLogo(fresh);
    setFresh("");
  };
  const reset = () => {
    dropFresh();
    setEditing(null);
    setName("");
    setNameEn("");
    setLogoUrl("");
    setLink("");
  };
  const pickCategory = (s: CategorySlug) => {
    reset();
    setMsg(null);
    setSlug(s);
  };
  const startEdit = (s: Subcategory) => {
    dropFresh();
    setEditing(s);
    setName(s.name);
    setNameEn(s.name_en ?? "");
    setLogoUrl(s.logo_url ?? "");
    setLink("");
    setMsg(null);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg(null);
    if (!IMAGE_TYPES.includes(file.type)) return setMsg({ ok: false, text: ERR.type });
    if (file.size > 5 * 1024 * 1024) return setMsg({ ok: false, text: ERR.size });
    setBusy("upload");
    try {
      const signed = (await createSubcategoryUploadUrl({ contentType: file.type, size: file.size })) as Result & {
        path?: string;
        token?: string;
        publicUrl?: string;
      };
      if (signed.error || !signed.path || !signed.token || !signed.publicUrl) return setMsg({ ok: false, text: errText(signed.error) });
      const { error } = await supabase.storage.from(MEDIA_BUCKET).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
      if (error) return setMsg({ ok: false, text: errText() });
      dropFresh();
      setFresh(signed.publicUrl);
      setLogoUrl(signed.publicUrl);
      setLink("");
    } finally {
      setBusy("");
    }
  };

  const useLink = () => {
    const v = link.trim();
    if (!/^https:\/\/\S+$/i.test(v)) return setMsg({ ok: false, text: ERR.url });
    dropFresh();
    setLogoUrl(v);
    setMsg(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!name.trim()) return setMsg({ ok: false, text: ERR.name });
    setBusy("save");
    const res = (await saveSubcategory({ id: editing?.id, categorySlug: slug, name, nameEn, logoUrl: logoUrl || null })) as Result;
    setBusy("");
    if (res.error) return setMsg({ ok: false, text: errText(res.error) });
    const wasEditing = !!editing;
    setFresh("");
    setEditing(null);
    setName("");
    setNameEn("");
    setLogoUrl("");
    setLink("");
    setMsg({ ok: true, text: wasEditing ? "ಉಪವರ್ಗ ಅಪ್‌ಡೇಟ್ ಆಗಿದೆ." : "ಹೊಸ ಉಪವರ್ಗ ಸೇರಿಸಲಾಗಿದೆ." });
    refreshSubcategories();
  };

  const remove = async (s: Subcategory) => {
    const n = countFor(s.id);
    const warn = n ? `\n\nಇದರ ${n} ಪ್ರಾಡಕ್ಟ್(ಗಳು) ಉಳಿಯುತ್ತವೆ, ಆದರೆ ಉಪವರ್ಗ ಖಾಲಿಯಾಗುತ್ತದೆ.` : "";
    if (!window.confirm(`"${s.name}" ಉಪವರ್ಗ ಅಳಿಸಬೇಕೇ?${warn}`)) return;
    setBusy(s.id);
    const res = (await deleteSubcategory(s.id)) as Result;
    setBusy("");
    if (res.error) return setMsg({ ok: false, text: errText(res.error) });
    if (editing?.id === s.id) reset();
    setMsg({ ok: true, text: "ಉಪವರ್ಗ ಅಳಿಸಲಾಗಿದೆ." });
    refreshSubcategories();
  };

  return (
    <section id="subcategories" className="space-y-4 font-sans scroll-mt-20">
      <div>
        <h3 className="font-bold text-slate-800 text-base">ಉಪವರ್ಗಗಳು ಮತ್ತು ವರ್ಗದ ಪ್ರಾಡಕ್ಟ್‌ಗಳು</h3>
        <p className="text-xs text-slate-600 mt-0.5">ವರ್ಗ ಆರಿಸಿ: ಅದರ ಉಪವರ್ಗಗಳನ್ನು ಸೇರಿಸಿ / ಎಡಿಟ್ / ಅಳಿಸಿ, ಮತ್ತು ಆ ವರ್ಗದ ಪ್ರಾಡಕ್ಟ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ.</p>
      </div>

      {/* ವರ್ಗ ಆಯ್ಕೆ */}
      <div role="tablist" aria-label="ವರ್ಗ" className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
        {CATEGORIES.map((c) => {
          const active = c.slug === slug;
          const n = c.slug === "brands" ? null : (subs ?? []).filter((s) => s.category_slug === c.slug).length;
          return (
            <button
              key={c.slug}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => (c.slug === "brands" ? onOpenBrands() : pickCategory(c.slug))}
              className={`flex-none flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 text-xs font-semibold whitespace-nowrap transition ${
                active ? "bg-emerald-700 border-emerald-700 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-emerald-500"
              }`}
            >
              <CategoryLogo slug={c.slug} name={c.kn} className="w-7 h-7" iconClassName="w-4 h-4" />
              {c.kn}
              {c.slug === "brands" ? <BadgeCheck className="w-3.5 h-3.5 opacity-70" /> : <span className={active ? "text-emerald-100" : "text-slate-400"}>{n}</span>}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500 -mt-2">&quot;ಬ್ರಾಂಡ್‌ಗಳು&quot; ಒತ್ತಿದರೆ ಬ್ರಾಂಡ್ ಟ್ಯಾಬ್ ತೆರೆಯುತ್ತದೆ (ಅಲ್ಲಿ ಪ್ರತಿ ಬ್ರಾಂಡ್ ಒಂದು ಉಪ-ಐಟಂ).</p>

      {/* ಉಪವರ್ಗ ಸೇರಿಸು / ಎಡಿಟ್ ಫಾರ್ಮ್ */}
      <form
        ref={formRef}
        onSubmit={save}
        className={`rounded-2xl border p-3 sm:p-4 space-y-3 ${editing ? "bg-amber-50 border-amber-300" : "bg-emerald-50/60 border-emerald-200"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-bold text-sm text-slate-800">{editing ? `ಉಪವರ್ಗ ಎಡಿಟ್: ${editing.name}` : `${cat.kn} ವರ್ಗಕ್ಕೆ ಹೊಸ ಉಪವರ್ಗ`}</h4>
          {editing && (
            <button type="button" onClick={reset} className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">
              <X className="w-4 h-4" /> ರದ್ದುಮಾಡಿ
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
          <div className="flex sm:flex-col items-center gap-2 flex-none">
            <SubLogo sub={{ name: name || "?", name_en: null, logo_url: logoUrl || null }} className="w-16 h-16 text-xl" />
            {logoUrl && (
              <button
                type="button"
                onClick={() => {
                  dropFresh();
                  setLogoUrl("");
                }}
                className="text-[11px] font-semibold text-red-600 hover:underline"
              >
                ಲೋಗೋ ತೆಗೆಯಿರಿ
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="grid sm:grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">ಹೆಸರು (ಕನ್ನಡ)</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="ಉದಾ: ಕೀಟನಾಶಕ" className={`mt-1 ${input}`} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Name (English)</span>
                <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} maxLength={80} placeholder="e.g. Insecticides" className={`mt-1 ${input}`} />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy !== ""}
                className="flex items-center gap-1.5 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
              >
                {busy === "upload" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {logoUrl ? "ಲೋಗೋ ಬದಲಿಸಿ" : "ಲೋಗೋ ಅಪ್‌ಲೋಡ್ (ಐಚ್ಛಿಕ)"}
              </button>
              <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(",")} onChange={upload} className="hidden" aria-hidden="true" tabIndex={-1} />
              <div className="flex gap-2 flex-1 min-w-[220px]">
                <label className="relative flex-1 min-w-0">
                  <span className="sr-only">ಇಮೇಜ್ ಲಿಂಕ್</span>
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    inputMode="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="ಅಥವಾ ಲೋಗೋ ಲಿಂಕ್: https://..."
                    className="w-full border border-slate-300 rounded-lg pl-8 pr-2 py-2 text-xs outline-none focus:border-emerald-600 bg-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={useLink}
                  disabled={!link.trim()}
                  className="flex-none text-xs font-semibold border border-slate-300 bg-white rounded-lg px-3 py-2 hover:bg-slate-50 disabled:opacity-40"
                >
                  ಬಳಸಿ
                </button>
              </div>
            </div>
          </div>
        </div>
        {msg && <p className={`text-xs ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
        <button
          type="submit"
          disabled={busy !== ""}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl disabled:opacity-50"
        >
          {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {editing ? "ಉಪವರ್ಗ ಅಪ್‌ಡೇಟ್ ಮಾಡಿ" : "ಉಪವರ್ಗ ಸೇರಿಸಿ"}
        </button>
      </form>

      {/* ಈ ವರ್ಗದ ಉಪವರ್ಗಗಳು */}
      <div>
        <h4 className="font-bold text-sm text-slate-800 mb-2">
          {cat.kn} ಉಪವರ್ಗಗಳು ({mine.length})
        </h4>
        {subs === null ? (
          <p className="text-center py-6">
            <Loader2 className="w-5 h-5 animate-spin inline text-emerald-700" />
          </p>
        ) : mine.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-5 border border-dashed rounded-xl">ಇನ್ನೂ ಉಪವರ್ಗ ಇಲ್ಲ. ಮೇಲಿನ ಫಾರ್ಮ್‌ನಿಂದ ಸೇರಿಸಿ.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {mine.map((s) => (
              <li
                key={s.id}
                className={`flex items-center gap-2 border rounded-xl p-2.5 bg-white min-w-0 ${editing?.id === s.id ? "border-amber-400 ring-2 ring-amber-100" : "border-slate-200"}`}
              >
                <SubLogo sub={s} className="w-11 h-11 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">{s.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {s.name_en ? `${s.name_en} · ` : ""}
                    {countFor(s.id)} ಪ್ರಾಡಕ್ಟ್
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAddProduct(slug, s.id)}
                  title="ಈ ಉಪವರ್ಗಕ್ಕೆ ಹೊಸ ಪ್ರಾಡಕ್ಟ್"
                  aria-label={`${s.name}: ಹೊಸ ಪ್ರಾಡಕ್ಟ್`}
                  className="flex-none p-2 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                >
                  <PackagePlus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(s)}
                  aria-label={`${s.name} ಎಡಿಟ್`}
                  className="flex-none p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(s)}
                  disabled={busy === s.id}
                  aria-label={`${s.name} ಅಳಿಸಿ`}
                  className="flex-none p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  {busy === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ಈ ವರ್ಗದ ಪ್ರಾಡಕ್ಟ್‌ಗಳು */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="font-bold text-sm text-slate-800">
            {cat.kn} ಪ್ರಾಡಕ್ಟ್‌ಗಳು ({catProducts.length})
          </h4>
          <button
            type="button"
            onClick={() => onAddProduct(slug)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg"
          >
            <PackagePlus className="w-4 h-4" /> ಈ ವರ್ಗಕ್ಕೆ ಹೊಸ ಪ್ರಾಡಕ್ಟ್
          </button>
        </div>
        {catProducts.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-5 border border-dashed rounded-xl">ಈ ವರ್ಗದಲ್ಲಿ ಇನ್ನೂ ಪ್ರಾಡಕ್ಟ್ ಇಲ್ಲ.</p>
        ) : (
          <ul className="space-y-1.5">
            {catProducts.map((p) => {
              const img = getProductImages(p)[0];
              const sub = subLabel(p.subcategory_id);
              return (
                <li key={p.id} className="flex items-center gap-2 border border-slate-200 rounded-xl p-2 bg-white min-w-0">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover flex-none" />
                  ) : (
                    <span className="w-10 h-10 rounded-lg bg-slate-100 flex-none" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{p.name}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {p.price != null ? `₹${p.price} · ` : ""}
                      {sub ? <span className="text-emerald-700 font-semibold">{sub}</span> : <span className="text-amber-700">ಉಪವರ್ಗ ಇಲ್ಲ</span>}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditProduct(p)}
                    className="flex-none flex items-center gap-1 text-xs font-semibold border border-emerald-600 text-emerald-700 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50"
                  >
                    <Pencil className="w-3.5 h-3.5" /> ಎಡಿಟ್
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
