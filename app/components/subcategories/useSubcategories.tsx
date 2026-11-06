"use client";

import React, { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

export interface Subcategory {
  id: number;
  category_slug: string;
  name: string;
  name_en: string | null;
  logo_url: string | null;
  sort_order: number;
}

// ಉಪವರ್ಗಗಳ ಪಟ್ಟಿ: ಎಲ್ಲಾ ಕಾಂಪೊನೆಂಟ್‌ಗಳಿಗೆ ಒಂದೇ ಪ್ರತಿ. null = ಇನ್ನೂ ಲೋಡ್ ಆಗುತ್ತಿದೆ.
let subs: Subcategory[] | null = null;
let loading = false;
const listeners = new Set<() => void>();

function emit(next: Subcategory[]) {
  subs = next;
  listeners.forEach((l) => l());
}

export async function refreshSubcategories() {
  loading = true;
  const { data, error } = await supabase
    .from("subcategories")
    .select("id,category_slug,name,name_en,logo_url,sort_order")
    .order("sort_order")
    .order("name");
  loading = false;
  // ಟೇಬಲ್ ಇನ್ನೂ ಇಲ್ಲದಿದ್ದರೆ ಖಾಲಿ ಪಟ್ಟಿ
  if (error && error.code !== "42P01" && error.code !== "PGRST205") console.error("subcategories load failed:", error.message);
  emit((data as Subcategory[] | null) ?? []);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (subs === null && !loading) refreshSubcategories();
  return () => {
    listeners.delete(listener);
  };
}

export function useSubcategories(): Subcategory[] | null {
  return useSyncExternalStore(subscribe, () => subs, () => null);
}

export const subName = (s: Pick<Subcategory, "name" | "name_en">, lang: string) => (lang === "en" && s.name_en ? s.name_en : s.name);

export function SubLogo({ sub, className = "w-10 h-10", lang = "kn" }: { sub: Pick<Subcategory, "name" | "name_en" | "logo_url">; className?: string; lang?: string }) {
  const label = subName(sub, lang);
  return sub.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={sub.logo_url} alt={label} loading="lazy" className={`flex-none rounded-full object-cover bg-white ring-1 ring-slate-200 ${className}`} />
  ) : (
    <span className={`flex-none rounded-full bg-emerald-50 ring-1 ring-emerald-100 text-emerald-800 font-bold flex items-center justify-center ${className}`}>
      {label.trim().charAt(0).toUpperCase()}
    </span>
  );
}
