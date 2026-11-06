// ಅಂಗಡಿಯ 6 ಮುಖ್ಯ ವರ್ಗಗಳು (ಮುಖಪುಟ, ಪ್ರಾಡಕ್ಟ್ ಪಟ್ಟಿ ಮತ್ತು ಅಡ್ಮಿನ್ ಫಾರ್ಮ್ ಎಲ್ಲವೂ ಇದನ್ನೇ ಬಳಸುತ್ತವೆ).
// ಪ್ರಾಡಕ್ಟ್‌ನ category = ಕನ್ನಡ ಹೆಸರು, category_en = English ಹೆಸರು ಆಗಿ ಉಳಿಯುತ್ತದೆ (ಹಳೆಯ ಡೇಟಾ ಜೊತೆ ಹೊಂದಿಕೆ).
// ಪ್ರತಿ ವರ್ಗದ ಲೋಗೋ admin_settings ನ "category_images" ನಲ್ಲಿ ({ slug: url }).

export const CATEGORY_SLUGS = ["brands", "seeds", "yield-booster", "crop-protection", "crop-nutrition", "equipments"] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export interface Category {
  slug: CategorySlug;
  kn: string;
  en: string;
  // ಹಳೆಯ/ಬೇರೆ ಹೆಸರುಗಳು: ಇವುಗಳಲ್ಲಿ ಯಾವುದಾದರೂ ಪ್ರಾಡಕ್ಟ್‌ನ ವರ್ಗದಲ್ಲಿದ್ದರೆ ಈ ವರ್ಗಕ್ಕೆ ಸೇರುತ್ತದೆ
  aliases: string[];
}

export const CATEGORIES: Category[] = [
  { slug: "brands", kn: "ಬ್ರಾಂಡ್‌ಗಳು", en: "Brands", aliases: ["brand", "ಬ್ರಾಂಡ್"] },
  { slug: "seeds", kn: "ಬೀಜಗಳು", en: "Seeds", aliases: ["seed", "ಬೀಜ"] },
  {
    slug: "yield-booster",
    kn: "ಇಳುವರಿ ಹೆಚ್ಚಿಸುವ ಗೊಬ್ಬರ",
    en: "Yield Booster Fertilizer",
    aliases: ["yield booster", "booster", "ಇಳುವರಿ", "ಸಾವಯವ ಗೊಬ್ಬರ", "organic fertilizer"],
  },
  { slug: "crop-protection", kn: "ಬೆಳೆ ಸಂರಕ್ಷಣೆ", en: "Crop Protection", aliases: ["protection", "ಕೀಟನಾಶಕ", "pesticide"] },
  {
    slug: "crop-nutrition",
    kn: "ಬೆಳೆ ಪೋಷಣೆ",
    en: "Crop Nutrition",
    aliases: ["nutrition", "nutrient", "ಪೋಷಕಾಂಶ", "ಬೆಳೆ ಪೋಷಕಾಂಶ"],
  },
  { slug: "equipments", kn: "ಕೃಷಿ ಉಪಕರಣಗಳು", en: "Equipments", aliases: ["equipment", "tools", "ಉಪಕರಣ", "ಪರಿಕರ"] },
];

export const isCategorySlug = (v: unknown): v is CategorySlug => typeof v === "string" && (CATEGORY_SLUGS as readonly string[]).includes(v);

export const categoryBySlug = (slug: string | null | undefined) => CATEGORIES.find((c) => c.slug === slug) ?? null;

// ಪ್ರಾಡಕ್ಟ್ ಯಾವ ವರ್ಗಕ್ಕೆ ಸೇರುತ್ತದೆ (ಕನ್ನಡ ಅಥವಾ English ವರ್ಗದ ಹೆಸರಿನಿಂದ)
export function categoryOf(product: { category?: string | null; category_en?: string | null }): Category | null {
  const names = [product.category, product.category_en].map((c) => (c ?? "").trim().toLowerCase()).filter(Boolean);
  if (!names.length) return null;
  const exact = CATEGORIES.find((c) => names.includes(c.kn.toLowerCase()) || names.includes(c.en.toLowerCase()));
  if (exact) return exact;
  return CATEGORIES.find((c) => c.aliases.some((a) => names.some((n) => n.includes(a.toLowerCase())))) ?? null;
}

export type CategoryImages = Partial<Record<CategorySlug, string>>;
