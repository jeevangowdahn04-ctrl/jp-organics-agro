import { Suspense } from "react";
import { isAdmin } from "@/lib/adminAuth";
import AdminDashboard from "./AdminDashboard";
import LoginForm from "./LoginForm";

// ಸರಿಯಾದ ಪಾಸ್‌ವರ್ಡ್ ಕುಕೀ ಇದ್ದರೆ ಮಾತ್ರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್, ಇಲ್ಲದಿದ್ದರೆ ಲಾಗಿನ್ ಫಾರ್ಮ್
async function AdminGate() {
  return (await isAdmin()) ? <AdminDashboard /> : <LoginForm />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", marginTop: "80px", fontFamily: "sans-serif" }}>ಲೋಡ್ ಆಗುತ್ತಿದೆ...</p>}>
      <AdminGate />
    </Suspense>
  );
}
