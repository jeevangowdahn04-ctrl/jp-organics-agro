"use client";

import React, { useRef, useState } from "react";
import { ChevronRight, Link2, Loader2, PackagePlus, Pencil, Plus, Trash2, Unlink, Upload, X } from "lucide-react";
import { BrandLogo, refreshBrands, useBrands, type Brand } from "./useBrands";
import { createBrandUploadUrl, deleteBrand, discardBrandLogo, saveBrand } from "@/app/brands/actions";
import { setProductBrand } from "@/app/admin/actions";
import { supabase } from "@/lib/supabase";
import { getProductImages } from "@/lib/media";
import { IMAGE_TYPES, MEDIA_BUCKET } from "@/lib/media";

type Result = { error?: string; ok?: boolean };

const ERR: Record<string, string> = {
  auth: "ಅಡ್ಮಿನ್ ಲಾಗಿನ್ ಅವಧಿ ಮುಗಿದಿದೆ. ಮತ್ತೆ ಲಾಗಿನ್ ಆಗಿ.",
  name: "ಬ್ರಾಂಡ್ ಹೆಸರು ನಮೂದಿಸಿ.",
  url: "https:// ನಿಂದ ಆರಂಭವಾಗುವ ಸರಿಯಾದ ಇಮೇಜ್ ಲಿಂಕ್ ಹಾಕಿ.",
  type: "PNG, JPG, WebP ಅಥವಾ GIF ಫೋಟೋ ಮಾತ್ರ.",
  size: "ಲೋಗೋ 5MB ಒಳಗಿರಬೇಕು.",
  duplicate: "ಈ ಹೆಸರಿನ ಬ್ರಾಂಡ್ ಈಗಾಗಲೇ ಇದೆ.",
  table: "ಬ್ರಾಂಡ್ ಟೇಬಲ್ ಇನ್ನೂ ಇಲ್ಲ: supabase/brands.sql ರನ್ ಮಾಡಿ.",
  missing: "ಈ ಬ್ರಾಂಡ್ ಸಿಗಲಿಲ್ಲ (ಬಹುಶಃ ಅಳಿಸಲಾಗಿದೆ).",
};
const errText = (code?: string) => ERR[code ?? ""] ?? "ಉಳಿಸಲು ಆಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.";

export interface AdminProduct {
  id: number;
  name: string;
  name_en?: string | null;
  price?: number | string | null;
  brand_id?: number | null;
  image_url?: string | null;
  image_urls?: string[] | null;
}

