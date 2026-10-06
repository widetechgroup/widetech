CREATE TABLE public.cyber_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.profiles(id),
  title text NOT NULL,
  training_type text NOT NULL DEFAULT 'awareness',
  audience text,
  trainer text,
  training_date date,
  location text,
  delivery_method text NOT NULL DEFAULT 'onsite' CHECK (delivery_method IN ('remote','onsite','hybrid')),
  participants integer,
  materials text,
  description text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.cyber_report_seq;
CREATE TABLE public.cyber_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code text NOT NULL UNIQUE DEFAULT '',
  title text NOT NULL,
  report_type text NOT NULL DEFAULT 'security_assessment' CHECK (report_type IN ('security_assessment','vulnerability','penetration','incident','risk','audit','compliance','executive','remediation')),
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  project_id uuid REFERENCES public.cyber_projects(id) ON DELETE SET NULL,
  prepared_by uuid REFERENCES public.profiles(id),
  reviewed_by uuid REFERENCES public.profiles(id),
  report_date date DEFAULT current_date,
  version integer NOT NULL DEFAULT 1,
  classification text NOT NULL DEFAULT 'confidential' CHECK (classification IN ('public','internal','confidential','restricted')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','under_review','approved','delivered','archived')),
  file_path text, file_name text,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cyber_report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.cyber_reports(id) ON DELETE CASCADE,
  version integer NOT NULL, file_path text NOT NULL, file_name text,
  uploaded_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cyber_report_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.cyber_reports(id) ON DELETE CASCADE,
  user_id uuid, action text NOT NULL DEFAULT 'download',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cyber_trainings, public.cyber_reports TO authenticated;
GRANT SELECT, INSERT ON public.cyber_report_versions TO authenticated;
GRANT SELECT ON public.cyber_report_access TO authenticated;
GRANT ALL ON public.cyber_trainings, public.cyber_reports, public.cyber_report_versions, public.cyber_report_access TO service_role;
GRANT USAGE ON SEQUENCE public.cyber_report_seq TO authenticated;
ALTER TABLE public.cyber_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cyber_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cyber_report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cyber_report_access ENABLE ROW LEVEL SECURITY;

INSERT INTO public.permissions(key, module_key, action, description, is_sensitive) VALUES
 ('cyber.reports.approve','cyber','approve','Approve cyber security reports',true),
 ('cyber.reports.download','cyber','download','Download cyber security reports',true)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_read_cyber_report(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.cyber_reports r WHERE r.id = _id AND (
    public.has_permission(auth.uid(),'cyber.view')
    OR (r.customer_id = auth.uid() AND r.status IN ('approved','delivered'))))
$$;

CREATE POLICY "trainings read" ON public.cyber_trainings FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.has_permission(auth.uid(),'cyber.view'));
CREATE POLICY "trainings insert" ON public.cyber_trainings FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "trainings update" ON public.cyber_trainings FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'cyber.edit')) WITH CHECK (public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "trainings delete" ON public.cyber_trainings FOR DELETE TO authenticated USING (public.has_permission(auth.uid(),'cyber.delete'));

CREATE POLICY "reports read" ON public.cyber_reports FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'cyber.view') OR (customer_id = auth.uid() AND status IN ('approved','delivered')));
CREATE POLICY "reports insert" ON public.cyber_reports FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "reports update" ON public.cyber_reports FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'cyber.edit')) WITH CHECK (public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "reports delete" ON public.cyber_reports FOR DELETE TO authenticated USING (public.has_permission(auth.uid(),'cyber.delete'));
CREATE POLICY "report versions read" ON public.cyber_report_versions FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'cyber.view'));
CREATE POLICY "report versions insert" ON public.cyber_report_versions FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "report access read" ON public.cyber_report_access FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'cyber.view'));

CREATE OR REPLACE FUNCTION public.log_report_access(_report uuid, _action text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_read_cyber_report(_report) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  INSERT INTO public.cyber_report_access(report_id, user_id, action) VALUES (_report, auth.uid(), left(coalesce(_action,'download'),20));
END $$;
GRANT EXECUTE ON FUNCTION public.log_report_access(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cyber_report_before() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.report_code := 'RPT-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.cyber_report_seq')::text,5,'0');
    NEW.created_by := auth.uid();
  ELSE
    NEW.report_code := OLD.report_code; NEW.created_at := OLD.created_at;
    IF NEW.status = 'approved' AND OLD.status <> 'approved' AND NOT public.has_permission(auth.uid(),'cyber.reports.approve') AND NOT public.has_role(auth.uid(),'super_admin') THEN
      RAISE EXCEPTION 'You are not allowed to approve reports';
    END IF;
    IF NEW.file_path IS DISTINCT FROM OLD.file_path AND NEW.file_path IS NOT NULL THEN NEW.version := OLD.version + 1; END IF;
  END IF;
  NEW.updated_by := auth.uid(); NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER cyber_report_before BEFORE INSERT OR UPDATE ON public.cyber_reports FOR EACH ROW EXECUTE FUNCTION public.cyber_report_before();
CREATE TRIGGER cyber_training_touch BEFORE INSERT OR UPDATE ON public.cyber_trainings FOR EACH ROW EXECUTE FUNCTION public.cyber_touch();
CREATE TRIGGER audit_cyber_reports AFTER INSERT OR UPDATE OR DELETE ON public.cyber_reports FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_cyber_trainings AFTER INSERT OR UPDATE OR DELETE ON public.cyber_trainings FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

CREATE POLICY "cyber files staff write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cyber-files' AND public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "cyber files staff delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'cyber-files' AND public.has_permission(auth.uid(),'cyber.delete'));
CREATE POLICY "cyber files read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'cyber-files' AND (
  public.has_permission(auth.uid(),'cyber.view')
  OR ((storage.foldername(name))[1] = 'reports' AND public.can_read_cyber_report(((storage.foldername(name))[2])::uuid))
  OR ((storage.foldername(name))[1] = 'training' AND EXISTS (SELECT 1 FROM public.cyber_trainings t WHERE t.id::text = (storage.foldername(name))[2] AND t.customer_id = auth.uid()))
));