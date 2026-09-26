CREATE TABLE public.company_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name text NOT NULL DEFAULT 'WideTech Group',
  tagline text NOT NULL DEFAULT 'KWETU WIDE TECH TU.',
  phone text,
  email text,
  whatsapp text,
  address text DEFAULT 'Dar es Salaam, Tanzania',
  usd_tzs_rate numeric NOT NULL DEFAULT 2600,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_settings TO anon, authenticated;
GRANT UPDATE, INSERT ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.company_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings super admin update" ON public.company_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "settings super admin insert" ON public.company_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit staff read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.write_audit_log() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec jsonb;
BEGIN
  rec := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, details)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, rec->>'id',
    CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('status', rec->>'status', 'old_status', to_jsonb(OLD)->>'status') ELSE jsonb_build_object('status', rec->>'status', 'role', rec->>'role', 'user_id', rec->>'user_id') END);
  RETURN NULL;
END $$;

CREATE TRIGGER audit_service_requests AFTER INSERT OR UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_quotations AFTER INSERT OR UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_user_roles AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_company_settings AFTER UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

INSERT INTO public.company_settings (id) VALUES (1) ON CONFLICT DO NOTHING;