"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useLanguage } from "../i18n/LanguageProvider";
import { AVATAR_SIZE } from "@/lib/avatar";

// ಪ್ರೊಫೈಲ್ ಫೋಟೋ ಎಡಿಟರ್: ವೃತ್ತಾಕಾರದ ಕ್ರಾಪ್, ಎಳೆದು ಸರಿಸುವುದು, ಜೂಮ್ (ಸ್ಲೈಡರ್ / ಎರಡು ಬೆರಳು / ಮೌಸ್ ವೀಲ್), 90° ತಿರುಗಿಸುವುದು.
// ಉಳಿಸಿದಾಗ 256px JPEG data URL ಕೊಡುತ್ತದೆ (ಅದು ಸಮುದಾಯ ಪ್ರೊಫೈಲ್ ಮೂಲಕ Supabase Storage ಗೂ ಹೋಗುತ್ತದೆ).

const VIEW = 280; // ಎಡಿಟರ್ ಚೌಕದ ಗಾತ್ರ (CSS px)
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

interface View {
  zoom: number;
  rotation: number; // 0 | 90 | 180 | 270
  x: number; // ಮಧ್ಯದಿಂದ ಸರಿಸಿದ ದೂರ (ಎಡಿಟರ್ px)
  y: number;
}

function geometry(img: HTMLImageElement, v: View) {
  const sideways = v.rotation % 180 !== 0;
  const w = sideways ? img.naturalHeight : img.naturalWidth;
  const h = sideways ? img.naturalWidth : img.naturalHeight;
  const base = VIEW / Math.min(w, h); // zoom 1 = ವೃತ್ತವನ್ನು ಪೂರ್ತಿ ಮುಚ್ಚುವಷ್ಟು
  const scale = base * v.zoom;
  return { scale, maxX: Math.max(0, (w * scale - VIEW) / 2), maxY: Math.max(0, (h * scale - VIEW) / 2) };
}

// ಫೋಟೋ ವೃತ್ತದ ಹೊರಗೆ ಖಾಲಿ ಜಾಗ ಬಿಡದಂತೆ ಸ್ಥಾನ ಮಿತಿಗೊಳಿಸುವುದು
function clamp(img: HTMLImageElement, v: View): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom));
  const g = geometry(img, { ...v, zoom });
  return { ...v, zoom, x: Math.max(-g.maxX, Math.min(g.maxX, v.x)), y: Math.max(-g.maxY, Math.min(g.maxY, v.y)) };
}

