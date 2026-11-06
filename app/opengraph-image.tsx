import { ImageResponse } from "next/og";

// WhatsApp / Facebook ನಲ್ಲಿ ವೆಬ್‌ಸೈಟ್ ಲಿಂಕ್ ಹಂಚಿದಾಗ ಕಾಣುವ ಚಿತ್ರ (1200×630).
// ಸೂಚನೆ: ಈ ಚಿತ್ರ ತಯಾರಿಸುವ ಸಾಧನ ಕನ್ನಡ ಅಕ್ಷರಗಳ ಒತ್ತಕ್ಷರಗಳನ್ನು ಸರಿಯಾಗಿ ಜೋಡಿಸುವುದಿಲ್ಲ, ಆದ್ದರಿಂದ ಚಿತ್ರದಲ್ಲಿ ಇಂಗ್ಲಿಷ್;
// ಕನ್ನಡ ಹೆಸರು/ವಿವರಣೆ ಪ್ರಿವ್ಯೂನ ಪಠ್ಯ ಭಾಗದಲ್ಲಿ ಬರುತ್ತದೆ.
export const alt = "JP Organics And Agro Center – organic farm products, Channarayapatna";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 70,
          background: "linear-gradient(135deg, #064e3b 0%, #047857 60%, #10b981 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 28,
              background: "white",
              color: "#047857",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 62,
              fontWeight: 800,
            }}
          >
            JP
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -1 }}>JP ORGANICS</div>
            <div style={{ fontSize: 30, letterSpacing: 6, color: "#a7f3d0" }}>AND AGRO CENTER</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 48, fontWeight: 700 }}>Organic fertilizers &amp; farm products</div>
          <div style={{ fontSize: 32, color: "#d1fae5" }}>Channarayapatna, Hassan · Delivery across Karnataka</div>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ display: "flex", background: "#facc15", color: "#1e293b", fontSize: 30, fontWeight: 700, padding: "14px 30px", borderRadius: 999 }}>
            Order on WhatsApp
          </div>
          <div style={{ display: "flex", border: "2px solid #a7f3d0", fontSize: 30, padding: "12px 28px", borderRadius: 999 }}>
            Helpline 7795198610
          </div>
        </div>
      </div>
    ),
    size
  );
}
