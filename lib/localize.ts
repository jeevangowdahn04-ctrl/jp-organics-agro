import type { Lang } from "@/lib/i18n";
import { highlightLines } from "@/lib/pricing";

// ಪ್ರಾಡಕ್ಟ್‌ನ ಕನ್ನಡ (ಮುಖ್ಯ ಕಾಲಂಗಳು) ಮತ್ತು English (*_en ಕಾಲಂಗಳು) ಮಾಹಿತಿ
export interface BilingualFields {
  name?: string | null;
  name_en?: string | null;
  category?: string | null;
  category_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  highlights?: unknown;
  highlights_en?: unknown;
}

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// ಆಯ್ಕೆ ಮಾಡಿದ ಭಾಷೆ ಮೊದಲು; ಅದು ಖಾಲಿ ಇದ್ದರೆ ಇನ್ನೊಂದು ಭಾಷೆ (fallback)
function pick(lang: Lang, kn: unknown, en: unknown) {
  const [first, second] = lang === "en" ? [clean(en), clean(kn)] : [clean(kn), clean(en)];
  return first || second;
}

export function localizeProduct(product: BilingualFields, lang: Lang) {
  const knPoints = highlightLines(product.highlights);
  const enPoints = highlightLines(product.highlights_en);
  return {
    name: pick(lang, product.name, product.name_en),
    category: pick(lang, product.category, product.category_en),
    description: pick(lang, product.description, product.description_en),
    highlights: lang === "en" ? (enPoints.length ? enPoints : knPoints) : knPoints.length ? knPoints : enPoints,
  };
}

// ಹುಡುಕಾಟಕ್ಕೆ: ಎರಡೂ ಭಾಷೆಗಳ ಹೆಸರು, ವರ್ಗ, ವಿವರಣೆ
export function searchableText(product: BilingualFields & { tag?: string | null }) {
  return [product.name, product.name_en, product.category, product.category_en, product.description, product.description_en, product.tag]
    .map(clean)
    .join(" ")
    .toLowerCase();
}
