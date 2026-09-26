CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL UNIQUE,
  url text NOT NULL,
  name text NOT NULL,
  folder text NOT NULL DEFAULT 'general',
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.media_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media public read" ON public.media_assets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "media admin write" ON public.media_assets FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'));

ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_url text;

CREATE POLICY "media bucket read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'media');
CREATE POLICY "media bucket admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "media bucket admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')));