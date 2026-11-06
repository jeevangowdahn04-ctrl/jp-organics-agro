import type { Metadata } from "next";
import { SHARE_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "ನನ್ನ ಆರ್ಡರ್‌ಗಳು / My Orders",
  description: "ನಿಮ್ಮ JP Organics ಆರ್ಡರ್‌ಗಳು.",
  openGraph: { title: "ನನ್ನ ಆರ್ಡರ್‌ಗಳು / My Orders | JP Organics", description: "ನಿಮ್ಮ JP Organics ಆರ್ಡರ್‌ಗಳು.", images: [SHARE_IMAGE] },
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
