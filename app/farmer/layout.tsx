import type { Metadata } from "next";
import { SHARE_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "ರೈತ ಸಮುದಾಯ / Farmer Community",
  description: "JP Organics ರೈತ ಸಮುದಾಯ: ರೈತರ ಪೋಸ್ಟ್‌ಗಳು, ರೀಲ್ಸ್ ಮತ್ತು ಫ್ರೆಂಡ್ಸ್.",
  openGraph: { title: "ರೈತ ಸಮುದಾಯ / Farmer Community | JP Organics", description: "JP Organics ರೈತ ಸಮುದಾಯ: ರೈತರ ಪೋಸ್ಟ್‌ಗಳು, ರೀಲ್ಸ್ ಮತ್ತು ಫ್ರೆಂಡ್ಸ್.", images: [SHARE_IMAGE] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
