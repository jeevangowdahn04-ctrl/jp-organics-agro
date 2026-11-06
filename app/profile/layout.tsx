import type { Metadata } from "next";
import { SHARE_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "ನನ್ನ ಪ್ರೊಫೈಲ್ / Profile",
  description: "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್, ವಿಳಾಸ ಮತ್ತು ರೈತ ಸಮುದಾಯ.",
  openGraph: { title: "ನನ್ನ ಪ್ರೊಫೈಲ್ / Profile | JP Organics", description: "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್, ವಿಳಾಸ ಮತ್ತು ರೈತ ಸಮುದಾಯ.", images: [SHARE_IMAGE] },
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
