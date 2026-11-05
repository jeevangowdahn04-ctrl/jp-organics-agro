"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProductImages, getYouTubeId } from "@/lib/media";
import ImageCarousel from "./components/ImageCarousel";
import CartButton from "./components/cart/CartButton";
import { useCart } from "./components/cart/CartProvider";
import { useCustomer } from "./components/customer/CustomerProvider";
import ProfileButton from "./components/customer/ProfileButton";
import LanguageSwitcher from "./components/i18n/LanguageSwitcher";
import { AdminBar, AdminPanel, CardAdminControls, useAdminMode, useAdminPanel } from "./components/admin/InlineAdmin";
import { useLanguage } from "./components/i18n/LanguageProvider";
import { formatRupees, WHATSAPP_NUMBER } from "@/lib/whatsapp";
import { discountPercent, isInStock } from "@/lib/pricing";
import { translate, type TranslationKey } from "@/lib/i18n";
import { localizeProduct, searchableText } from "@/lib/localize";
import {
  Search, ShoppingCart, Phone, MapPin,
  Leaf, ShieldCheck, Sprout, Wrench,
  Star, Truck, Award, CheckCircle, MessageCircle, X, Loader2, PlayCircle,
} from "lucide-react";

interface Product {
  id: number | string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  mrp?: number;
  weight?: string;
  rating?: number;
  tag?: string;
  in_stock?: boolean | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  video_url?: string | null;
  name_en?: string | null;
  category_en?: string | null;
  description_en?: string | null;
}

const CATEGORIES: { key: TranslationKey; icon: typeof Leaf; count: number }[] = [
  { key: "cat.organic", icon: Leaf, count: 15 },
  { key: "cat.nutrients", icon: Sprout, count: 25 },
  { key: "cat.protection", icon: ShieldCheck, count: 30 },
  { key: "cat.tools", icon: Wrench, count: 10 },
];

