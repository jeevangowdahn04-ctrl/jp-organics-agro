"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  alt: string;
  startIndex: number;
  onClose: () => void;
}

// Amazon / Flipkart ಮಾದರಿಯ ಪೂರ್ಣ ಪರದೆ ಫೋಟೋ ವೀಕ್ಷಕ: ಬಾಣಗಳು, swipe, thumbnails, zoom, Esc ನಿಂದ ಮುಚ್ಚುವುದು
export default function ImageLightbox({ images, alt, startIndex, onClose }: ImageLightboxProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const count = images.length;

  const goTo = (i: number, smooth = true) => {
    const track = trackRef.current;
    if (!track) return;
    const next = (i + count) % count;
    setZoomed(false);
    setIndex(next);
    track.scrollTo({ left: next * track.clientWidth, behavior: smooth ? "smooth" : "auto" });
  };

  // ತೆರೆದಾಗ ಆಯ್ಕೆ ಮಾಡಿದ ಫೋಟೋಗೆ ನೇರವಾಗಿ ಹೋಗುವುದು
  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = startIndex * track.clientWidth;
  }, [startIndex]);

  // ಹಿನ್ನೆಲೆ ಪೇಜ್ scroll ಆಗದಂತೆ ತಡೆಯುವುದು, ಮತ್ತು ಕೀಬೋರ್ಡ್ ನಿಯಂತ್ರಣ (Esc / ← / →)
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") document.getElementById("lightbox-next")?.click();
      else if (e.key === "ArrowLeft") document.getElementById("lightbox-prev")?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // ಸಕ್ರಿಯ thumbnail ಯಾವಾಗಲೂ ಕಾಣಿಸುವಂತೆ
  useEffect(() => {
    const thumb = thumbsRef.current?.children[index] as HTMLElement | undefined;
    thumb?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== index) {
      setIndex(i);
      setZoomed(false);
    }
  };

  // ಫೋಟೋ ಮೇಲೆ ಕ್ಲಿಕ್: ಕ್ಲಿಕ್ ಮಾಡಿದ ಜಾಗದಲ್ಲಿ 2x zoom; ಮತ್ತೆ ಕ್ಲಿಕ್ ಮಾಡಿದರೆ ಸಾಮಾನ್ಯ
  const toggleZoom = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - rect.left) / rect.width) * 100}% ${((e.clientY - rect.top) / rect.height) * 100}%`);
    setZoomed((z) => !z);
  };

  // zoom ಆದಾಗ mouse ಚಲನೆಗೆ ತಕ್ಕಂತೆ ಫೋಟೋ ಸರಿಸುವುದು (desktop)
  const pan = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - rect.left) / rect.width) * 100}% ${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

  const arrowClass =
    "absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 md:w-12 md:h-12 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-lg flex items-center justify-center transition disabled:opacity-0";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} ಫೋಟೋಗಳು`}
      className="fixed inset-0 z-[100] bg-black flex flex-col select-none"
    >
      {/* ಮೇಲ್ಭಾಗದ ಪಟ್ಟಿ: ಹೆಸರು, ಎಣಿಕೆ, zoom, ಮುಚ್ಚು */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 text-white">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{alt}</p>
          <p className="text-xs text-white/60">
            {index + 1} / {count}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <button
            type="button"
            onClick={() => {
              setOrigin("50% 50%");
              setZoomed((z) => !z);
            }}
            aria-label={zoomed ? "Zoom out" : "Zoom in"}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            {zoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="ಮುಚ್ಚಿ (Close)"
            autoFocus
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* ಮುಖ್ಯ ದೊಡ್ಡ ಫೋಟೋ: swipe / scroll ಮಾಡಬಹುದು */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className={`flex w-full h-full snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${zoomed ? "overflow-hidden" : "overflow-x-auto"}`}
        >
          {images.map((src, i) => (
            <div key={src + i} className="w-full h-full flex-none snap-center flex items-center justify-center overflow-hidden px-2 sm:px-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${alt} (${i + 1}/${count})`}
                draggable={false}
                onClick={toggleZoom}
                onMouseMove={pan}
                style={{ transformOrigin: i === index ? origin : "50% 50%" }}
                className={`w-full h-full object-contain transition-transform duration-200 ${
                  i === index && zoomed ? "scale-[2.2] cursor-zoom-out" : "scale-100 cursor-zoom-in"
                }`}
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              id="lightbox-prev"
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="ಹಿಂದಿನ ಫೋಟೋ (Previous)"
              className={`${arrowClass} left-2 sm:left-4`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              id="lightbox-next"
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="ಮುಂದಿನ ಫೋಟೋ (Next)"
              className={`${arrowClass} right-2 sm:right-4`}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* ಕೆಳಗಿನ thumbnails ಸಾಲು */}
      {count > 1 && (
        <div
          ref={thumbsRef}
          className="flex gap-2 justify-start sm:justify-center overflow-x-auto px-3 py-3 [scrollbar-width:thin]"
        >
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => goTo(i, false)}
              aria-label={`ಫೋಟೋ ${i + 1} ತೋರಿಸಿ`}
              aria-current={i === index}
              className={`flex-none w-14 h-14 sm:w-16 sm:h-16 rounded-md overflow-hidden border-2 transition ${
                i === index ? "border-amber-400 opacity-100" : "border-transparent opacity-50 hover:opacity-90"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