// ಒಂದು ಬ್ರಾಂಡ್ ತೆರೆದಾಗ: ಹೊಸ ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸುವ ಬಟನ್, ಆ ಬ್ರಾಂಡ್‌ನ ಪ್ರಾಡಕ್ಟ್‌ಗಳು, ಈಗಿರುವ ಪ್ರಾಡಕ್ಟ್ ಲಿಂಕ್ ಮಾಡುವುದು
function BrandView({
  brand,
  brands,
  products,
  onClose,
  onAddProduct,
  onEditProduct,
  onProductsChanged,
}: {
  brand: Brand;
  brands: Brand[];
  products: AdminProduct[];
  onClose: () => void;
  onAddProduct: (brandId: number) => void;
  onEditProduct: (p: AdminProduct) => void;
  onProductsChanged: () => void;
}) {
  const mine = products.filter((p) => p.brand_id === brand.id);
  const others = products.filter((p) => p.brand_id !== brand.id);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState<number | "link" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const otherBrand = (id?: number | null) => (id != null ? brands.find((b) => b.id === id)?.name : null);

  const link = async () => {
    const p = others.find((x) => String(x.id) === pick);
    if (!p) return;
    const from = otherBrand(p.brand_id);
    if (from && !window.confirm(`"${p.name}" ಈಗ "${from}" ಬ್ರಾಂಡ್‌ನಲ್ಲಿದೆ. "${brand.name}" ಗೆ ಬದಲಾಯಿಸಬೇಕೇ?`)) return;
    setBusy("link");
    const res = (await setProductBrand(p.id, brand.id)) as Result;
    setBusy(null);
    if (res?.error) return setMsg({ ok: false, text: res.error });
    setPick("");
    setMsg({ ok: true, text: `"${p.name}" ಅನ್ನು ${brand.name} ಬ್ರಾಂಡ್‌ಗೆ ಸೇರಿಸಲಾಗಿದೆ.` });
    onProductsChanged();
  };

  const unlink = async (p: AdminProduct) => {
    if (!window.confirm(`"${p.name}" ಅನ್ನು ${brand.name} ಬ್ರಾಂಡ್‌ನಿಂದ ತೆಗೆಯಬೇಕೇ?\n(ಪ್ರಾಡಕ್ಟ್ ಅಳಿಯುವುದಿಲ್ಲ, ಬ್ರಾಂಡ್ ಮಾತ್ರ ಖಾಲಿಯಾಗುತ್ತದೆ)`)) return;
    setBusy(p.id);
    const res = (await setProductBrand(p.id, null)) as Result;
    setBusy(null);
    if (res?.error) return setMsg({ ok: false, text: res.error });
    setMsg({ ok: true, text: `"${p.name}" ಅನ್ನು ಬ್ರಾಂಡ್‌ನಿಂದ ತೆಗೆಯಲಾಗಿದೆ.` });
    onProductsChanged();
  };

  return (
    <section id="brand-view" className="rounded-2xl border-2 border-emerald-500 bg-white p-3 sm:p-4 space-y-3 scroll-mt-20">
      <div className="flex items-center gap-3">
        <BrandLogo brand={brand} className="w-14 h-14 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 truncate">{brand.name}</p>
          <p className="text-xs text-slate-500">{mine.length} ಪ್ರಾಡಕ್ಟ್</p>
        </div>
        <button type="button" onClick={onClose} aria-label="ಮುಚ್ಚಿ" className="p-1.5 rounded-full hover:bg-slate-100 flex-none">
          <X className="w-5 h-5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onAddProduct(brand.id)}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-xl"
      >
        <PackagePlus className="w-5 h-5" /> ಈ ಬ್ರಾಂಡ್‌ಗೆ ಹೊಸ ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸಿ
      </button>

      <div>
        <p className="text-sm font-bold text-slate-700 mb-2">{brand.name} ಬ್ರಾಂಡ್‌ನ ಪ್ರಾಡಕ್ಟ್‌ಗಳು</p>
        {mine.length === 0 ? (
          <p className="text-xs text-slate-500 border border-dashed rounded-xl px-3 py-4 text-center">ಇನ್ನೂ ಯಾವುದೇ ಪ್ರಾಡಕ್ಟ್ ಇಲ್ಲ. ಮೇಲಿನ ಬಟನ್‌ನಿಂದ ಹೊಸದನ್ನು ಸೇರಿಸಿ ಅಥವಾ ಕೆಳಗೆ ಈಗಿರುವ ಪ್ರಾಡಕ್ಟ್ ಆರಿಸಿ.</p>
        ) : (
          <ul className="space-y-1.5">
            {mine.map((p) => {
              const img = getProductImages(p)[0];
              return (
                <li key={p.id} className="flex items-center gap-2 border border-slate-200 rounded-xl p-2 min-w-0">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover flex-none" />
                  ) : (
                    <span className="w-10 h-10 rounded-lg bg-slate-100 flex-none" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{p.name}</span>
                    {p.price != null && <span className="block text-xs text-slate-500">₹{p.price}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditProduct(p)}
                    className="flex items-center gap-1 text-xs font-semibold border border-emerald-600 text-emerald-700 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50 flex-none"
                  >
                    <Pencil className="w-3.5 h-3.5" /> <span className="hidden min-[400px]:inline">ಎಡಿಟ್</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => unlink(p)}
                    disabled={busy === p.id}
                    title="ಬ್ರಾಂಡ್‌ನಿಂದ ತೆಗೆಯಿರಿ"
                    className="flex items-center gap-1 text-xs font-semibold border border-slate-300 text-slate-600 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50 flex-none"
                  >
                    {busy === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                    <span className="hidden min-[400px]:inline">ತೆಗೆಯಿರಿ</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {others.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <p className="text-sm font-bold text-slate-700">ಈಗಿರುವ ಪ್ರಾಡಕ್ಟ್ ಅನ್ನು ಈ ಬ್ರಾಂಡ್‌ಗೆ ಸೇರಿಸಿ</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              aria-label="ಪ್ರಾಡಕ್ಟ್ ಆಯ್ಕೆ"
              className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-emerald-600"
            >
              <option value="">-- ಪ್ರಾಡಕ್ಟ್ ಆಯ್ಕೆ ಮಾಡಿ --</option>
              {others.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                  {otherBrand(p.brand_id) ? ` (ಈಗ: ${otherBrand(p.brand_id)})` : " (ಬ್ರಾಂಡ್ ಇಲ್ಲ)"}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={link}
              disabled={!pick || busy === "link"}
              className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-40 flex-none"
            >
              {busy === "link" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} ಸೇರಿಸಿ
            </button>
          </div>
        </div>
      )}

      {msg && <p className={`text-xs ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
    </section>
  );
}

// ಅಡ್ಮಿನ್: ಬ್ರಾಂಡ್ ಸೇರಿಸುವುದು / ಎಡಿಟ್ / ಅಳಿಸುವುದು; ಒಂದು ಬ್ರಾಂಡ್ ಒತ್ತಿದರೆ ಅದರ ಪ್ರಾಡಕ್ಟ್ ನಿರ್ವಹಣೆ
export default function BrandsManager({
  productCounts = {},
  products = [],
  onAddProduct = () => {},
  onEditProduct = () => {},
  onProductsChanged = () => {},
}: {
  productCounts?: Record<number, number>;
  products?: AdminProduct[];
  onAddProduct?: (brandId: number) => void;
  onEditProduct?: (p: AdminProduct) => void;
  onProductsChanged?: () => void;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const brands = useBrands();
  const [editing, setEditing] = useState<Brand | null>(null);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [link, setLink] = useState("");
  const [fresh, setFresh] = useState(""); // ಈಗಷ್ಟೇ ಅಪ್‌ಲೋಡ್ ಆದ, ಇನ್ನೂ ಉಳಿಸದ ಲೋಗೋ
  const [busy, setBusy] = useState<"" | "upload" | "save" | number>("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const dropFresh = () => {
    if (fresh) discardBrandLogo(fresh);
    setFresh("");
  };

  const reset = () => {
    dropFresh();
    setEditing(null);
    setName("");
    setLogoUrl("");
    setLink("");
  };

  const startEdit = (b: Brand) => {
    dropFresh();
    setEditing(b);
    setName(b.name);
    setLogoUrl(b.logo_url ?? "");
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
      const signed = (await createBrandUploadUrl({ contentType: file.type, size: file.size })) as Result & {
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
    const res = (await saveBrand({ id: editing?.id, name, logoUrl: logoUrl || null })) as Result;
    setBusy("");
    if (res.error) return setMsg({ ok: false, text: errText(res.error) });
    setFresh(""); // ಉಳಿಸಲಾಗಿದೆ, ಅಳಿಸಬಾರದು
    setEditing(null);
    setName("");
    setLogoUrl("");
    setLink("");
    setMsg({ ok: true, text: editing ? "ಬ್ರಾಂಡ್ ಅಪ್‌ಡೇಟ್ ಆಗಿದೆ." : "ಹೊಸ ಬ್ರಾಂಡ್ ಸೇರಿಸಲಾಗಿದೆ." });
    refreshBrands();
  };

  const remove = async (b: Brand) => {
    const n = productCounts[b.id] ?? 0;
    const warn = n ? `\n\nಈ ಬ್ರಾಂಡ್‌ನ ${n} ಪ್ರಾಡಕ್ಟ್(ಗಳು) ಉಳಿಯುತ್ತವೆ, ಆದರೆ ಅವುಗಳ ಬ್ರಾಂಡ್ ಖಾಲಿಯಾಗುತ್ತದೆ.` : "";
    if (!window.confirm(`"${b.name}" ಬ್ರಾಂಡ್ ಅಳಿಸಬೇಕೇ?${warn}`)) return;
    setBusy(b.id);
    const res = (await deleteBrand(b.id)) as Result;
    setBusy("");
    if (res.error) return setMsg({ ok: false, text: errText(res.error) });
    if (editing?.id === b.id) reset();
    if (openId === b.id) setOpenId(null);
    setMsg({ ok: true, text: "ಬ್ರಾಂಡ್ ಅಳಿಸಲಾಗಿದೆ." });
    refreshBrands();
  };

  return (
    <div className="space-y-4 font-sans">
      <form
        ref={formRef}
        onSubmit={save}
        className={`rounded-2xl border p-3 sm:p-4 space-y-3 ${editing ? "bg-amber-50 border-amber-300" : "bg-emerald-50/60 border-emerald-200"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-800">{editing ? `ಬ್ರಾಂಡ್ ಎಡಿಟ್: ${editing.name}` : "ಹೊಸ ಬ್ರಾಂಡ್ ಸೇರಿಸಿ (Add Brand)"}</h3>
          {editing && (
            <button type="button" onClick={reset} className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">
              <X className="w-4 h-4" /> ರದ್ದುಮಾಡಿ
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
          <div className="flex sm:flex-col items-center gap-2 flex-none">
            <BrandLogo brand={{ name: name || "?", logo_url: logoUrl || null }} className="w-20 h-20 text-xl" />
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
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">ಬ್ರಾಂಡ್ ಹೆಸರು / Brand name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="ಉದಾ: Coromandel"
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 bg-white"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy !== ""}
                className="flex items-center gap-1.5 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
              >
                {busy === "upload" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {logoUrl ? "ಲೋಗೋ ಬದಲಿಸಿ" : "ಲೋಗೋ ಅಪ್‌ಲೋಡ್"}
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
          {editing ? "ಬ್ರಾಂಡ್ ಅಪ್‌ಡೇಟ್ ಮಾಡಿ" : "ಬ್ರಾಂಡ್ ಸೇರಿಸಿ"}
        </button>
      </form>

      {(() => {
        const open = openId != null ? brands?.find((b) => b.id === openId) : null;
        return open ? (
          <BrandView
            brand={open}
            brands={brands ?? []}
            products={products}
            onClose={() => setOpenId(null)}
            onAddProduct={onAddProduct}
            onEditProduct={onEditProduct}
            onProductsChanged={onProductsChanged}
          />
        ) : null;
      })()}

      <div>
        <h3 className="font-bold text-slate-800 mb-1">ಎಲ್ಲಾ ಬ್ರಾಂಡ್‌ಗಳು ({brands?.length ?? 0})</h3>
        <p className="text-xs text-slate-500 mb-2">ಬ್ರಾಂಡ್ ಒತ್ತಿದರೆ ಅದರ ಪ್ರಾಡಕ್ಟ್‌ಗಳು, ಹೊಸ ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸುವುದು ಮತ್ತು ಈಗಿರುವ ಪ್ರಾಡಕ್ಟ್ ಲಿಂಕ್ ಮಾಡುವುದು.</p>
        {brands === null ? (
          <p className="text-center py-6">
            <Loader2 className="w-5 h-5 animate-spin inline text-emerald-700" />
          </p>
        ) : brands.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8 border border-dashed rounded-xl">ಇನ್ನೂ ಯಾವುದೇ ಬ್ರಾಂಡ್ ಇಲ್ಲ. ಮೇಲಿನ ಫಾರ್ಮ್‌ನಿಂದ ಸೇರಿಸಿ.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {brands.map((b) => (
              <li
                key={b.id}
                className={`flex items-center gap-2 border rounded-xl p-2.5 bg-white min-w-0 ${openId === b.id ? "border-emerald-500 ring-2 ring-emerald-100" : ""} ${editing?.id === b.id ? "border-amber-400 ring-2 ring-amber-100" : "border-slate-200"}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(b.id);
                    setTimeout(() => document.getElementById("brand-view")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
                  }}
                  aria-label={`${b.name}: ಪ್ರಾಡಕ್ಟ್‌ಗಳು`}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-lg hover:bg-slate-50 -m-1 p-1"
                >
                  <BrandLogo brand={b} className="w-12 h-12 text-sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-sm truncate">{b.name}</span>
                    <span className="flex items-center gap-0.5 text-[11px] text-emerald-700 font-semibold">
                      {productCounts[b.id] ?? 0} ಪ್ರಾಡಕ್ಟ್ · ತೆರೆಯಿರಿ <ChevronRight className="w-3 h-3" />
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(b)}
                  aria-label={`${b.name} ಎಡಿಟ್`}
                  className="flex items-center gap-1 text-xs font-semibold border border-emerald-600 text-emerald-700 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50"
                >
                  <Pencil className="w-3.5 h-3.5" /> <span className="hidden min-[400px]:inline">ಎಡಿಟ್</span>
                </button>
                <button
                  type="button"
                  onClick={() => remove(b)}
                  disabled={busy === b.id}
                  aria-label={`${b.name} ಅಳಿಸಿ`}
                  className="flex items-center gap-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg px-2.5 py-1.5 disabled:opacity-50"
                >
                  {busy === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span className="hidden min-[400px]:inline">ಅಳಿಸಿ</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
