"use client";

import React from "react";
import { MapPin, Sprout } from "lucide-react";
import { useLanguage } from "../i18n/LanguageProvider";
import type { FarmerStory } from "@/lib/stories";

// ರೈತರ ಅನುಭವದ ಕಾರ್ಡ್: ಫೋಟೋ/ವಿಡಿಯೋ, ಬೆಳೆ, ಬಳಸಿದ ಉತ್ಪನ್ನ, ಅಭಿಪ್ರಾಯ, ರೈತರ ಹೆಸರು ಮತ್ತು ಊರು
export default function StoryCard({ story, footer, compact = false }: { story: FarmerStory; footer?: React.ReactNode; compact?: boolean }) {
  const { t, lang } = useLanguage();
  const date = new Date(story.created_at).toLocaleDateString(lang === "kn" ? "kn-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
      {story.media_url ? (
        <div className="aspect-[4/3] bg-slate-100">
          {story.media_type === "video" ? (
            <video src={story.media_url} controls playsInline preload="metadata" className="w-full h-full object-cover bg-black" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.media_url} alt={story.crop || story.farmer_name} loading="lazy" className="w-full h-full object-cover" />
          )}
        </div>
      ) : (
        <div className="h-16 bg-gradient-to-r from-emerald-600 to-emerald-800 flex items-center px-4">
          <Sprout className="w-7 h-7 text-white/80" />
        </div>
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex flex-wrap gap-1.5">
          {story.crop && <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">{story.crop}</span>}
          {story.product && (
            <span className="text-[11px] font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded">
              {t("stories.usedProduct")}: {story.product}
            </span>
          )}
        </div>
        <p className={`text-sm text-slate-700 leading-relaxed whitespace-pre-line ${compact ? "line-clamp-3" : ""}`}>“{story.note}”</p>
        <div className="mt-auto pt-2 flex items-center gap-2 text-xs text-slate-500">
          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] flex-none">
            {story.farmer_name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <b className="text-slate-800 block truncate">{story.farmer_name}</b>
            <span className="flex items-center gap-1">
              {story.village && (
                <>
                  <MapPin className="w-3 h-3" /> <span className="truncate">{story.village}</span> ·
                </>
              )}
              <span className="whitespace-nowrap">{date}</span>
            </span>
          </span>
        </div>
        {footer}
      </div>
    </article>
  );
}
