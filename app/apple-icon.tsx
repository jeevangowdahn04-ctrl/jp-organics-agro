import { ImageResponse } from "next/og";

// ಫೋನ್ ಹೋಮ್ ಸ್ಕ್ರೀನ್‌ಗೆ ಸೇರಿಸಿದಾಗ ಕಾಣುವ ಐಕಾನ್
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 92,
          fontWeight: 800,
          letterSpacing: -3,
        }}
      >
        JP
      </div>
    ),
    size
  );
}
