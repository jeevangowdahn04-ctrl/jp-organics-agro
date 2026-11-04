"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MessageCircle, Phone, Sprout } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getProductImages, getYouTubeId } from "@/lib/media";
import ImageCarousel from "../../components/ImageCarousel";

interface Product {
  id: number | string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  mrp?: number;
  weight?: string;
  tag?: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  video_url?: string | null;
}

export default function ProductDetail({ id }: { id: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let active = true;
    supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setState("missing");
        } else {
          setProduct(data);
          setState("ready");
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-emerald-700 font-semibold gap-2">
        <Loader2 className="w-6 h-6 animate-spin" /> ಉತ್ಪನ್ನ ಲೋಡ್ ಆಗುತ್ತಿದೆ...
      </div>
    );
  }

  if (state === "missing" || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-600 px-4 text-center">
        <p>ಈ ಉತ್ಪನ್ನ ಸಿಗಲಿಲ್ಲ. ಇದನ್ನು ತೆಗೆದುಹಾಕಿರಬಹುದು.</p>
        <Link href="/" className="text-emerald-700 font-semibold hover:underline">← ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ</Link>
      </div>
    );
  }

  const images = getProductImages(product);
  const youTubeId = product.video_url ? getYouTubeId(product.video_url) : null;
  const weightInfo = product.weight ? ` (${product.weight})` : "";
  const whatsappText = encodeURIComponent(
    `ನಮಸ್ಕಾರ JP Organics, ನಾನು "${product.name}${weightInfo}" (₹${product.price}) ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೇನೆ. ದಯವಿಟ್ಟು ವಿವರ ಕಳುಹಿಸಿ.`
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600">
            <ArrowLeft className="w-4 h-4" /> ಎಲ್ಲಾ ಉತ್ಪನ್ನಗಳು
          </Link>
          <span className="font-bold text-emerald-800">JP ORGANICS</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
        <section>
          {images.length > 0 ? (
            <ImageCarousel
              images={images}
              alt={product.name}
              showThumbnails
              className="w-full [&>div:first-child]:aspect-square [&>div:first-child]:rounded-2xl [&>div:first-child]:overflow-hidden [&>div:first-child]:bg-white [&>div:first-child]:border"
            />
          ) : (
            <div className="aspect-square rounded-2xl bg-white border flex items-center justify-center">
              <Sprout className="w-20 h-20 text-emerald-500" />
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">{product.tag || "Organic"}</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
              {product.category || "ಕೃಷಿ ಪೋಷಕಾಂಶ"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{product.name}</h1>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-emerald-700">₹{product.price}</span>
            {product.mrp && <span className="text-sm text-slate-400 line-through">₹{product.mrp}</span>}
          </div>
          {product.weight && <p className="text-sm text-slate-500">ಪ್ಯಾಕಿಂಗ್: <b>{product.weight}</b></p>}
          {product.description && (
            <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{product.description}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a
              href={`https://wa.me/916360628048?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow"
            >
              <MessageCircle className="w-5 h-5" /> WhatsApp ನಲ್ಲಿ ಆರ್ಡರ್ ಮಾಡಿ
            </a>
            <a
              href="tel:7795198610"
              className="flex-1 bg-white border border-emerald-600 text-emerald-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition"
            >
              <Phone className="w-5 h-5" /> ಕರೆ ಮಾಡಿ
            </a>
          </div>
        </section>

        {product.video_url && (
          <section className="md:col-span-2">
            <h2 className="text-lg font-bold mb-3">ಉತ್ಪನ್ನ ವಿಡಿಯೋ</h2>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
              {youTubeId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youTubeId}?rel=0`}
                  title={product.name}
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
      </main>
    </div>
  );
}
