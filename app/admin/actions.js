"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, checkPassword, isAdmin, sessionToken } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function login(prevState, formData) {
  if (!checkPassword(formData.get("password"))) {
    return { error: "ತಪ್ಪು ಪಾಸ್‌ವರ್ಡ್. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ." };
  }

  (await cookies()).set(ADMIN_COOKIE, sessionToken(), {
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
