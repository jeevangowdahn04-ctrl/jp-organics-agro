"use client";

import React, { useRef, useState } from "react";
import { Link2, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { BrandLogo, refreshBrands, useBrands, type Brand } from "./useBrands";
import { createBrandUploadUrl, deleteBrand, discardBrandLogo, saveBrand } from "@/app/brands/actions";
import { supabase } from "@/lib/supabase";
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

// ಅಡ್ಮಿನ್: ಬ್ರಾಂಡ್ ಸೇರಿಸುವುದು / ಎಡಿಟ್ / ಅಳಿಸುವುದು. productCounts = ಪ್ರತಿ ಬ್ರಾಂಡ್‌ನ ಪ್ರಾಡಕ್ಟ್ ಸಂಖ್ಯೆ
export default function BrandsManager({ productCounts = {} }: { productCounts?: Record<number, number> }) {
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

      <div>
        <h3 className="font-bold text-slate-800 mb-2">ಎಲ್ಲಾ ಬ್ರಾಂಡ್‌ಗಳು ({brands?.length ?? 0})</h3>
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
                className={`flex items-center gap-3 border rounded-xl p-2.5 bg-white min-w-0 ${editing?.id === b.id ? "border-amber-400 ring-2 ring-amber-100" : "border-slate-200"}`}
              >
                <BrandLogo brand={b} className="w-12 h-12 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">{b.name}</p>
                  <p className="text-[11px] text-slate-500">{productCounts[b.id] ?? 0} ಪ್ರಾಡಕ್ಟ್</p>
                </div>
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