function draw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, v: View, size: number) {
  const k = size / VIEW;
  const { scale } = geometry(img, v);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2 + v.x * k, size / 2 + v.y * k);
  ctx.rotate((v.rotation * Math.PI) / 180);
  const s = scale * k;
  ctx.drawImage(img, (-img.naturalWidth * s) / 2, (-img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
  ctx.restore();
}

export default function AvatarEditor({ file, onCancel, onSave }: { file: File; onCancel: () => void; onSave: (dataUrl: string) => void }) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>({ zoom: 1, rotation: 0, x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  // ಫೈಲ್ ಅನ್ನು ಚಿತ್ರವಾಗಿ ತೆರೆಯುವುದು
  useEffect(() => {
    let active = true;
    const url = URL.createObjectURL(file);
    const el = new Image();
    // ರದ್ದಾದ ಹಳೆಯ ಲೋಡ್‌ನ ಫಲಿತಾಂಶವನ್ನು ಕಡೆಗಣಿಸುವುದು
    el.onload = () => active && setImg(el);
    el.onerror = () => active && setFailed(true);
    el.src = url;
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // ಪೂರ್ವವೀಕ್ಷಣೆ ಚಿತ್ರಿಸುವುದು (ರೆಟಿನಾ ಪರದೆಗೆ ತಕ್ಕಂತೆ)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = VIEW * dpr;
    canvas.height = VIEW * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) draw(ctx, img, view, VIEW * dpr);
  }, [img, view]);

  // Esc = ರದ್ದು
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const update = (fn: (v: View) => View) => img && setView((v) => clamp(img, fn(v)));

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const ratio = Math.hypot(a.x - b.x, a.y - b.y) / (pinch.current.dist || 1);
      const zoom = pinch.current.zoom * ratio;
      update((v) => ({ ...v, zoom }));
    } else if (pointers.current.size === 1) {
      // ಪರದೆಯ px → ಎಡಿಟರ್ px (ಚಿಕ್ಕ ಪರದೆಯಲ್ಲಿ ಎಡಿಟರ್ ಕುಗ್ಗಿರಬಹುದು)
      const k = VIEW / e.currentTarget.getBoundingClientRect().width;
      update((v) => ({ ...v, x: v.x + (next.x - prev.x) * k, y: v.y + (next.y - prev.y) * k }));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  const onWheel = (e: React.WheelEvent) => update((v) => ({ ...v, zoom: v.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08) }));

  const rotate = (dir: 1 | -1) => update((v) => ({ zoom: v.zoom, rotation: (v.rotation + dir * 90 + 360) % 360, x: 0, y: 0 }));

  const save = () => {
    if (!img) return;
    setSaving(true);
    const out = document.createElement("canvas");
    out.width = AVATAR_SIZE;
    out.height = AVATAR_SIZE;
    const ctx = out.getContext("2d");
    if (!ctx) return setFailed(true);
    draw(ctx, img, view, AVATAR_SIZE);
    onSave(out.toDataURL("image/jpeg", 0.85));
  };

  const iconBtn = "w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40";

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("photo.editTitle")}
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-slate-900 w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="font-bold">{t("photo.editTitle")}</p>
          <button type="button" onClick={onCancel} aria-label={t("photo.cancel")} className="p-1 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {failed ? (
            <p className="text-sm text-red-600 text-center py-10">{t("photo.error")}</p>
          ) : (
            <>
              <div
                className="relative mx-auto w-full max-w-[280px] aspect-square bg-slate-900 rounded-xl overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onWheel={onWheel}
              >
                <canvas ref={canvasRef} className="w-full h-full block" aria-label={t("photo.dragHint")} />
                {/* ವೃತ್ತದ ಹೊರಗಿನ ಭಾಗ ಮಸುಕು */}
                <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] ring-2 ring-white/90" />
                {!img && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <Loader2 className="w-7 h-7 animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 text-center">{t("photo.dragHint")}</p>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => update((v) => ({ ...v, zoom: v.zoom / 1.2 }))} disabled={!img} aria-label={t("photo.zoomOut")} className={iconBtn}>
                  <ZoomOut className="w-4 h-4" />
                </button>
                <label className="flex-1">
                  <span className="sr-only">{t("photo.zoom")}</span>
                  <input
                    type="range"
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={0.01}
                    value={view.zoom}
                    disabled={!img}
                    onChange={(e) => {
                      const zoom = Number(e.target.value);
                      update((v) => ({ ...v, zoom }));
                    }}
                    className="w-full accent-emerald-600"
                  />
                </label>
                <button type="button" onClick={() => update((v) => ({ ...v, zoom: v.zoom * 1.2 }))} disabled={!img} aria-label={t("photo.zoomIn")} className={iconBtn}>
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button type="button" onClick={() => rotate(-1)} disabled={!img} className="flex items-center gap-1.5 text-sm font-semibold border border-slate-300 rounded-full px-3 py-2 hover:bg-slate-50 disabled:opacity-40">
                  <RotateCcw className="w-4 h-4" /> {t("photo.rotateLeft")}
                </button>
                <button type="button" onClick={() => rotate(1)} disabled={!img} className="flex items-center gap-1.5 text-sm font-semibold border border-slate-300 rounded-full px-3 py-2 hover:bg-slate-50 disabled:opacity-40">
                  <RotateCw className="w-4 h-4" /> {t("photo.rotateRight")}
                </button>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={onCancel} className="py-2.5 rounded-xl border border-slate-300 font-semibold hover:bg-slate-50">
              {t("photo.cancel")}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!img || saving || failed}
              className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {t("photo.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
