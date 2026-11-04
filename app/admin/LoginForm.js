"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login, resetPassword } from "./actions";

const inputStyle = { width: "100%", padding: "8px 40px 8px 8px", borderRadius: "4px", border: "1px solid #ccc" };
const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "bold" };
const buttonStyle = { background: "#2e7d32", color: "white", padding: "10px 20px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", width: "100%" };
const linkButtonStyle = { background: "none", border: "none", color: "#2e7d32", cursor: "pointer", marginTop: "12px", padding: 0, fontSize: "14px", textDecoration: "underline" };

// ಕಣ್ಣಿನ ಐಕಾನ್‌ನಿಂದ ಪಾಸ್‌ವರ್ಡ್ ತೋರಿಸುವ/ಮರೆಮಾಡುವ ಇನ್‌ಪುಟ್
function PasswordInput({ id, name, autoComplete, autoFocus, minLength }) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div style={{ position: "relative", marginBottom: "12px" }}>
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        minLength={minLength}
        style={inputStyle}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "ಪಾಸ್‌ವರ್ಡ್ ಮರೆಮಾಡಿ" : "ಪಾಸ್‌ವರ್ಡ್ ತೋರಿಸಿ"}
        title={visible ? "Hide password" : "Show password"}
        style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", color: "#555" }}>
        <Icon size={18} />
      </button>
    </div>
  );
}

function ResetForm({ onBack }) {
  const [state, formAction, pending] = useActionState(resetPassword, null);

  return (
    <form action={formAction} style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px", marginTop: "20px" }}>
      <h3 style={{ marginTop: 0 }}>ಪಾಸ್‌ವರ್ಡ್ ರೀಸೆಟ್</h3>

      <label htmlFor="pin" style={labelStyle}>Recovery PIN:</label>
      <PasswordInput id="pin" name="pin" autoComplete="off" autoFocus />

      <label htmlFor="newPassword" style={labelStyle}>ಹೊಸ ಪಾಸ್‌ವರ್ಡ್:</label>
      <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" minLength={8} />

      <label htmlFor="confirmPassword" style={labelStyle}>ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಮತ್ತೊಮ್ಮೆ:</label>
      <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" minLength={8} />

      {state?.error && <p style={{ color: "#c62828", margin: "0 0 12px 0", fontSize: "14px" }}>{state.error}</p>}
      {state?.ok && <p style={{ color: "#2e7d32", margin: "0 0 12px 0", fontSize: "14px" }}>{state.ok}</p>}

      <button type="submit" disabled={pending} style={buttonStyle}>
        {pending ? "ಸೇವ್ ಆಗುತ್ತಿದೆ..." : "ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಸೆಟ್ ಮಾಡಿ"}
      </button>
      <button type="button" onClick={onBack} style={linkButtonStyle}>
        ← ಲಾಗಿನ್‌ಗೆ ಹಿಂತಿರುಗಿ
      </button>
    </form>
  );
}

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null);
  const [showReset, setShowReset] = useState(false);

  return (
    <div style={{ maxWidth: "380px", margin: "80px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1 style={{ borderBottom: "2px solid #2e7d32", paddingBottom: "10px", color: "#2e7d32", fontSize: "22px" }}>
        JP Organics - Admin Login
      </h1>

      {showReset ? (
        <ResetForm onBack={() => setShowReset(false)} />
      ) : (
        <form action={formAction} style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px", marginTop: "20px" }}>
          <label htmlFor="password" style={labelStyle}>
            ಪಾಸ್‌ವರ್ಡ್:
          </label>
          <PasswordInput id="password" name="password" autoComplete="current-password" autoFocus />
          {state?.error && (
            <p style={{ color: "#c62828", margin: "0 0 12px 0", fontSize: "14px" }}>{state.error}</p>
          )}
          <button type="submit" disabled={pending} style={buttonStyle}>
            {pending ? "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ..." : "ಲಾಗಿನ್"}
          </button>
          <button type="button" onClick={() => setShowReset(true)} style={linkButtonStyle}>
            Forgot Password?
          </button>
        </form>
      )}
    </div>
  );
}
