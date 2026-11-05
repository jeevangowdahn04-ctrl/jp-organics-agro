import { supabase } from "@/lib/supabase";

export interface FarmerStory {
  id: number;
  created_at: string;
  farmer_name: string;
  village: string | null;
  product: string | null;
  crop: string | null;
  note: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
  status: "pending" | "approved";
}

// ಸಾರ್ವಜನಿಕರಿಗೆ: ಅನುಮೋದಿತ ಕಥೆಗಳು ಮಾತ್ರ (RLS ಕೂಡ ಇದನ್ನೇ ಖಚಿತಪಡಿಸುತ್ತದೆ)
export async function loadApprovedStories(limit = 60): Promise<FarmerStory[]> {
  const { data, error } = await supabase
    .from("farmer_stories")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    // ಟೇಬಲ್ ಇನ್ನೂ ಇಲ್ಲದಿದ್ದರೆ ಖಾಲಿ ಪಟ್ಟಿ
    if (error.code !== "42P01" && error.code !== "PGRST205") console.error("Stories load failed:", error.message);
    return [];
  }
  return (data ?? []) as FarmerStory[];
}
