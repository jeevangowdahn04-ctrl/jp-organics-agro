import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "./components/cart/CartProvider";
import { CustomerProvider } from "./components/customer/CustomerProvider";
import { LanguageProvider } from "./components/i18n/LanguageProvider";
import BottomNav from "./components/BottomNav";
import SecretAdminLogin from "./components/admin/SecretAdminLogin";
import FloatingCall from "./components/FloatingCall";
import { BRAND_GREEN, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s | JP Organics" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["organic fertilizer", "ಸಾವಯವ ಗೊಬ್ಬರ", "agro center", "Channarayapatna", "ಚನ್ನರಾಯಪಟ್ಟಣ", "JP Organics"],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "kn_IN",
    alternateLocale: ["en_IN"],
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
};

export const viewport: Viewport = { themeColor: BRAND_GREEN };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="kn"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <CustomerProvider>
            <CartProvider>
              {children}
              {/* usePathname ಬಳಸುವುದರಿಂದ Suspense ಒಳಗೆ (cacheComponents ನಿಯಮ) */}
              <Suspense fallback={null}>
                <BottomNav />
                <SecretAdminLogin />
                <FloatingCall />
              </Suspense>
            </CartProvider>
          </CustomerProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
