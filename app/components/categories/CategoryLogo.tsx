"use client";

import React, { useSyncExternalStore } from "react";
import { BadgeCheck, Leaf, ShieldCheck, Sprout, TrendingUp, Wrench } from "lucide-react";
import type { CategoryImages, CategorySlug } from "@/lib/categories";

// ವರ್ಗಗಳ ಲೋಗೋಗಳು: ಎಲ್ಲಾ ಕಾಂಪೊನೆಂಟ್‌ಗಳಿಗೆ ಒಂದೇ ಪ್ರತಿ, ಸರ್ವರ್‌ನಿಂದ ಒಮ್ಮೆ ಮಾತ್ರ ತರುವುದು.
let images: CategoryImages = {};
let loaded = false;
let loading = false;
const listeners = new Set<() => void>();
const EMPTY: CategoryImages = {};

export function setCategoryImagesCache(next: CategoryImages) {
  images = next;
  loaded = true;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded && !loading) {
    loading = true;
    // ಕ್ಯಾಶ್ ಮಾಡಿದ ಸಾರ್ವಜನಿಕ ವಿಳಾಸ (CDN): ಪ್ರತಿ ಭೇಟಿಗೂ ಸರ್ವರ್ ಕರೆ ಬೇಡ
    fetch("/api/category-images")
      .then((r) => (r.ok ? r.json() : {}))
      .then((res) => setCategoryImagesCache((res as CategoryImages) ?? {}))
      .catch(() => {})
      .finally(() => {
        loading = false;
      });
  }
  return () => {
    listeners.delete(listener);
  };
}

export function useCategoryImages(): CategoryImages {
  return useSyncExternalStore(subscribe, () => images, () => EMPTY);
}

// ಲೋಗೋ ಇಲ್ಲದಿದ್ದಾಗ ತೋರಿಸುವ ಐಕಾನ್
const FALLBACK: Record<CategorySlug, React.ComponentType<{ className?: string }>> = {
  brands: BadgeCheck,
  seeds: Sprout,
  "yield-booster": TrendingUp,
  "crop-protection": ShieldCheck,
  "crop-nutrition": Leaf,
  equipments: Wrench,
};

export default function CategoryLogo({
  slug,
  name,
  className = "w-14 h-14",
  iconClassName = "w-7 h-7",
}: {
  slug: CategorySlug;
  name: string;
  className?: string;
  iconClassName?: string;
}) {
  const url = useCategoryImages()[slug];
  const Icon = FALLBACK[slug];
  return (
    <span className={`flex-none rounded-full bg-emerald-50 ring-1 ring-emerald-100 overflow-hidden flex items-center justify-center ${className}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} loading="lazy" className="w-full h-full object-contain bg-white p-1" />
      ) : (
        <Icon className={`text-emerald-700 ${iconClassName}`} />
      )}
    </span>
  );
}
