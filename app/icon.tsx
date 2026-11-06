import { ImageResponse } from "next/og";

// ಬ್ರೌಸರ್ ಟ್ಯಾಬ್ ಐಕಾನ್: ಹಸಿರು ಚೌಕದಲ್ಲಿ "JP" (ವೆಬ್‌ಸೈಟ್ ಹೆಡರ್‌ನ ಲೋಗೋದಂತೆ)
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#059669",
          color: "white",
          fontSize: 34,
          fontWeight: 800,
          borderRadius: 14,
          letterSpacing: -1,
        }}
      >
        JP
      </div>
    ),
    size
  );
}
