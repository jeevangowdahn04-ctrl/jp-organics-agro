"use client";
import { useActionState, useState } from "react";
import { login } from "./actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null);
  const [showForgot, setShowForgot] = useState(false);

  return (
    <div style={{ maxWidth: "380px", margin: "80px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1 style={{ borderBottom: "2px solid #2e7d32", paddingBottom: "10px", color: "#2e7d32", fontSize: "22px" }}>
        JP Organics - Admin Login
      </h1>

      <form action={formAction} style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px", marginTop: "20px" }}>
        <label htmlFor="password" style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
          ಪಾಸ್‌ವರ್ಡ್:
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "12px" }}
        />
        {state?.error && (
          <p style={{ color: "#c62828", margin: "0 0 12px 0", fontSize: "14px" }}>{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          style={{ background: "#2e7d32", color: "white", padding: "10px 20px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", width: "100%" }}>
          {pending ? "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ..." : "ಲಾಗಿನ್"}
        </button>
        <button
          type="button"
          onClick={() => setShowForgot((v) => !v)}
          style={{ background: "none", border: "none", color: "#2e7d32", cursor: "pointer", marginTop: "12px", padding: 0, fontSize: "14px", textDecoration: "underline" }}>
          Forgot Password?
        </button>
        {showForgot && (
          <div style={{ marginTop: "10px", padding: "12px", background: "#fff8e1", border: "1px solid #ffe082", borderRadius: "6px", fontSize: "13px", lineHeight: 1.6, color: "#5d4037" }}>
            ಸುರಕ್ಷತೆಗಾಗಿ ಪಾಸ್‌ವರ್ಡ್ ಅನ್ನು ಇಲ್ಲಿಂದ ರೀಸೆಟ್ ಮಾಡಲಾಗುವುದಿಲ್ಲ. ವೆಬ್‌ಸೈಟ್ ಮಾಲೀಕರು Vercel → Project Settings →
            Environment Variables ನಲ್ಲಿ <b>ADMIN_PASSWORD</b> ಬದಲಾಯಿಸಿ, ಮತ್ತೆ deploy ಮಾಡಬೇಕು. ಸಹಾಯಕ್ಕೆ ಕರೆ ಮಾಡಿ:{" "}
            <a href="tel:7795198610" style={{ color: "#2e7d32" }}>7795198610</a>
          </div>
        )}
      </form>
    </div>
  );
}
