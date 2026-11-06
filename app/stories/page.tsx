"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, PenLine, ShieldCheck, Trash2, X } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StoryCard from "../components/stories/StoryCard";
import { useLanguage } from "../components/i18n/LanguageProvider";
import { useCustomer } from "../components/customer/CustomerProvider";
import { useAdminMode } from "../components/admin/InlineAdmin";
import { supabase } from "@/lib/supabase";
import { IMAGE_TYPES, MEDIA_BUCKET, VIDEO_TYPES } from "@/lib/media";
import { loadApprovedStories, type FarmerStory } from "@/lib/stories";
import type { TranslationKey } from "@/lib/i18n";
import { approveStory, createStoryUploadUrl, deleteStory, listPendingStories, submitStory } from "./actions";

const inputClass =
  "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const errorKey = (code: string) => `stories.err.${code}` as TranslationKey;

// ಅನುಭವ ಕಳುಹಿಸುವ ಫಾರ್ಮ್
function StoryForm({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const { t } = useLanguage();
  const { customer } = useCustomer();
  const [farmerName, setFarmerName] = useState(customer?.name ?? "");
  const [village, setVillage] = useState(
    [customer?.address?.post || customer?.address?.village, customer?.address?.taluk].filter(Boolean).join(", ")
  );
  const [product, setProduct] = useState("");
  const [crop, setCrop] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"" | "uploading" | "submitting">("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    setError("");
    if (!f) return;
    const isImage = IMAGE_TYPES.includes(f.type);
    const isVideo = VIDEO_TYPES.includes(f.type);
    if (!isImage && !isVideo) return setError(t("stories.err.type"));
    if (f.size > (isImage ? 10 : 50) * 1024 * 1024) return setError(t("stories.err.size"));
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (farmerName.trim().length < 2) return setError(t("stories.err.name"));
    if (note.trim().length < 10) return setError(t("stories.err.note"));

    let mediaUrl = "";
    let mediaType = "";
    try {
      if (file) {
        setStatus("uploading");
        const signed = await createStoryUploadUrl({ contentType: file.type, size: file.size });
        if ("error" in signed) throw new Error(signed.error);
        const { error: upErr } = await supabase.storage
          .from(MEDIA_BUCKET)
          .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
        if (upErr) throw new Error("media");
        mediaUrl = signed.publicUrl;
        mediaType = signed.mediaType;
      }
      setStatus("submitting");
      const res = await submitStory({ farmerName, village, product, crop, note, mediaUrl, mediaType, website });
      if ("error" in res) throw new Error(res.error);
      onSubmitted();
    } catch (err) {
      const code = (err as Error).message;
      setError(t(["name", "note", "type", "size", "rate", "server", "table", "media"].includes(code) ? errorKey(code) : "stories.err.server"));
    } finally {
      setStatus("");
    }
  };

  const busy = status !== "";

  return (
    <form onSubmit={submit} className="bg-white border rounded-2xl p-5 space-y-3" noValidate>
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">{t("stories.formTitle")}</h2>
        <button type="button" onClick={onClose} aria-label={t("stories.cancel")} className="p-1.5 rounded-full hover:bg-slate-100">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="st-name" className="block text-xs font-semibold text-slate-600 mb-1">{t("stories.name")}</label>
          <input id="st-name" value={farmerName} onChange={(e) => setFarmerName(e.target.value)} placeholder={t("stories.namePh")} maxLength={60} className={inputClass} />
        </div>
        <div>
          <label htmlFor="st-village" className="block text-xs font-semibold text-slate-600 mb-1">{t("stories.village")}</label>
          <input id="st-village" value={village} onChange={(e) => setVillage(e.target.value)} placeholder={t("stories.villagePh")} maxLength={80} className={inputClass} />
        </div>
        <div>
          <label htmlFor="st-product" className="block text-xs font-semibold text-slate-600 mb-1">{t("stories.product")}</label>
          <input id="st-product" value={product} onChange={(e) => setProduct(e.target.value)} placeholder={t("stories.productPh")} maxLength={80} className={inputClass} />
        </div>
        <div>
          <label htmlFor="st-crop" className="block text-xs font-semibold text-slate-600 mb-1">{t("stories.crop")}</label>
          <input id="st-crop" value={crop} onChange={(e) => setCrop(e.target.value)} placeholder={t("stories.cropPh")} maxLength={60} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="st-note" className="block text-xs font-semibold text-slate-600 mb-1">{t("stories.note")}</label>
        <textarea id="st-note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("stories.notePh")} maxLength={1000} className={inputClass} />
      </div>

      {/* honeypot: ಮಾನವರಿಗೆ ಕಾಣುವುದಿಲ್ಲ */}
      <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div>
        <span className="block text-xs font-semibold text-slate-600 mb-1">{t("stories.media")}</span>
        {file && preview ? (
          <div className="relative rounded-xl overflow-hidden border bg-slate-50 max-w-sm">
            {file.type.startsWith("video/") ? (
              <video src={preview} controls playsInline className="w-full max-h-64 bg-black" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="w-full max-h-64 object-cover" />
            )}
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              className="absolute top-2 right-2 bg-black/70 text-white text-xs font-semibold px-2.5 py-1 rounded-full"
            >
              {t("stories.mediaRemove")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-emerald-300 rounded-xl py-6 flex flex-col items-center gap-1 text-emerald-700 hover:bg-emerald-50"
          >
            <ImagePlus className="w-7 h-7" />
            <span className="font-semibold text-sm">{t("stories.mediaPick")}</span>
            <span className="text-[11px] text-slate-500">{t("stories.mediaHint")}</span>
          </button>
        )}
        <input ref={inputRef} type="file" accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")} onChange={pickFile} className="hidden" aria-label={t("stories.mediaPick")} />
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {status === "uploading" ? t("stories.uploading") : status === "submitting" ? t("stories.submitting") : t("stories.submit")}
      </button>
      <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 flex-none mt-0.5" /> {t("stories.moderationNote")}
      </p>
    </form>
  );
}

export default function StoriesPage() {
  const { t } = useLanguage();
  const [stories, setStories] = useState<FarmerStory[] | null>(null);
  const [pending, setPending] = useState<FarmerStory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [isAdmin] = useAdminMode();

  useEffect(() => {
    let active = true;
    loadApprovedStories().then((data) => active && setStories(data));
    return () => {
      active = false;
    };
  }, []);

  // ಅಡ್ಮಿನ್ ಮೋಡ್: ಅನುಮೋದನೆ ಬಾಕಿ ಇರುವ ಕಥೆಗಳು
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    listPendingStories().then((res) => {
      if (active && res && "stories" in res) setPending(res.stories as FarmerStory[]);
    });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const refresh = useCallback(async () => {
    setStories(await loadApprovedStories());
    const res = await listPendingStories();
    if (res && "stories" in res) setPending(res.stories as FarmerStory[]);
  }, []);

  const adminActions = (story: FarmerStory) =>
    isAdmin ? (
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-amber-300">
        {story.status === "pending" ? (
          <button
            type="button"
            onClick={async () => {
              await approveStory(story.id);
              refresh();
            }}
            className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1.5 rounded-full"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> ಪ್ರಕಟಿಸಿ
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm(`"${story.farmer_name}" ಅವರ ಅನುಭವವನ್ನು ಅಳಿಸಬೇಕೆ? ಫೋಟೋ/ವಿಡಿಯೋ ಕೂಡ ಅಳಿಸಲ್ಪಡುತ್ತದೆ.`)) return;
            await deleteStory(story.id);
            refresh();
          }}
          className="flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 rounded-full"
        >
          <Trash2 className="w-3.5 h-3.5" /> ಅಳಿಸಿ
        </button>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
      <PageHeader title={t("stories.title")} />

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        <section className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{t("stories.title")}</h1>
            <p className="text-sm text-emerald-100">{t("stories.subtitle")}</p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setThanks(false);
              }}
              className="flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-5 py-2.5 rounded-full text-sm flex-none"
            >
              <PenLine className="w-4 h-4" /> {t("stories.share")}
            </button>
          )}
        </section>

        {thanks && (
          <p role="status" className="flex items-start gap-2 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 flex-none" /> {t("stories.thanks")}
          </p>
        )}

        {showForm && (
          <StoryForm
            onClose={() => setShowForm(false)}
            onSubmitted={() => {
              setShowForm(false);
              setThanks(true);
              if (isAdmin) refresh();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {isAdmin && pending.length > 0 && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-amber-900">ಅನುಮೋದನೆ ಬಾಕಿ ({pending.length}) — ಅಡ್ಮಿನ್‌ಗೆ ಮಾತ್ರ ಕಾಣಿಸುತ್ತದೆ</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pending.map((s) => (
                <StoryCard key={s.id} story={s} footer={adminActions(s)} />
              ))}
            </div>
          </section>
        )}

        {stories === null ? (
          <div className="flex items-center justify-center gap-2 py-16 text-emerald-700 font-semibold">
            <Loader2 className="w-5 h-5 animate-spin" /> {t("stories.loading")}
          </div>
        ) : stories.length === 0 ? (
          <div className="bg-white border border-dashed rounded-2xl py-14 px-6 text-center text-slate-500 text-sm">{t("stories.empty")}</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stories.map((s) => (
              <StoryCard key={s.id} story={s} footer={adminActions(s)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
