-- JP Organics: ಒಂದು ಪ್ರಾಡಕ್ಟ್‌ಗೆ ಬಹು ಫೋಟೋಗಳು (ಗರಿಷ್ಠ 10)
-- Supabase Dashboard -> SQL Editor ನಲ್ಲಿ ರನ್ ಮಾಡಿ, ಅಥವಾ Table Editor ನಲ್ಲಿ
-- products ಟೇಬಲ್‌ಗೆ "image_urls" ಹೆಸರಿನ "jsonb" ಕಾಲಂ (nullable) ಸೇರಿಸಿ.
--
-- image_urls = ಫೋಟೋ URL ಗಳ JSON array. image_url = ಮೊದಲ ಫೋಟೋ (ಹಳೆಯ ಕೋಡ್/ಡೇಟಾ ಜೊತೆ ಹೊಂದಾಣಿಕೆಗೆ).

alter table public.products add column if not exists image_urls jsonb;

-- ಈಗಾಗಲೇ ಒಂದು ಫೋಟೋ ಇರುವ ಪ್ರಾಡಕ್ಟ್‌ಗಳನ್ನು ಹೊಸ ಕಾಲಂಗೆ ಸರಿಸುವುದು
update public.products
set image_urls = jsonb_build_array(image_url)
where image_urls is null and image_url is not null and image_url <> '';