async function loadProducts(): Promise<Product[] | null> {
  try {
    const { data, error } = await supabase.from("products").select("*").order("id", { ascending: false });
    if (error) {
      console.error("Error fetching products:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("Fetch error:", err);
    return null;
  }
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryKey, setCategoryKey] = useState<TranslationKey | null>(null);
  const { addItem } = useCart();
  const { requireLogin } = useCustomer();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [videoProduct, setVideoProduct] = useState<Product | null>(null);
  const videoYouTubeId = videoProduct?.video_url ? getYouTubeId(videoProduct.video_url) : null;

  // Supabase ನಿಂದ ಪ್ರಾಡಕ್ಟ್‌ಗಳನ್ನು ತರುವುದು
  useEffect(() => {
    let active = true;
    loadProducts().then((data) => {
      if (!active) return;
      if (data) setProducts(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  // ಅಡ್ಮಿನ್ ಬದಲಾವಣೆಯ (ಸೇರಿಸು/ಎಡಿಟ್/ಅಳಿಸು/ಸ್ಟಾಕ್) ನಂತರ ಪಟ್ಟಿಯನ್ನು ಮತ್ತೆ ತರುವುದು
  const fetchProducts = useCallback(async () => {
    const data = await loadProducts();
    if (data) setProducts(data);
  }, []);

  const [isAdmin, setIsAdmin] = useAdminMode();
  const adminPanel = useAdminPanel();

  // ಹುಡುಕಾಟ (ಹೆಸರು, ವರ್ಗ, ವಿವರಣೆ) + ವರ್ಗ ಫಿಲ್ಟರ್ (ವರ್ಗದ ಹೆಸರು ಕನ್ನಡ ಅಥವಾ English ಎರಡರಲ್ಲೂ ಹೊಂದುತ್ತದೆ)
  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const catNames = categoryKey ? [translate("kn", categoryKey), translate("en", categoryKey)].map((s) => s.toLowerCase()) : [];
    return products.filter((p) => {
      if (q && !searchableText(p).includes(q)) return false;
      const productCats = [p.category, p.category_en].map((c) => c?.toLowerCase() ?? "");
      if (catNames.length && !catNames.some((c) => productCats.some((pc) => pc.includes(c)))) return false;
      return true;
    });
  }, [products, query, categoryKey]);
  const activeFilter = categoryKey ? t(categoryKey) : query;
  const clearFilter = () => {
    setQuery("");
    setCategoryKey(null);
  };

  const addToCart = (product: Product) =>
    requireLogin(
      () =>
        addItem({
          id: product.id,
          name: product.name,
          nameEn: product.name_en,
          price: Number(product.price),
          weight: product.weight,
          image: getProductImages(product)[0] ?? null,
        }),
      t("login.reasonCart")
    );

  const searchBox = (className: string) => (
    <div className={`relative flex items-center ${className}`}>
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCategoryKey(null);
        }}
        onKeyDown={(e) => e.key === "Enter" && document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
        placeholder={t("header.search")}
        aria-label={t("header.search")}
        className="w-full pl-10 pr-4 py-2 border rounded-full text-sm bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
      />
      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative pb-16 md:pb-0">
      {/* Top Banner */}
      <div className="bg-emerald-900 text-white text-xs py-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>{t("banner.location")}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t("banner.call")}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 flex-none">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow">
              JP
            </div>
            <div className="hidden min-[380px]:block">
              <h1 className="font-bold text-lg leading-tight text-emerald-800">JP ORGANICS</h1>
              <p className="text-[10px] tracking-wider text-slate-500 font-semibold uppercase">{t("header.tagline")}</p>
            </div>
          </Link>

          {searchBox("flex-1 max-w-md hidden md:flex")}

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <a
              href="tel:7795198610"
              aria-label={t("header.helpline")}
              className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden lg:inline">{t("header.helpline")}</span>
            </a>
            <ProfileButton />
            <CartButton />
          </div>
        </div>
        <div className="px-4 pb-3 md:hidden">{searchBox("w-full")}</div>
      </header>

      {isAdmin && (
        <AdminBar onAdd={adminPanel.openAdd} onOpenPanel={adminPanel.openAdd} onLoggedOut={() => setIsAdmin(false)} />
      )}

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <span className="inline-block bg-emerald-700/80 text-emerald-200 text-xs px-3 py-1 rounded-full font-medium border border-emerald-600">
              {t("hero.badge")}
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">
              {t("hero.title1")} <br />
              <span className="text-amber-400">{t("hero.title2")}</span>
            </h2>
            <p className="text-emerald-100 text-sm md:text-base leading-relaxed">{t("hero.subtitle")}</p>
            <div className="pt-2 flex flex-wrap gap-3 justify-center md:justify-start">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t("hero.whatsappText"))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow flex items-center gap-2 transition"
              >
                <MessageCircle className="w-4 h-4" /> {t("hero.whatsapp")}
              </a>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 w-full md:w-80 space-y-4">
            <h3 className="font-bold text-base text-amber-300 flex items-center gap-2">
              <Award className="w-5 h-5" /> {t("promise.title")}
            </h3>
            <div className="space-y-3 text-xs text-slate-100">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{t("promise.pure")}</span>
              </div>
              <div className="flex items-start gap-2">
                <Truck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{t("promise.delivery")}</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{t("promise.guidance")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="max-w-6xl mx-auto px-4 py-10 scroll-mt-24">
        <h3 className="text-xl font-bold text-slate-800 mb-6">{t("categories.title")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <button
                type="button"
                key={cat.key}
                onClick={() => {
                  setQuery("");
                  setCategoryKey(cat.key);
                  document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition cursor-pointer flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <IconComponent className="w-6 h-6 text-emerald-700" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 mb-1">{t(cat.key)}</h4>
                <p className="text-xs text-slate-400">{t("cat.count", { n: cat.count })}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Dynamic Products from Supabase */}
      <section id="products" className="max-w-6xl mx-auto px-4 py-8 scroll-mt-24">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <h3 className="text-xl font-bold text-slate-800">{t("products.title")}</h3>
          {activeFilter && (
            <button
              type="button"
              onClick={clearFilter}
              className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-emerald-100"
            >
              &quot;{activeFilter}&quot; <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-emerald-700 font-semibold gap-2">
            <Loader2 className="w-6 h-6 animate-spin" /> {t("products.loading")}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm">
            {activeFilter ? t("products.noMatch", { q: activeFilter }) : t("products.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleProducts.map((item) => {
              const off = discountPercent(item.price, item.mrp);
              const inStock = isInStock(item);
              const text = localizeProduct(item, lang);
              return (
                <div
                  key={item.id}
                  // ಕಾರ್ಡ್‌ನ ಎಲ್ಲಿ ಕ್ಲಿಕ್ ಮಾಡಿದರೂ ವಿವರ ಪೇಜ್ (ಒಳಗಿನ ಬಟನ್/ಲಿಂಕ್‌ಗಳನ್ನು ಬಿಟ್ಟು)
                  onClick={(e) => {
                    if (!(e.target as HTMLElement).closest("a, button")) router.push(`/products/${item.id}`);
                  }}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition flex flex-col justify-between cursor-pointer"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                        {item.tag || "Organic"}
                      </span>
                      {item.rating ? (
                        <div className="flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                          {item.rating}
                        </div>
                      ) : null}
                    </div>

                    <div className="relative h-44 bg-slate-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                      {off > 0 && (
                        <span className="absolute bottom-2 left-2 z-10 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow">
                          {t("price.off", { n: off })}
                        </span>
                      )}
                      {!inStock && (
                        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 text-white text-xs font-bold text-center py-1 pointer-events-none">
                          {t("stock.outBanner")}
                        </span>
                      )}
                      {getProductImages(item).length > 0 ? (
                        <ImageCarousel images={getProductImages(item)} alt={text.name} href={`/products/${item.id}`} className="w-full h-full" />
                      ) : (
                        <Link href={`/products/${item.id}`} aria-label={text.name} className="w-full h-full flex items-center justify-center">
                          <Sprout className="w-12 h-12 text-emerald-500" />
                        </Link>
                      )}
                      {item.video_url && (
                        <button
                          onClick={() => setVideoProduct(item)}
                          className="absolute top-2 left-2 bg-black/70 hover:bg-black/85 text-white text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1 transition"
                        >
                          <PlayCircle className="w-3.5 h-3.5" /> {t("product.watchVideo")}
                        </button>
                      )}
                    </div>

                    <span className="text-[11px] font-semibold text-emerald-600 uppercase">
                      {text.category || t("products.defaultCategory")}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 mt-1 line-clamp-2">
                      <Link href={`/products/${item.id}`} className="hover:text-emerald-700 hover:underline">
                        {text.name}
                      </Link>
                    </h4>
                    {text.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{text.description}</p>
                    )}
                    {item.weight && (
                      <p className="text-xs text-slate-400 mt-1 font-medium">
                        {t("product.packing")}: {item.weight}
                      </p>
                    )}
                    <Link
                      href={`/products/${item.id}`}
                      className="inline-block text-xs font-semibold text-emerald-700 hover:underline mt-2"
                    >
                      {t("product.viewDetails")}
                    </Link>
                  </div>

                  <div className="p-4 pt-0 border-t border-slate-100">
                    <div className="flex items-baseline gap-2 flex-wrap mt-3 mb-1">
                      {off > 0 && <span className="text-base font-light text-red-600">-{off}%</span>}
                      <span className="text-xl font-extrabold text-slate-900">{formatRupees(Number(item.price))}</span>
                    </div>
                    {off > 0 && (
                      <p className="text-[11px] text-slate-500 -mt-0.5 mb-1">
                        {t("price.mrp")}: <span className="line-through">{formatRupees(Number(item.mrp))}</span>
                      </p>
                    )}
                    <p className={`text-[11px] font-semibold mb-3 ${inStock ? "text-emerald-700" : "text-red-600"}`}>
                      {inStock ? t("stock.in") : t("stock.out")}
                    </p>
                    <button
                      onClick={() => addToCart(item)}
                      disabled={!inStock}
                      className="w-full bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-900 font-bold py-2 rounded-full text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      {inStock ? t("btn.addToCart") : t("stock.unavailable")}
                    </button>
                    {isAdmin && (
                      <CardAdminControls
                        product={{ id: item.id, name: text.name }}
                        inStock={inStock}
                        onEdit={() => adminPanel.openEdit(item.id)}
                        onChanged={fetchProducts}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Product Video Modal */}
      {videoProduct?.video_url && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setVideoProduct(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{localizeProduct(videoProduct, lang).name}</h3>
              <button
                onClick={() => setVideoProduct(null)}
                aria-label={t("btn.close")}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              {videoYouTubeId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoYouTubeId}?autoplay=1&rel=0`}
                  title={videoProduct.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <video src={videoProduct.video_url} controls autoPlay playsInline className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      )}

      {isAdmin && adminPanel.panel.open && (
        <AdminPanel
          key={adminPanel.panel.key}
          editId={adminPanel.panel.editId}
          onClose={adminPanel.close}
          onProductsChanged={fetchProducts}
        />
      )}

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 text-slate-300 mt-16 py-8 border-t border-slate-800 text-center text-xs scroll-mt-24">
        <nav className="flex justify-center gap-6 mb-5 text-sm font-semibold">
          <a href="#" className="hover:text-white">{t("nav.home")}</a>
          <a href="#categories" className="hover:text-white">{t("nav.categories")}</a>
          <a href="tel:7795198610" className="hover:text-white">{t("nav.contact")}</a>
        </nav>
        <p className="font-bold text-sm text-white mb-2">JP ORGANICS AND AGRO CENTER</p>
        <p className="text-slate-400 mb-3">{t("footer.address")}</p>
        <div className="flex justify-center gap-3 mb-4">
          <a href="tel:7795198610" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full">
            <Phone className="w-3.5 h-3.5" /> {t("footer.call")}
          </a>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t("hero.whatsappText"))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-full"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
        </div>
        <p className="text-slate-500">{t("footer.rights")}</p>
      </footer>

    </div>
  );
}
