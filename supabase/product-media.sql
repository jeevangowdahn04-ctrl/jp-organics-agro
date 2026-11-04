-- JP Organics: ಪ್ರಾಡಕ್ಟ್ ಫೋಟೋ ಮತ್ತು ವಿಡಿಯೋ
-- Supabase Dashboard -> SQL Editor ನಲ್ಲಿ ಇದನ್ನು ಒಮ್ಮೆ ರನ್ ಮಾಡಿ.

-- ವಿಡಿಯೋ ಲಿಂಕ್ (YouTube URL ಅಥವಾ Storage ನಲ್ಲಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ವಿಡಿಯೋ URL)
alter table public.products add column if not exists video_url text;
-- image_url ಈಗಾಗಲೇ ಇದೆ; ಇಲ್ಲದಿದ್ದರೆ ಸೇರಿಸುತ್ತದೆ
alter table public.products add column if not exists image_url text;

-- Storage ಬಕೆಟ್: ಎಲ್ಲರೂ ನೋಡಬಹುದು (public), ಪ್ರತಿ ಫೈಲ್ ಗರಿಷ್ಠ 50MB, ಫೋಟೋ/ವಿಡಿಯೋ ಮಾತ್ರ.
-- ಅಪ್‌ಲೋಡ್ ಸರ್ವರ್ ಕೊಡುವ signed URL ಮೂಲಕ ಮಾತ್ರ ಆಗುತ್ತದೆ (ಅಡ್ಮಿನ್ ಲಾಗಿನ್ ಆಗಿದ್ದರೆ ಮಾತ್ರ),
-- ಹಾಗಾಗಿ anon ಗೆ storage.objects ಮೇಲೆ INSERT policy ಬೇಕಿಲ್ಲ.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media', 'product-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do nothing;
