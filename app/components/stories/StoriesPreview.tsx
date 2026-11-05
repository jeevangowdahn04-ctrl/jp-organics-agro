"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PenLine, Sprout } from "lucide-react";
import StoryCard from "./StoryCard";
import { useLanguage } from "../i18n/LanguageProvider";
import { loadApprovedStories, type FarmerStory } from "@/lib/stories";

// ಮುಖಪುಟದ "ರೈತರ ಅನುಭವ & ಫಲಿತಾಂಶಗಳು" ಭಾಗ: ಇತ್ತೀಚಿನ 3 ಕಥೆಗಳು + ಹಂಚಿಕೊಳ್ಳುವ ಬಟನ್
export default function StoriesPreview() {
  const { t } = useLanguage();
  const [stories, setStories] = useState<FarmerStory[]>([]);

  useEffect(() => {
    let active = true;
    loadApprovedStories(3).then((data) => active && setStories(data));
    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="stories" className="max-w-6xl mx-auto px-4 py-8 scroll-mt-24">
      <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Sprout className="w-5 h-5 text-emerald-600" /> {t("stories.homeTitle")}
        </h3>
        {stories.length > 0 && (
          <Link href="/stories" className="text-sm font-semibold text-emerald-700 hover:underline">
            {t("stories.viewAll")}
          </Link>
        )}
      </div>

      {stories.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {stories.map((s) => (
            <StoryCard key={s.id} story={s} compact />
          ))}
        </div>
      )}

      <Link
        href="/stories"
        className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 hover:bg-emerald-100 transition"
      >
        <p className="text-sm text-emerald-900 text-center sm:text-left">{t("stories.homeCta")}</p>
        <span className="flex items-center gap-2 bg-amber-400 text-slate-900 font-bold px-4 py-2 rounded-full text-sm flex-none">
          <PenLine className="w-4 h-4" /> {t("stories.share")}
        </span>
      </Link>
    </section>
  );
}
