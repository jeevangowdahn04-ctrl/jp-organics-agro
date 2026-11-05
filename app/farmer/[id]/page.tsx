import { Suspense } from "react";
import FarmerPage from "./FarmerPage";

// ರೈತರ ಪ್ರೊಫೈಲ್ ಪುಟ: id ರನ್‌ಟೈಮ್‌ನಲ್ಲಿ ತಿಳಿಯುವುದರಿಂದ Suspense ಒಳಗೆ (cacheComponents)
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={null}>{params.then(({ id }) => <FarmerPage id={id} />)}</Suspense>;
}
