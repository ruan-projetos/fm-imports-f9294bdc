UPDATE public.site_settings
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{whatsapp}',
  to_jsonb('88981907458'::text)
)
WHERE key = 'contact';

INSERT INTO public.site_settings (key, value)
VALUES ('contact', jsonb_build_object('whatsapp', '88981907458'))
ON CONFLICT (key) DO UPDATE
SET value = jsonb_set(
  COALESCE(public.site_settings.value, '{}'::jsonb),
  '{whatsapp}',
  to_jsonb('88981907458'::text)
)
WHERE public.site_settings.key = 'contact';

INSERT INTO public.site_settings (key, value)
VALUES ('whatsapp_number', to_jsonb('88981907458'::text))
ON CONFLICT (key) DO UPDATE
SET value = to_jsonb('88981907458'::text);