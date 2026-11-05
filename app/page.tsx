"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProductImages, getYouTubeId } from "@/lib/media";
import ImageCarousel from "./components/ImageCarousel";
import CartButton from "./components/cart/CartButton";
import { useCart } from "./components/cart/CartProvider";
import { formatRupees } from "@/lib/whatsapp";
import { discountPercent, isInStock } from "@/lib/pricing";
import {
  Search, ShoppingCart, Phone, MapPin,
  Leaf, ShieldCheck, Sprout, Wrench,
  Star, Truck, Award, CheckCircle, MessageCircle, X, Loader2, PlayCircle
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
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const router = useRouter();
  const [videoProduct, setVideoProduct] = useState<Product | null>(null);
  const videoYouTubeId = videoProduct?.video_url ? getYouTubeId(videoProduct.video_url) : null;

  // Supabase ನಿಂದ ಪ್ರಾಡಕ್ಟ್‌ಗಳನ್ನು ತರುವುದು
  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("id", { ascending: false });

        if (error) {
          console.error("Error fetching products:", error);
        } else if (data) {
          setProducts(data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const categories = [
    { name: "ಸಾವಯವ ಗೊಬ್ಬರಗಳು", icon: Leaf, count: "15+ ಉತ್ಪನ್ನಗಳು" },
    { name: "ಬೆಳೆ ಪೋಷಕಾಂಶಗಳು", icon: Sprout, count: "25+ ಉತ್ಪನ್ನಗಳು" },
    { name: "ಬೆಳೆ ಸಂರಕ್ಷಣೆ", icon: ShieldCheck, count: "30+ ಉತ್ಪನ್ನಗಳು" },
    { name: "ಕೃಷಿ ಪರಿಕರಗಳು", icon: Wrench, count: "10+ ಉತ್ಪನ್ನಗಳು" },
  ];

  const addToCart = (product: Product) =>
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      weight: product.weight,
      image: getProductImages(product)[0] ?? null,
    });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      {/* Top Banner */}
      <div className="bg-emerald-900 text-white text-xs py-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>ಚನ್ನರಾಯಪಟ್ಟಣ, ಹಾಸನ ಜಿಲ್ಲೆ | ಕರ್ನಾಟಕದಾದ್ಯಂತ ಡೆಲಿವರಿ ಲಭ್ಯ</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>ಕೃಷಿ ಸಲಹೆಗೆ ಕರೆ ಮಾಡಿ: 7795198610</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow">
              JP
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-emerald-800">
                JP ORGANICS
              </h1>
              <p className="text-[10px] tracking-wider text-slate-500 font-semibold uppercase">
                And Agro Center
              </p>
            </div>
          </div>

          <div className="flex-1 max-w-md hidden md:flex items-center relative">
            <input
              type="text"
              placeholder="ಗೊಬ್ಬರಗಳು, ಪೋಷಕಾಂಶಗಳನ್ನು ಹುಡುಕಿ..."
              className="w-full pl-10 pr-4 py-2 border rounded-full text-sm bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
          </div>

          <div className="flex items-center gap-4">
            <a 
              href="tel:7795198610"
              className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">ಕೃಷಿ ಸಹಾಯವಾಣಿ</span>
            </a>
            <CartButton />
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <span className="inline-block bg-emerald-700/80 text-emerald-200 text-xs px-3 py-1 rounded-full font-medium border border-emerald-600">
              ರೈತರಿಗಾಗಿ ಅಧಿಕೃತ ಗುಣಮಟ್ಟದ ಕೃಷಿ ಉತ್ಪನ್ನಗಳು
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">
              ನಿಮ್ಮ ತೋಟದ ಸಮೃದ್ಧ ಇಳುವರಿಗೆ <br />
              <span className="text-amber-400">ಸಾವಯವ ಪೋಷಕಾಂಶಗಳು</span>
            </h2>
            <p className="text-emerald-100 text-sm md:text-base leading-relaxed">
              ತೆಂಗು, ಅಡಿಕೆ ಮತ್ತು ವಾಣಿಜ್ಯ ಬೆಳೆಗಳಿಗೆ ಬೇಕಾಗುವ ಹ್ಯೂಮಿಕ್ ಆಸಿಡ್ ಮತ್ತು ನಿಖರ ಕೃಷಿ ಸೂತ್ರಗಳು ಲಭ್ಯ.
            </p>
            <div className="pt-2 flex flex-wrap gap-3 justify-center md:justify-start">
              <a 
                href="https://wa.me/916360628048?text=ನಮಸ್ಕಾರ,%20ನನಗೆ%20ಕೃಷಿ%20ಉತ್ಪನ್ನಗಳ%20ಬಗ್ಗೆ%20ಮಾಹಿತಿ%20ಬೇಕು" 
                target="_blank"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow flex items-center gap-2 transition"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp ನಲ್ಲಿ ವಿಚಾರಿಸಿ
              </a>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 w-full md:w-80 space-y-4">
            <h3 className="font-bold text-base text-amber-300 flex items-center gap-2">
              <Award className="w-5 h-5" /> JP ಆಗ್ರೋ ಭರವಸೆಗಳು
            </h3>
            <div className="space-y-3 text-xs text-slate-100">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>100% ಪರಿಶುದ್ಧ ಹಾಗೂ ಪರೀಕ್ಷಿತ ಸಾವಯವ ಸೂತ್ರಗಳು</span>
              </div>
              <div className="flex items-start gap-2">
                <Truck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>ರೈತರ ಮನೆಬಾಗಿಲಿಗೆ ತ್ವರಿತ ಡೆಲಿವರಿ ಸೌಲಭ್ಯ</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>ಅಡಿಕೆ ಮತ್ತು ತೆಂಗಿನ ಬೇರು ಪೋಷಣೆಗೆ ಮಾರ್ಗದರ್ಶನ</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h3 className="text-xl font-bold text-slate-800 mb-6">ಮುಖ್ಯ ವಿಭಾಗಗಳು (Categories)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat, idx) => {
            const IconComponent = cat.icon;
            return (
              <div 
                key={idx} 
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition cursor-pointer flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <IconComponent className="w-6 h-6 text-emerald-700" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 mb-1">{cat.name}</h4>
                <p className="text-xs text-slate-400">{cat.count}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dynamic Products from Supabase */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <h3 className="text-xl font-bold text-slate-800 mb-6">ಜನಪ್ರಿಯ ಉತ್ಪನ್ನಗಳು (Featured Products)</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-12 text-emerald-700 font-semibold gap-2">
            <Loader2 className="w-6 h-6 animate-spin" /> ಉತ್ಪನ್ನಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm">
            ಯಾವುದೇ ಉತ್ಪನ್ನಗಳು ಲಭ್ಯವಿಲ್ಲ. ಅಡ್ಮಿನ್ ಪ್ಯಾನೆಲ್ ಮೂಲಕ ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸಿ.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((item) => (
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
                    {discountPercent(item.price, item.mrp) > 0 && (
                      <span className="absolute bottom-2 left-2 z-10 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow">
                        {discountPercent(item.price, item.mrp)}% OFF
                      </span>
                    )}
                    {!isInStock(item) && (
                      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 text-white text-xs font-bold text-center py-1 pointer-events-none">
                        OUT OF STOCK
                      </span>
                    )}
                    {getProductImages(item).length > 0 ? (
                      <ImageCarousel images={getProductImages(item)} alt={item.name} href={`/products/${item.id}`} className="w-full h-full" />
                    ) : (
                      <Link href={`/products/${item.id}`} aria-label={item.name} className="w-full h-full flex items-center justify-center">
                        <Sprout className="w-12 h-12 text-emerald-500" />
                      </Link>
                    )}
                    {item.video_url && (
                      <button
                        onClick={() => setVideoProduct(item)}
                        className="absolute top-2 left-2 bg-black/70 hover:bg-black/85 text-white text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1 transition"
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> ವಿಡಿಯೋ ನೋಡಿ
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] font-semibold text-emerald-600 uppercase">
                    {item.category || "ಕೃಷಿ ಪೋಷಕಾಂಶ"}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 mt-1 line-clamp-2">
                    <Link href={`/products/${item.id}`} className="hover:text-emerald-700 hover:underline">
                      {item.name}
                    </Link>
                  </h4>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                  )}
                  {item.weight && (
                    <p className="text-xs text-slate-400 mt-1 font-medium">ಪ್ಯಾಕಿಂಗ್: {item.weight}</p>
                  )}
                  <Link
                    href={`/products/${item.id}`}
                    className="inline-block text-xs font-semibold text-emerald-700 hover:underline mt-2"
                  >
                    ಪೂರ್ಣ ವಿವರ ನೋಡಿ →
                  </Link>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100">
                  <div className="flex items-baseline gap-2 flex-wrap mt-3 mb-1">
                    {discountPercent(item.price, item.mrp) > 0 && (
                      <span className="text-base font-light text-red-600">-{discountPercent(item.price, item.mrp)}%</span>
                    )}
                    <span className="text-xl font-extrabold text-slate-900">{formatRupees(Number(item.price))}</span>
                  </div>
                  {discountPercent(item.price, item.mrp) > 0 && (
                    <p className="text-[11px] text-slate-500 -mt-0.5 mb-1">
                      M.R.P.: <span className="line-through">{formatRupees(Number(item.mrp))}</span>
                    </p>
                  )}
                  {isInStock(item) ? (
                    <p className="text-[11px] font-semibold text-emerald-700 mb-3">In Stock</p>
                  ) : (
                    <p className="text-[11px] font-semibold text-red-600 mb-3">Out of Stock</p>
                  )}
                  <button
                    onClick={() => addToCart(item)}
                    disabled={!isInStock(item)}
                    className="w-full bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-900 font-bold py-2 rounded-full text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {isInStock(item) ? "Add to Cart" : "Currently unavailable"}
                  </button>
                </div>
              </div>
            ))}
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
              <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{videoProduct.name}</h3>
              <button
                onClick={() => setVideoProduct(null)}
                aria-label="ಮುಚ್ಚಿ"
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

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 mt-16 py-8 border-t border-slate-800 text-center text-xs">
        <p className="font-bold text-sm text-white mb-2">JP ORGANICS AND AGRO CENTER</p>
        <p className="text-slate-400 mb-2">ಚನ್ನರಾಯಪಟ್ಟಣ, ಹಾಸನ ಜಿಲ್ಲೆ | ಸಹಾಯವಾಣಿ: 7795198610</p>
        <p className="text-slate-500">© 2026 JP Organics and Agro Center. All Rights Reserved.</p>
      </footer>
    </div>
  );
}