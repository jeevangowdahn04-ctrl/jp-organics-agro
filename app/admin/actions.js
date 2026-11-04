"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  checkPassword,
  checkRecoveryPin,
  isAdmin,
  saveAdminPassword,
  sessionToken,
} from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function login(prevState, formData) {
  if (!(await checkPassword(formData.get("password")))) {
    return { error: "ತಪ್ಪು ಪಾಸ್‌ವರ್ಡ್. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ." };
  }

  (await cookies()).set(ADMIN_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60 * 8, // 8 ಗಂಟೆ
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/admin" });
  redirect("/admin");
}

// RECOVERY_PIN ಸರಿಯಿದ್ದರೆ ಹೊಸ ಅಡ್ಮಿನ್ ಪಾಸ್‌ವರ್ಡ್ ಸೆಟ್ ಮಾಡುವುದು
export async function resetPassword(prevState, formData) {
  // ಊಹಿಸಿ ಪ್ರಯತ್ನಿಸುವುದನ್ನು ನಿಧಾನಗೊಳಿಸಲು ಸಣ್ಣ ವಿರಾಮ
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (!process.env.RECOVERY_PIN) {
    return { error: "ಸರ್ವರ್‌ನಲ್ಲಿ RECOVERY_PIN ಸೆಟ್ ಆಗಿಲ್ಲ." };
  }
  if (!checkRecoveryPin(formData.get("pin"))) {
    return { error: "ತಪ್ಪು Recovery PIN." };
  }

  const newPassword = formData.get("newPassword");
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return { error: "ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ 8 ಅಕ್ಷರಗಳಿರಬೇಕು." };
  }
  if (newPassword !== formData.get("confirmPassword")) {
    return { error: "ಎರಡೂ ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಾಣಿಕೆಯಾಗುತ್ತಿಲ್ಲ." };
  }

  const result = await saveAdminPassword(newPassword);
  if (result.error) return { error: result.error };
  return { ok: "ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಸೆಟ್ ಆಗಿದೆ. ಈಗ ಅದರಿಂದ ಲಾಗಿನ್ ಮಾಡಿ." };
}

// ಪ್ರಾಡಕ್ಟ್ ಸೇರಿಸುವುದು ಸರ್ವರ್‌ನಲ್ಲೇ: ಲಾಗಿನ್ ಆಗಿದ್ದರೆ ಮಾತ್ರ, service role key ಬಳಸಿ
export async function addProduct({ name, price, description }) {
  if (!(await isAdmin())) {
    return { error: "ಲಾಗಿನ್ ಅವಧಿ ಮುಗಿದಿದೆ. ಮತ್ತೆ ಲಾಗಿನ್ ಮಾಡಿ." };
  }

  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanPrice = Number(price);
  if (!cleanName || !Number.isFinite(cleanPrice) || cleanPrice < 0) {
    return { error: "ಸರಿಯಾದ ಹೆಸರು ಮತ್ತು ಬೆಲೆ ನಮೂದಿಸಿ." };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { error: "ಸರ್ವರ್‌ನಲ್ಲಿ SUPABASE_SERVICE_ROLE_KEY ಸೆಟ್ ಆಗಿಲ್ಲ." };
  }

  const { error } = await supabaseAdmin.from("products").insert([
    {
      name: cleanName,
      price: cleanPrice,
      description: typeof description === "string" ? description.trim() : "",
    },
  ]);
  if (error) return { error: error.message };
  return { ok: true };
}
