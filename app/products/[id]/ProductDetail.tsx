"use client";

import SiteNav from "../../components/SiteNav";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, MapPin, Minus, Phone, Plus, ShieldCheck, ShoppingCart, Sprout, Star, Truck, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getProductImages, getYouTubeId } from "@/lib/media";
import { formatRupees, whatsappOrderUrl } from "@/lib/whatsapp";
import { discountPercent, isInStock } from "@/lib/pricing";
import { localizeProduct } from "@/lib/localize";
import { saveOrder } from "@/lib/orderHistory";
import ImageCarousel from "../../components/ImageCarousel";
import CartButton from "../../components/cart/CartButton";
import ShareButton from "../../components/ShareButton";
import { MAX_QUANTITY, useCart } from "../../components/cart/CartProvider";
import { useCustomer } from "../../components/customer/CustomerProvider";
import ProfileButton from "../../components/customer/ProfileButton";
import LanguageSwitcher from "../../components/i18n/LanguageSwitcher";
import { useLanguage } from "../../components/i18n/LanguageProvider";
import { useBrands } from "../../components/brands/useBrands";
import { subName, useSubcategories } from "../../components/subcategories/useSubcategories";

interface Product {
  id: number | string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  mrp?: number;
  weight?: string;
  tag?: string;
  rating?: number | null;
  in_stock?: boolean | null;
  highlights?: string | null;
  name_en?: string | null;
  category_en?: string | null;
  brand_id?: number | null;
  subcategory_id?: number | null;
  description_en?: string | null;
  highlights_en?: unknown;
  image_url?: string | null;
  image_urls?: string[] | null;
  video_url?: string | null;
}

type LoadState = { status: "loading" } | { status: "missing" } | { status: "ready"; product: Product; related: Product[] };

async function loadProduct(id: string): Promise<LoadState> {
  const [{ data, error }, { data: others }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("products").select("*").neq("id", id).order("id", { ascending: false }).limit(12),
  ]);
  if (error || !data) return { status: "missing" };
  // ಅದೇ ವಿಭಾಗದ (category) ಉತ್ಪನ್ನಗಳು ಮೊದಲು
  const related = [...(others ?? [])].sort(
    (a: Product, b: Product) => Number(b.category === data.category) - Number(a.category === data.category)
  );
  return { status: "ready", product: data, related };
}

// ಬ್ರಾಂಡ್ ಆಯ್ಕೆ ಮಾಡದ ಪ್ರಾಡಕ್ಟ್‌ಗಳಿಗೆ ತೋರಿಸುವ ಬ್ರಾಂಡ್
const BRAND = "JP Organics";

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <span className="flex items-center gap-1" aria-label={label}>
      <span className="text-sm font-semibold text-slate-700">{rating.toFixed(1)}</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-4 h-4 ${n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
        />
      ))}
    </span>
  );
}

const discountOf = (p: Product) => discountPercent(p.price, p.mrp);

