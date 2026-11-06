"use client";

import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

export interface Brand {
  id: number;
  name: string;
  logo_url: string | null;
}

// ಬ್ರಾಂಡ್ ಪಟ್ಟಿ: ಎಲ್ಲಾ ಕಾಂಪೊನೆಂಟ್‌ಗಳಿಗೆ ಒಂದೇ ಪ್ರತಿ. null = ಇನ್ನೂ ಲೋಡ್ ಆಗುತ್ತಿದೆ.
let brands: Brand[] | null = null;
let loading = false;
const listeners = new Set<() => void>();

function emit(next: Brand[]) {
  brands = next;
  listeners.forEach((l) => l());
}

export async function refreshBrands() {
  loading = true;
  const { data, error } = await supabase.from("brands").select("id,name,logo_url").order("name");
  loading = false;
  // ಟೇಬಲ್ ಇನ್ನೂ ಇಲ್ಲದಿದ್ದರೆ ಖಾಲಿ ಪಟ್ಟಿ
  if (error && error.code !== "42P01" && error.code !== "PGRST205") console.error("brands load failed:", error.message);
  emit((data as Brand[] | null) ?? []);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (brands === null && !loading) refreshBrands();
  return () => {
    listeners.delete(listener);
  };
}

export function useBrands(): Brand[] | null {
  return useSyncExternalStore(subscribe, () => brands, () => null);
}

export function BrandLogo({ brand, className = "w-14 h-14" }: { brand: Pick<Brand, "name" | "logo_url">; className?: string }) {
  return brand.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brand.logo_url} alt={brand.name} loading="lazy" className={`flex-none rounded-xl object-contain bg-white ring-1 ring-slate-200 p-1 ${className}`} />
  ) : (
    <span className={`flex-none rounded-xl bg-emerald-50 ring-1 ring-emerald-100 text-emerald-800 font-bold flex items-center justify-center ${className}`}>
      {brand.name.trim().slice(0, 2).toUpperCase()}
    </span>
  );
}
