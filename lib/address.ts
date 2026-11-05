// ಗ್ರಾಹಕರ ಡೆಲಿವರಿ ವಿಳಾಸ (ಗ್ರಾಮೀಣ ಕರ್ನಾಟಕದ ವಿಳಾಸ ರೂಪದಲ್ಲಿ)
export interface DeliveryAddress {
  village: string; // ಮನೆ / ಬೀದಿ / ಊರು
  post: string; // ಅಂಚೆ ಕಚೇರಿ
  hobli: string;
  taluk: string;
  district: string;
  pincode: string; // 6 ಅಂಕಿ
}

export const ADDRESS_FIELDS = ["village", "post", "hobli", "taluk", "district", "pincode"] as const;
export const PINCODE_PATTERN = /^[1-9]\d{5}$/;
export const EMPTY_ADDRESS: DeliveryAddress = { village: "", post: "", hobli: "", taluk: "", district: "", pincode: "" };

export function cleanAddress(value: unknown): DeliveryAddress | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const address = Object.fromEntries(
    ADDRESS_FIELDS.map((f) => [f, typeof v[f] === "string" ? (v[f] as string).trim().slice(0, 120) : ""])
  ) as unknown as DeliveryAddress;
  return ADDRESS_FIELDS.some((f) => address[f]) ? address : null;
}

// WhatsApp ಸಂದೇಶಕ್ಕಾಗಿ (ಅಂಗಡಿಯವರು ಓದುವುದರಿಂದ ಕನ್ನಡ ಲೇಬಲ್‌ಗಳು)
export function formatAddressLines(a: DeliveryAddress): string[] {
  const rows: [string, string][] = [
    ["ಮನೆ / ಬೀದಿ / ಊರು", a.village],
    ["ಅಂಚೆ ಕಚೇರಿ", a.post],
    ["ಹೋಬಳಿ", a.hobli],
    ["ತಾಲೂಕು", a.taluk],
    ["ಜಿಲ್ಲೆ", a.district],
    ["ಪಿನ್‌ಕೋಡ್", a.pincode],
  ];
  return rows.filter(([, v]) => v).map(([label, v]) => `${label}: ${v}`);
}