export default function ProductDetail({ id }: { id: string }) {
  const brands = useBrands();
  const subcategories = useSubcategories();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { requireLogin } = useCustomer();
  const { t, lang } = useLanguage();

  useEffect(() => {
    let active = true;
    loadProduct(id).then((result) => {
      if (active) setState(result);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const header = (
    <header className="bg-emerald-900 text-white sticky top-0 z-40 shadow">
      <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold hover:text-emerald-200">
          <ArrowLeft className="w-5 h-5" /> <span className="hidden sm:inline">{t("header.allProducts")}</span>
        </Link>
        <Link href="/" className="font-bold tracking-wide hidden min-[400px]:block">JP ORGANICS</Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher dark />
          <ProfileButton dark />
          <CartButton className="bg-white/10 hover:bg-white/20 [&_svg]:text-white" />
        </div>
      </div>
      <SiteNav dark />
    </header>
  );

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50">
        {header}
        <div className="flex items-center justify-center py-32 text-emerald-700 font-semibold gap-2">
          <Loader2 className="w-6 h-6 animate-spin" /> {t("detail.loading")}
        </div>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="min-h-screen bg-slate-50">
        {header}
        <div className="flex flex-col items-center justify-center gap-4 text-slate-600 px-4 py-32 text-center">
          <p>{t("detail.missing")}</p>
          <Link href="/" className="text-emerald-700 font-semibold hover:underline">{t("detail.backHome")}</Link>
        </div>
      </div>
    );
  }

  const { product, related } = state;
  const images = getProductImages(product);
  const youTubeId = product.video_url ? getYouTubeId(product.video_url) : null;
  const price = Number(product.price);
  const discount = discountOf(product);
  const inStock = isInStock(product);
  const text = localizeProduct(product, lang);
  const points = text.highlights;
  const cartProduct = { id: product.id, name: product.name, nameEn: product.name_en, price, weight: product.weight, image: images[0] ?? null };
  const addToCart = () => requireLogin(() => addItem(cartProduct, quantity), t("login.reasonCart"));
  const buyNow = () =>
    requireLogin((customer) => {
      const lines = [{ name: text.name, price, quantity, weight: product.weight }];
      window.open(whatsappOrderUrl(lines, customer), "_blank", "noopener,noreferrer");
      saveOrder(lines, customer);
    }, t("login.reasonBuy"));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 md:pb-0">
      {header}

      <main className="max-w-6xl xl:max-w-7xl mx-auto md:px-4 md:py-6 grid md:grid-cols-2 gap-0 md:gap-8">
        {/* ಫೋಟೋ ಸ್ಲೈಡರ್ (swipe + dots + ಕ್ಲಿಕ್ ಮಾಡಿದರೆ ಪೂರ್ಣ ಪರದೆ) */}
        <section className="bg-white md:rounded-2xl md:border md:p-3 md:self-start md:sticky md:top-20">
          {images.length > 0 ? (
            <ImageCarousel
              images={images}
              alt={text.name}
              showThumbnails
              overlay={<ShareButton title={text.name} className="absolute top-2 left-2 z-10 p-2" />}
              className="w-full [&>div:first-child]:aspect-square [&>div:first-child]:md:rounded-xl [&>div:first-child]:overflow-hidden [&>div:first-child]:bg-white"
            />
          ) : (
            <div className="relative aspect-square md:rounded-xl bg-slate-100 flex items-center justify-center">
              <Sprout className="w-20 h-20 text-emerald-500" />
              <ShareButton title={text.name} className="absolute top-2 left-2 p-2" />
            </div>
          )}
        </section>

        {/* ವಿವರಗಳು */}
        <section className="bg-white md:rounded-2xl md:border px-4 py-5 md:p-6 space-y-4 border-t md:border-t">
          <div className="flex gap-2 flex-wrap">
            <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">{product.tag || "Organic"}</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
              {text.category || t("products.defaultCategory")}
            </span>
          </div>

          <Link href="/" className="text-sm text-emerald-700 hover:underline block -mb-2">
            {t("detail.visitStore")}
          </Link>
          <h1 className="text-xl md:text-2xl font-bold leading-snug">{text.name}</h1>
          <div className="flex items-center gap-3 flex-wrap -mt-2 text-sm">
            <span className="text-slate-500">
              {t("detail.brand")}: <span className="font-semibold text-slate-800">{(product.brand_id != null && brands?.find((b) => b.id === product.brand_id)?.name) || BRAND}</span>
            </span>
            {product.weight && <span className="text-slate-500">· {t("product.packing")}: {product.weight}</span>}
            {product.rating ? (
              <Stars rating={Number(product.rating)} label={t("detail.rating", { n: Number(product.rating).toFixed(1) })} />
            ) : null}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-baseline gap-2 flex-wrap">
              {discount > 0 && <span className="text-2xl font-light text-red-600">-{discount}%</span>}
              <span className="text-3xl font-bold">{formatRupees(price)}</span>
            </div>
            {discount > 0 && (
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>
                  {t("price.mrp")}: <span className="line-through">{formatRupees(Number(product.mrp))}</span>
                </span>
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">{t("price.off", { n: discount })}</span>
                <span className="text-emerald-700 font-semibold text-xs">
                  {t("price.save", { amount: formatRupees(Number(product.mrp) - price) })}
                </span>
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">{t("price.taxes")}</p>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 space-y-2 text-sm">
            {inStock ? (
              <p className="text-lg font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" /> {t("stock.in")}
              </p>
            ) : (
              <p className="text-lg font-semibold text-red-600">
                {t("stock.unavailable")}
                <span className="block text-xs font-normal text-slate-500">{t("stock.notify")}</span>
              </p>
            )}
            <p className="flex items-start gap-2 text-slate-700">
              <Truck className="w-4 h-4 mt-0.5 text-slate-500 flex-none" />
              <span>
                <b>{t("detail.delivery")}</b> {t("detail.deliveryText")}
              </span>
            </p>
            <p className="flex items-start gap-2 text-slate-700">
              <MapPin className="w-4 h-4 mt-0.5 text-slate-500 flex-none" />
              <span>
                <b>{t("detail.shipsFrom")}</b> {t("detail.shipsFromText")}
              </span>
            </p>
          </div>

          {/* ಕ್ವಾಂಟಿಟಿ ಸೆಲೆಕ್ಟರ್ */}
          <div className={`flex items-center gap-3 ${inStock ? "" : "hidden"}`}>
            <span className="text-sm font-semibold text-slate-700">{t("detail.quantity")}:</span>
            <div className="flex items-center border border-slate-300 rounded-full overflow-hidden bg-slate-50 shadow-sm">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label={t("detail.qtyLess")}
                className="w-10 h-10 flex items-center justify-center hover:bg-slate-200 disabled:opacity-40"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-bold" aria-live="polite" aria-label={t("detail.qtySelected")}>
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
                disabled={quantity >= MAX_QUANTITY}
                aria-label={t("detail.qtyMore")}
                className="w-10 h-10 flex items-center justify-center hover:bg-slate-200 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {quantity > 1 && <span className="text-sm text-slate-500">= {formatRupees(price * quantity)}</span>}
          </div>

          {/* Add to Cart / Buy Now (ಮೊಬೈಲ್‌ನಲ್ಲಿ ಕೆಳಗೆ ಅಂಟಿಕೊಂಡಿರುವ ಬಾರ್) */}
          <div className="fixed md:static bottom-0 inset-x-0 z-30 bg-white md:bg-transparent border-t md:border-0 p-3 md:p-0 flex gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:shadow-none">
            {inStock ? (
              <>
                <button
                  onClick={addToCart}
                  className="flex-1 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-900 font-bold py-3 rounded-full flex items-center justify-center gap-2 transition shadow-sm"
                >
                  <ShoppingCart className="w-5 h-5" /> {t("btn.addToCart")}
                </button>
                <button
                  onClick={buyNow}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 transition shadow-sm"
                >
                  <Zap className="w-5 h-5" /> {t("btn.buyNow")}
                </button>
              </>
            ) : (
              <a
                href="tel:+916360628048"
                className="flex-1 bg-slate-200 text-slate-700 font-bold py-3 rounded-full flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" /> {t("btn.outOfStockCall")}
              </a>
            )}
          </div>
          <p className="text-xs text-slate-500 -mt-1 hidden md:block">{t("detail.buyNowHint")}</p>

          <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-slate-600 border-y py-3">
            <div className="flex flex-col items-center gap-1"><Truck className="w-5 h-5 text-emerald-700" /> {t("detail.trustDelivery")}</div>
            <div className="flex flex-col items-center gap-1"><ShieldCheck className="w-5 h-5 text-emerald-700" /> {t("detail.trustQuality")}</div>
            <a href="tel:+916360628048" className="flex flex-col items-center gap-1 hover:text-emerald-700"><Phone className="w-5 h-5 text-emerald-700" /> {t("detail.trustAdvice")}</a>
          </div>

        </section>

        {/* Product details & Description */}
        <section className="md:col-span-2 bg-white md:rounded-2xl md:border px-4 py-5 md:p-6 border-t grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-bold mb-3">{t("detail.productDetails")}</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {[
                  [t("detail.brand"), (product.brand_id != null && brands?.find((b) => b.id === product.brand_id)?.name) || BRAND],
                  [t("detail.row.name"), text.name],
                  [
                    t("detail.row.category"),
                    [
                      text.category || t("products.defaultCategory"),
                      (() => {
                        const s = product.subcategory_id != null ? subcategories?.find((x) => x.id === product.subcategory_id) : null;
                        return s ? subName(s, lang) : null;
                      })(),
                    ]
                      .filter(Boolean)
                      .join(" › "),
                  ],
                  [t("detail.row.packing"), product.weight],
                  [t("detail.row.type"), product.tag || "Organic"],
                  [t("detail.row.seller"), t("detail.sellerValue")],
                ]
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <tr key={label}>
                      <th scope="row" className="text-left font-semibold text-slate-600 py-2 pr-4 align-top w-2/5">{label}</th>
                      <td className="py-2 text-slate-800">{value}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="text-lg font-bold mb-3">{t("detail.aboutItem")}</h2>
            {points.length > 0 && (
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-800 mb-3">
                {points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            )}
            {text.description ? (
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{text.description}</p>
            ) : points.length === 0 ? (
              <p className="text-sm text-slate-500">{t("detail.noDescription")}</p>
            ) : null}
          </div>
        </section>

        {product.video_url && (
          <section className="md:col-span-2 bg-white md:rounded-2xl md:border px-4 py-5 md:p-6 border-t">
            <h2 className="text-lg font-bold mb-3">{t("detail.video")}</h2>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
              {youTubeId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youTubeId}?rel=0`}
                  title={text.name}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <video src={product.video_url} controls playsInline preload="metadata" className="w-full h-full" />
              )}
            </div>
          </section>
        )}

        {/* You might also like */}
        {related.length > 0 && (
          <section className="md:col-span-2 bg-white md:rounded-2xl md:border px-4 py-5 md:p-6 border-t">
            <h2 className="text-lg font-bold mb-3">{t("detail.related")}</h2>
            <div className="flex gap-3 overflow-x-auto snap-x pb-2 -mx-1 px-1">
              {related.map((p) => {
                const photo = getProductImages(p)[0];
                const pName = localizeProduct(p, lang).name;
                const off = discountOf(p);
                return (
                  <div key={p.id} className="snap-start flex-none w-40 sm:w-44 border rounded-xl overflow-hidden bg-white flex flex-col">
                    <Link href={`/products/${p.id}`} className="block aspect-square bg-slate-100">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={pName} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Sprout className="w-10 h-10 text-emerald-500" /></div>
                      )}
                    </Link>
                    <div className="p-2.5 flex flex-col gap-1 flex-1">
                      <Link href={`/products/${p.id}`} className="text-xs font-semibold line-clamp-2 hover:text-emerald-700 min-h-8">
                        {pName}
                      </Link>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-sm">{formatRupees(Number(p.price))}</span>
                        {off > 0 && <span className="text-[10px] font-bold text-red-600">{t("price.off", { n: off })}</span>}
                      </div>
                      {off > 0 && <span className="text-[10px] text-slate-400 line-through -mt-1">{formatRupees(Number(p.mrp))}</span>}
                      <button
                        onClick={() =>
                          requireLogin(
                            () => addItem({ id: p.id, name: p.name, nameEn: p.name_en, price: Number(p.price), weight: p.weight, image: photo ?? null }),
                            t("login.reasonCart")
                          )
                        }
                        disabled={!isInStock(p)}
                        className="mt-auto bg-amber-400 hover:bg-amber-500 text-slate-900 text-[11px] font-bold py-1.5 rounded-full transition disabled:bg-slate-200 disabled:text-slate-500"
                      >
                        {isInStock(p) ? t("btn.addToCart") : t("stock.out")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
