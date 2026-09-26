CREATE TABLE public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  device_key text NOT NULL,
  label text NOT NULL,
  user_agent text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "devices own read" ON public.user_devices FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "devices own insert" ON public.user_devices FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "devices own update" ON public.user_devices FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "devices own delete" ON public.user_devices FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX user_devices_last_seen_idx ON public.user_devices (last_seen DESC);

INSERT INTO public.services (category_id, title, slug, short_description, full_description, starting_price, price_tzs, billing_type, features, display_order, is_active)
SELECT c.id, 'Device Security', 'device-security',
  'Antivirus, device lockdown and theft protection for phones and computers.',
  'We protect your business phones, laptops and desktops: managed antivirus, encryption, screen-lock and password policies, remote locate and wipe for lost devices, and regular security health checks.',
  40, 104000, 'Monthly / per device',
  '["Managed antivirus","Disk encryption","Remote lock & wipe","Security health checks"]'::jsonb, 9, true
FROM public.service_categories c WHERE c.slug = 'protect'
AND NOT EXISTS (SELECT 1 FROM public.services WHERE slug = 'device-security');