import type { Metadata } from "next";
import { SHARE_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "ರೀಲ್ಸ್ / Reels",
  description: "ರೈತ ಸಮುದಾಯದ ಕೃಷಿ ಸಲಹೆ ಮತ್ತು ಬೆಳೆ ಫಲಿತಾಂಶದ ಕಿರು ವಿಡಿಯೋಗಳು.",
  openGraph: { title: "ರೀಲ್ಸ್ / Reels | JP Organics", description: "ರೈತ ಸಮುದಾಯದ ಕೃಷಿ ಸಲಹೆ ಮತ್ತು ಬೆಳೆ ಫಲಿತಾಂಶದ ಕಿರು ವಿಡಿಯೋಗಳು.", images: [SHARE_IMAGE] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
