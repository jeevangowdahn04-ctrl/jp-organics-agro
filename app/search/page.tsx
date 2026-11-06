"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Search, X } from "lucide-react";
import PageHeader from "../components/PageHeader";
import FarmerCard from "../components/community/FarmerCard";
import { useLanguage } from "../components/i18n/LanguageProvider";
import { searchFarmers } from "../community/actions";
import { supabase } from "@/lib/supabase";
import { getProductImages } from "@/lib/media";
import { communityError, type FarmerProfile } from "@/lib/community";

interface ProductLite {
  id: number;
  name: string;
  name_en: string | null;
  category: string | null;
  category_en: string | null;
  price: number | null;
  weight: string | null;
  image_url: string | null;
  image_urls: string[] | null;
}

let productCache: Promise<ProductLite[]> | null = null;
function loadProducts() {
  productCache ??= Promise.resolve(
    supabase.from("products").select("id,name,name_en,category,category_en,price,weight,image_url,image_urls").order("id", { ascending: false })
  ).then(({ data }) => (data ?? []) as ProductLite[]);
  return productCache;
}

// ಹುಡುಕಿ: ರೈತರ ಪ್ರೊಫೈಲ್‌ಗಳು (ಹೆಸರು / ಊರು / ಪೂರ್ಣ ಮೊಬೈಲ್ ನಂಬರ್) ಮತ್ತು ಉತ್ಪನ್ನಗಳು
export default function SearchPage() {
  const { t, lang } = useLanguage();
  const [q, setQ] = useState("");
  const [farmers, setFarmers] = useState<FarmerProfile[] | null>(null);
  const [needFull, setNeedFull] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<ProductLite[]>([]);

  useEffect(() => {
    let active = true;
    loadProducts().then((p) => active && setProducts(p));
    return () => {
      active = false;
    };
  }, []);

  // ಟೈಪ್ ನಿಲ್ಲಿಸಿದ 300ms ನಂತರ ಹುಡುಕಾಟ
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      searchFarmers(q).then((res) => {
        if (!active) return;
        const r = res as { farmers?: FarmerProfile[]; needFullNumber?: boolean; error?: string };
        setError(r.error ? t(communityError(r.error)) : "");
        setNeedFull(!!r.needFullNumber);
        setFarmers(r.farmers ?? []);
      });
    }, q ? 300 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q, t]);

  const term = q.trim().toLowerCase();
  const productHits = useMemo(() => {
    if (!term || /^\+?\d[\d\s-]*$/.test(term)) return [];
    return products
      .filter((p) => [p.name, p.name_en, p.category, p.category_en].some((v) => v && v.toLowerCase().includes(term)))
      .slice(0, 12);
  }, [products, term]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-8">
      <PageHeader title={t("community.searchTitle")} />
      <main className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 py-4 space-y-5">
        <div className="relative sticky top-14 md:top-28 z-10 max-w-3xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("community.searchPh")}
            aria-label={t("community.searchPh")}
            autoFocus
            className="w-full bg-white border border-slate-300 rounded-full pl-11 pr-10 py-3 text-sm shadow-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label={t("community.close")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>

        {needFull && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">{t("community.fullNumber")}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {productHits.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-slate-700 mb-2">{t("community.products")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {productHits.map((p) => {
                const img = getProductImages(p)[0];
                const name = lang === "en" && p.name_en ? p.name_en : p.name;
                return (
                  <Link key={p.id} href={`/products/${p.id}`} className="bg-white border rounded-xl overflow-hidden hover:shadow">
                    <div className="aspect-square bg-slate-100">
                      {img && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={name} loading="lazy" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-semibold line-clamp-2">{name}</p>
                      <p className="text-sm font-bold text-emerald-700">
                        ₹{p.price}
                        {p.weight && <span className="text-xs font-normal text-slate-500"> / {p.weight}</span>}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-bold text-slate-700 mb-2">{q ? t("community.farmers") : t("community.newFarmers")}</h2>
          {farmers === null ? (
            <p className="text-center py-8">
              <Loader2 className="w-5 h-5 animate-spin inline text-emerald-700" />
            </p>
          ) : farmers.length === 0 ? (
            !needFull && (
              <p className="text-sm text-slate-500 text-center py-8">{q ? (productHits.length ? "" : t("community.noResults")) : t("community.noFarmersYet")}</p>
            )
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {farmers.map((f) => (
                <FarmerCard key={f.id} farmer={f} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
