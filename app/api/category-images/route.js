import { cacheLife, cacheTag } from "next/cache";
import { getCategoryImages } from "@/app/categories/actions";

// ವರ್ಗಗಳ ಲೋಗೋಗಳು (ಸಾರ್ವಜನಿಕ, ಕ್ಯಾಶ್ ಮಾಡಿದ GET): ಪ್ರತಿ ಭೇಟಿಗೂ ಸರ್ವರ್ ಫಂಕ್ಷನ್ ಎಬ್ಬಿಸುವ ಬದಲು
// ಮೊದಲೇ ಸಿದ್ಧಪಡಿಸಿದ ಉತ್ತರ. ಅಡ್ಮಿನ್ ಲೋಗೋ ಬದಲಿಸಿದಾಗ setCategoryImage "category-images" ಟ್ಯಾಗ್ ಅನ್ನು ನವೀಕರಿಸುತ್ತದೆ.
export async function GET() {
  return Response.json(await cachedCategoryImages());
}

async function cachedCategoryImages() {
  "use cache";
  cacheLife("hours");
  cacheTag("category-images");
  return getCategoryImages();
}
