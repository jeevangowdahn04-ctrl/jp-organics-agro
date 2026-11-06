import type { Metadata } from "next";
import { SHARE_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "ಹುಡುಕಿ / Search",
  description: "ರೈತರು ಮತ್ತು ಕೃಷಿ ಉತ್ಪನ್ನಗಳನ್ನು ಹುಡುಕಿ.",
  openGraph: { title: "ಹುಡುಕಿ / Search | JP Organics", description: "ರೈತರು ಮತ್ತು ಕೃಷಿ ಉತ್ಪನ್ನಗಳನ್ನು ಹುಡುಕಿ.", images: [SHARE_IMAGE] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
