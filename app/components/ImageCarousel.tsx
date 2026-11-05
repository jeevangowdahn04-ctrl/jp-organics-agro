"use client";

import React, { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import ImageLightbox from "./ImageLightbox";

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  // ದೊಡ್ಡ ಗ್ಯಾಲರಿಯಲ್ಲಿ (ವಿವರ ಪೇಜ್) ಕೆಳಗೆ thumbnails ತೋರಿಸಲು
  showThumbnails?: boolean;
  // ಕೊಟ್ಟರೆ ಫೋಟೋ ಕ್ಲಿಕ್ ಈ ಪೇಜ್ ತೆರೆಯುತ್ತದೆ (ಮುಖಪುಟದ ಕಾರ್ಡ್); ಇಲ್ಲದಿದ್ದರೆ ಪೂರ್ಣ ಪರದೆ ವೀಕ್ಷಕ
  href?: string;
  // ಫೋಟೋ ಮೇಲೆ ಹೆಚ್ಚುವರಿ ಬಟನ್‌ಗಳು (ಉದಾ: Share)
  overlay?: React.ReactNode;
}

// ಫೋಟೋಗಳನ್ನು ಅಕ್ಕಪಕ್ಕ swipe / scroll ಮಾಡುವ ಗ್ಯಾಲರಿ (CSS scroll-snap, ಮೊಬೈಲ್‌ನಲ್ಲಿ ಬೆರಳಿನಿಂದ swipe)
export default function ImageCarousel({ images, alt, className = "", showThumbnails = false, href, overlay }: ImageCarouselProps) {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const count = images.length;
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = (i + count) % count;
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  };

  // ಕಾರ್ಡ್ ಒಳಗಿನ ಬಟನ್ ಒತ್ತಿದಾಗ ಕಾರ್ಡ್‌ನ ಲಿಂಕ್ ತೆರೆಯಬಾರದು
  const stop = (e: React.MouseEvent, fn: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  if (count === 0) return null;

  return (
    <div className={className}>
      <div className="relative w-full h-full group">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src + i}
              src={src}
              alt={count > 1 ? `${alt} (${i + 1}/${count})` : alt}
              loading={i === 0 ? "eager" : "lazy"}
              draggable={false}
              onClick={(e) => stop(e, () => (href ? router.push(href) : setLightboxIndex(i)))}
              className={`w-full h-full flex-none snap-center object-cover select-none ${href ? "cursor-pointer" : "cursor-zoom-in"}`}
            />
          ))}
        </div>

        {overlay}

        <button
          type="button"
          onClick={(e) => stop(e, () => setLightboxIndex(index))}
          aria-label="ಫೋಟೋ ದೊಡ್ಡದಾಗಿ ನೋಡಿ"
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/85 hover:bg-white shadow flex items-center justify-center text-slate-700 transition"
        >
          <Expand className="w-3.5 h-3.5" />
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="ಹಿಂದಿನ ಫೋಟೋ"
              onClick={(e) => stop(e, () => goTo(index - 1))}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 hover:bg-white shadow flex items-center justify-center text-slate-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="ಮುಂದಿನ ಫೋಟೋ"
              onClick={(e) => stop(e, () => goTo(index + 1))}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 hover:bg-white shadow flex items-center justify-center text-slate-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="absolute top-2 right-2 bg-black/55 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {index + 1}/{count}
            </span>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`ಫೋಟೋ ${i + 1}`}
                  onClick={(e) => stop(e, () => goTo(i))}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showThumbnails && count > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`ಫೋಟೋ ${i + 1} ತೋರಿಸಿ`}
              className={`flex-none w-16 h-16 rounded-lg overflow-hidden border-2 transition ${i === index ? "border-emerald-600" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <ImageLightbox images={images} alt={alt} startIndex={lightboxIndex} onClose={closeLightbox} />
      )}
    </div>
  );
}
