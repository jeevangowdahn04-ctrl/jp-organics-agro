"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { IMAGE_TYPES, MEDIA_BUCKET } from "@/lib/media";
import { createBrandUploadUrl, saveBrand } from "@/app/brands/actions";
import { refreshBrands, type Brand } from "./useBrands";

// ಪ್ರಾಡಕ್ಟ್ ಫಾರ್ಮ್ ಒಳಗೇ ಹೊಸ ಬ್ರಾಂಡ್ ಸೇರಿಸುವುದು (ಫಾರ್ಮ್ ಬಿಡದೇ). ಹೆಸರು ಕಡ್ಡಾಯ, ಲೋಗೋ ಐಚ್ಛಿಕ.
// ಉಳಿಸಿದ ತಕ್ಷಣ ಆ ಬ್ರಾಂಡ್ ಡ್ರಾಪ್‌ಡೌನ್‌ನಲ್ಲಿ ಆಯ್ಕೆಯಾಗುತ್ತದೆ (onCreated).
// ಗಮನಿಸಿ: ಇದು ಪ್ರಾಡಕ್ಟ್ <form> ಒಳಗಿರುವುದರಿಂದ ಇಲ್ಲಿ <form> ಬೇಡ; Enter ಒತ್ತಿದರೆ ಪ್ರಾಡಕ್ಟ್ ಸೇವ್ ಆಗಬಾರದು.

const ERR: Record<string, string> = {
  auth: "ಅಡ್ಮಿನ್ ಲಾಗಿನ್ ಅವಧಿ ಮುಗಿದಿದೆ. ಮತ್ತೆ ಲಾಗಿನ್ ಆಗಿ.",
  name: "ಬ್ರಾಂಡ್ ಹೆಸರು ನಮೂದಿಸಿ.",
  type: "PNG, JPG, WebP ಅಥವಾ GIF ಫೋಟೋ ಮಾತ್ರ.",
  size: "ಲೋಗೋ 5MB ಒಳಗಿರಬೇಕು.",
  table: "ಬ್ರಾಂಡ್ ಟೇಬಲ್ ಇನ್ನೂ ಇಲ್ಲ: supabase/brands.sql ರನ್ ಮಾಡಿ.",
};
const errText = (code?: string) => ERR[code ?? ""] ?? "ಉಳಿಸಲು ಆಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.";

export default function QuickAddBrand({
  open,
  onClose,
  onCreated,
  brands,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
  brands: Brand[] | null;
}) {
  const [name, setName] = useState("");
  // ಆಯ್ಕೆ ಮಾಡಿದ ಲೋಗೋ ಫೈಲ್ ಮತ್ತು ಅದರ ಪ್ರಿವ್ಯೂ
  const [logo, setLogo] = useState<{ file: File; url: string } | null>(null);
  const file = logo?.file ?? null;
  const preview = logo?.url ?? null;
  const setFile = (f: File | null) =>
    setLogo((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return f ? { file: f, url: URL.createObjectURL(f) } : null;
    });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) nameRef.current?.focus();
  }, [open]);


  if (!open) return null;

  const reset = () => {
    setName("");
    setFile(null);
    setMsg(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!IMAGE_TYPES.includes(f.type)) return setMsg(ERR.type);
    if (f.size > 5 * 1024 * 1024) return setMsg(ERR.size);
    setMsg(null);
    setFile(f);
  };

  const save = async () => {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return setMsg(ERR.name);
    // ಅದೇ ಹೆಸರಿನ ಬ್ರಾಂಡ್ ಈಗಾಗಲೇ ಇದ್ದರೆ ಹೊಸದು ಮಾಡದೇ ಅದನ್ನೇ ಆಯ್ಕೆ ಮಾಡುವುದು
    const existing = (brands ?? []).find((b) => b.name.trim().toLowerCase() === clean.toLowerCase());
    if (existing) {
      onCreated(existing.id);
      close();
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      let logoUrl: string | null = null;
      if (file) {
        const signed = (await createBrandUploadUrl({ contentType: file.type, size: file.size })) as {
          error?: string;
          path?: string;
          token?: string;
          publicUrl?: string;
        };
        if (signed.error || !signed.path || !signed.token || !signed.publicUrl) return setMsg(errText(signed.error));
        const { error } = await supabase.storage.from(MEDIA_BUCKET).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
        if (error) return setMsg(errText());
        logoUrl = signed.publicUrl;
      }
      const res = (await saveBrand({ id: null, name: clean, logoUrl })) as { ok?: boolean; id?: number; error?: string };
      if (res.error === "duplicate") {
        // ಬೇರೆ ಕಡೆ ಈಗಷ್ಟೇ ಸೇರಿದ್ದರೆ: ಪಟ್ಟಿ ನವೀಕರಿಸಿ ಅದನ್ನೇ ಆಯ್ಕೆ
        await refreshBrands();
        const { data } = await supabase.from("brands").select("id").ilike("name", clean).maybeSingle();
        if (data?.id) {
          onCreated(data.id as number);
          close();
          return;
        }
      }
      if (!res.ok || res.id == null) return setMsg(errText(res.error));
      await refreshBrands();
      onCreated(res.id);
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-emerald-300 bg-emerald-50/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-emerald-900">ಹೊಸ ಬ್ರಾಂಡ್ / New brand</p>
        <button type="button" onClick={close} aria-label="ರದ್ದು" className="p-1 rounded-full hover:bg-emerald-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <label
          className="flex-none w-12 h-12 rounded-lg border border-dashed border-emerald-400 bg-white flex items-center justify-center cursor-pointer overflow-hidden"
          title="ಲೋಗೋ (ಐಚ್ಛಿಕ) / Logo (optional)"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="w-full h-full object-contain p-0.5" />
          ) : (
            <ImagePlus className="w-5 h-5 text-emerald-700" />
          )}
          <input type="file" accept={IMAGE_TYPES.join(",")} onChange={pickFile} className="sr-only" aria-label="ಬ್ರಾಂಡ್ ಲೋಗೋ / Brand logo" />
        </label>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              close();
            }
          }}
          maxLength={80}
          placeholder="ಬ್ರಾಂಡ್ ಹೆಸರು / Brand name"
          aria-label="ಬ್ರಾಂಡ್ ಹೆಸರು / Brand name"
          className="min-w-0 flex-1 border border-slate-300 rounded-md px-2 py-2 text-sm bg-white outline-none focus:border-emerald-600"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="flex-none flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold px-3 py-2 rounded-md disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} ಸೇರಿಸಿ
        </button>
      </div>
      {file && (
        <button type="button" onClick={() => setFile(null)} className="text-xs text-slate-600 underline">
          ಲೋಗೋ ತೆಗೆಯಿರಿ
        </button>
      )}
      {msg && (
        <p role="alert" className="text-xs text-red-600">
          {msg}
        </p>
      )}
    </div>
  );
}
