import type { Metadata } from "next";
import { SHARE_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "ರೈತರ ಅನುಭವ & ಫಲಿತಾಂಶಗಳು / Farmer Stories",
  description: "JP Organics ಉತ್ಪನ್ನಗಳನ್ನು ಬಳಸಿದ ರೈತರ ನಿಜವಾದ ಫಲಿತಾಂಶಗಳು, ಫೋಟೋ ಮತ್ತು ವಿಡಿಯೋಗಳೊಂದಿಗೆ.",
  openGraph: { title: "ರೈತರ ಅನುಭವ & ಫಲಿತಾಂಶಗಳು / Farmer Stories | JP Organics", description: "JP Organics ಉತ್ಪನ್ನಗಳನ್ನು ಬಳಸಿದ ರೈತರ ನಿಜವಾದ ಫಲಿತಾಂಶಗಳು, ಫೋಟೋ ಮತ್ತು ವಿಡಿಯೋಗಳೊಂದಿಗೆ.", images: [SHARE_IMAGE] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
