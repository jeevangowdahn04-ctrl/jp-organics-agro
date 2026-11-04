import { Suspense } from "react";
import ProductDetail from "./ProductDetail";

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-emerald-700 font-semibold">
      ಉತ್ಪನ್ನ ಲೋಡ್ ಆಗುತ್ತಿದೆ...
    </div>
  );
}

// ಪ್ರಾಡಕ್ಟ್ ವಿವರ ಪೇಜ್: id ರನ್‌ಟೈಮ್‌ನಲ್ಲಿ ಮಾತ್ರ ತಿಳಿಯುವುದರಿಂದ Suspense ಒಳಗೆ ಓದುತ್ತೇವೆ (cacheComponents)
export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ id }) => (
        <ProductDetail id={id} />
      ))}
    </Suspense>
  );
}
