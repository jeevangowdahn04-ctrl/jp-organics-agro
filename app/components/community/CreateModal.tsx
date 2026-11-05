"use client";

import React, { useEffect, useRef, useState } from "react";
import { Clapperboard, ImagePlus, Loader2, X } from "lucide-react";
import { useLanguage } from "../i18n/LanguageProvider";
import { useCustomer } from "../customer/CustomerProvider";
import { createCommunityUploadUrl, createPost } from "@/app/community/actions";
import { supabase } from "@/lib/supabase";
import { IMAGE_TYPES, MEDIA_BUCKET, VIDEO_TYPES } from "@/lib/media";
import { communityError, shrinkPhoto, viewerOf } from "@/lib/community";

type Kind = "post" | "reel";
const LIMIT = { post: 10 * 1024 * 1024, reel: 50 * 1024 * 1024 };

// "+ ರಚಿಸಿ": ಫೋಟೋ ಪೋಸ್ಟ್ ಅಥವಾ ರೀಲ್ (ವಿಡಿಯೋ) ಅಪ್‌ಲೋಡ್
export default function CreateModal({
  initialKind = "post",
  onClose,
  onCreated,
}: {
  initialKind?: Kind;
  onClose: () => void;
  onCreated: (kind: Kind) => void;
}) {
  const { t } = useLanguage();
  const { customer } = useCustomer();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const switchKind = (k: Kind) => {
    if (k === kind) return;
    setKind(k);
    setFile(null);
    setPreview("");
    setError("");
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    const allowed = kind === "post" ? IMAGE_TYPES : VIDEO_TYPES;
    if (!allowed.includes(f.type)) return setError(t("community.err.type"));
    if (f.size > LIMIT[kind]) return setError(t("community.err.size"));
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const publish = async () => {
    if (!file || !customer) return;
    setBusy(true);
    setError("");
    try {
      const upload = kind === "post" ? await shrinkPhoto(file) : file;
      const viewer = viewerOf(customer);
      const signed = (await createCommunityUploadUrl(viewer, { kind, contentType: upload.type, size: upload.size })) as {
        error?: string;
        path?: string;
        token?: string;
        publicUrl?: string;
      };
      if (signed.error || !signed.path || !signed.token) throw new Error(signed.error || "server");
      const { error: upErr } = await supabase.storage
        .from(MEDIA_BUCKET)
        .uploadToSignedUrl(signed.path, signed.token, upload, { contentType: upload.type });
      if (upErr) throw new Error("media");
      const res = (await createPost(viewer, { kind, mediaUrl: signed.publicUrl, caption })) as { error?: string };
      if (res.error) throw new Error(res.error);
      onCreated(kind);
    } catch (err) {
      setError(t(communityError((err as Error).message)));
      setBusy(false);
    }
  };

  const tab = (k: Kind) =>
    `flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border ${
      kind === k ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"
    }`;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end md:items-center justify-center" onClick={busy ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("community.createTitle")}
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-slate-900 w-full md:max-w-md rounded-t-2xl md:rounded-2xl max-h-[92dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="font-bold">{t("community.createTitle")}</p>
          <button type="button" onClick={onClose} disabled={busy} aria-label={t("community.close")} className="p-1 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            <button type="button" onClick={() => switchKind("post")} disabled={busy} className={tab("post")} aria-pressed={kind === "post"}>
              <ImagePlus className="w-4 h-4" /> {t("community.typePost")}
            </button>
            <button type="button" onClick={() => switchKind("reel")} disabled={busy} className={tab("reel")} aria-pressed={kind === "reel"}>
              <Clapperboard className="w-4 h-4" /> {t("community.typeReel")}
            </button>
          </div>

          {preview ? (
            <div className={`relative bg-black rounded-xl overflow-hidden mx-auto ${kind === "reel" ? "aspect-[9/16] max-h-[45dvh]" : "max-h-[45dvh]"}`}>
              {kind === "reel" ? (
                <video src={preview} controls playsInline className="w-full h-full object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="w-full max-h-[45dvh] object-contain" />
              )}
              {!busy && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview("");
                  }}
                  aria-label={t("stories.mediaRemove")}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-xl py-10 flex flex-col items-center gap-2 text-emerald-800 hover:bg-emerald-50"
            >
              {kind === "post" ? <ImagePlus className="w-9 h-9" /> : <Clapperboard className="w-9 h-9" />}
              <span className="font-semibold">{kind === "post" ? t("community.pickPhoto") : t("community.pickVideo")}</span>
              <span className="text-xs text-slate-500">{kind === "post" ? t("community.photoHint") : t("community.reelHint")}</span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={kind === "post" ? IMAGE_TYPES.join(",") : VIDEO_TYPES.join(",")}
            onChange={pick}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />

          <label className="block">
            <span className="text-sm font-semibold">{t("community.caption")}</span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={busy}
              placeholder={t("community.captionPh")}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={publish}
            disabled={!file || busy}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {t("community.uploading")}
              </>
            ) : (
              t("community.publish")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
