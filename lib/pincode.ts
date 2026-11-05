// ಭಾರತೀಯ ಅಂಚೆ ಇಲಾಖೆಯ ಉಚಿತ PIN ಕೋಡ್ API (ಬ್ರೌಸರ್‌ನಿಂದ ನೇರವಾಗಿ ಕರೆಯಬಹುದು: CORS ಅನುಮತಿ ಇದೆ)
const API = "https://api.postalpincode.in/pincode/";

export type PincodeResult =
  | { status: "ok"; postOffices: string[]; taluk: string; district: string; state: string }
  | { status: "invalid" }
  | { status: "error" };

interface ApiPostOffice {
  Name?: string;
  Block?: string;
  Division?: string;
  District?: string;
  State?: string;
}

const usable = (v?: string) => (v && v.trim() && v.trim().toUpperCase() !== "NA" ? v.trim() : "");

// ಹೆಚ್ಚು ಅಂಚೆ ಕಚೇರಿಗಳಲ್ಲಿ ಬರುವ ಮೌಲ್ಯ (ಒಂದೇ ಪಿನ್‌ಕೋಡ್‌ನಲ್ಲಿ ಬೇರೆ ತಾಲೂಕುಗಳು ಇರುವುದೂ ಉಂಟು)
function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

const cache = new Map<string, PincodeResult>();

export async function lookupPincode(pin: string, signal?: AbortSignal): Promise<PincodeResult> {
  const cached = cache.get(pin);
  if (cached) return cached;
  try {
    const res = await fetch(API + encodeURIComponent(pin), { signal });
    if (!res.ok) return { status: "error" };
    const body = await res.json();
    const entry = Array.isArray(body) ? body[0] : null;
    const offices: ApiPostOffice[] = Array.isArray(entry?.PostOffice) ? entry.PostOffice : [];
    if (entry?.Status !== "Success" || offices.length === 0) {
      const result: PincodeResult = { status: "invalid" };
      cache.set(pin, result);
      return result;
    }
    const result: PincodeResult = {
      status: "ok",
      postOffices: [...new Set(offices.map((o) => usable(o.Name)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
      // ತಾಲೂಕು: Block (ಸಾಮಾನ್ಯವಾಗಿ ತಾಲೂಕು ಹೆಸರು); ಇಲ್ಲದಿದ್ದರೆ Division
      taluk: mostCommon(offices.map((o) => usable(o.Block))) || mostCommon(offices.map((o) => usable(o.Division))),
      district: mostCommon(offices.map((o) => usable(o.District))),
      state: mostCommon(offices.map((o) => usable(o.State))),
    };
    cache.set(pin, result);
    return result;
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    return { status: "error" };
  }
}
