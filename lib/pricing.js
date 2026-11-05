// MRP ಮತ್ತು ಆಫರ್ ಬೆಲೆಯಿಂದ ಶೇಕಡಾವಾರು ರಿಯಾಯಿತಿ (MRP ಇಲ್ಲದಿದ್ದರೆ ಅಥವಾ ಕಡಿಮೆ ಇದ್ದರೆ 0)
export function discountPercent(price, mrp) {
  const p = Number(price);
  const m = Number(mrp);
  if (!Number.isFinite(p) || !Number.isFinite(m) || m <= 0 || m <= p) return 0;
  return Math.round((1 - p / m) * 100);
}

// in_stock ಕಾಲಂ ಇಲ್ಲದ/ಖಾಲಿ ಹಳೆಯ ಡೇಟಾ = In Stock
export const isInStock = (product) => product?.in_stock !== false;

// ಪ್ರಮುಖ ಅಂಶಗಳು: ಪ್ರತಿ ಸಾಲು ಒಂದು ಬುಲೆಟ್ (ಆರಂಭದ -, •, * ತೆಗೆಯಲಾಗುತ್ತದೆ).
// highlights ಕಾಲಂ text ಆಗಿರಲಿ ಅಥವಾ jsonb (array / string) ಆಗಿರಲಿ, ಎರಡನ್ನೂ ಓದುತ್ತದೆ.
export const highlightLines = (value) => {
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) value = parsed;
    } catch {
      // ಸಾಮಾನ್ಯ ಪಠ್ಯ; ಸಾಲುಗಳಾಗಿ ಓದುತ್ತೇವೆ
    }
  }
  const lines = Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(/\r?\n/) : [];
  return lines.map((l) => l.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean);
};
