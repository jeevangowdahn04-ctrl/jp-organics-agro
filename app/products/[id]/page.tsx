import { Suspense } from "react";
import type { Metadata } from "next";
import ProductDetail from "./ProductDetail";
import { supabase } from "@/lib/supabase";
import { getProductImages } from "@/lib/media";
import { discountPercent } from "@/lib/pricing";
import { SHARE_IMAGE } from "@/lib/site";

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-emerald-700 font-semibold">
      ಉತ್ಪನ್ನ ಲೋಡ್ ಆಗುತ್ತಿದೆ...
    </div>
  );
}

// WhatsApp ನಲ್ಲಿ ಉತ್ಪನ್ನದ ಲಿಂಕ್ ಹಂಚಿದಾಗ: ಉತ್ಪನ್ನದ ಹೆಸರು, ಬೆಲೆ, ವಿವರಣೆ ಮತ್ತು ಮೊದಲ ಫೋಟೋ ಕಾಣಿಸುತ್ತದೆ.
// (ಈ ಪುಟ ಈಗಾಗಲೇ ರನ್‌ಟೈಮ್‌ನಲ್ಲಿ ತಯಾರಾಗುವುದರಿಂದ params ಓದುವುದು ಸರಿ; WhatsApp ಬಾಟ್‌ಗೆ <head> ನಲ್ಲೇ ಸಿಗುತ್ತದೆ)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data: p } = await supabase
    .from("products")
    .select("id,name,name_en,price,mrp,weight,description,image_url,image_urls")
    .eq("id", id)
    .maybeSingle();
  if (!p) return { title: "ಉತ್ಪನ್ನ ಸಿಗಲಿಲ್ಲ", robots: { index: false } };

  const name = String(p.name || "").trim();
  const off = discountPercent(p.price, p.mrp);
  const priceLine = [`₹${p.price}`, p.weight ? `/ ${p.weight}` : "", off > 0 ? `(${off}% OFF, MRP ₹${p.mrp})` : ""].filter(Boolean).join(" ");
  const about = String(p.description || "").replace(/\s+/g, " ").trim().slice(0, 160);
  const description = [priceLine, about || "JP Organics And Agro Center, ಚನ್ನರಾಯಪಟ್ಟಣ – WhatsApp ಮೂಲಕ ಆರ್ಡರ್ ಮಾಡಿ."].join(" · ");
  const image = getProductImages(p)[0];
  const title = `${name}${p.name_en && p.name_en.trim() !== name ? ` (${p.name_en.trim()})` : ""} – ₹${p.price}`;

  return {
    title,
    description,
    alternates: { canonical: `/products/${p.id}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/products/${p.id}`,
      images: image ? [{ url: image, alt: name }] : [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [image || SHARE_IMAGE.url] },
  };
}

// ಪ್ರಾಡಕ್ಟ್ ವಿವರ ಪೇಜ್: id ರನ್‌ಟೈಮ್‌ನಲ್ಲಿ ಮಾತ್ರ ತಿಳಿಯುವುದರಿಂದ Suspense ಒಳಗೆ ಓದುತ್ತೇವೆ (cacheComponents)
export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ id }) => (
        <ProductDetail id={id} />
      ))}
    </Suspense>
  );
}
