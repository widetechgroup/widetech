CREATE SEQUENCE IF NOT EXISTS public.cyber_project_seq;
CREATE TABLE public.cyber_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code text NOT NULL UNIQUE,
  request_id uuid REFERENCES public.cyber_service_requests(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  name text NOT NULL,
  service_type text,
  manager_id uuid REFERENCES public.profiles(id),
  team uuid[] NOT NULL DEFAULT '{}',
  start_date date,
  expected_end date,
  actual_end date,
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','in_progress','on_hold','completed','cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  scope text, objectives text, deliverables text, notes text,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cyber_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cyber_projects(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  name text NOT NULL,
  asset_type text NOT NULL DEFAULT 'other' CHECK (asset_type IN ('website','domain','web_app','mobile_app','api','server','cloud','network','endpoint','database','other')),
  owner text,
  environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('production','staging','development')),
  criticality text NOT NULL DEFAULT 'medium' CHECK (criticality IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','retired')),
  notes text,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cyber_projects, public.cyber_assets TO authenticated;
GRANT ALL ON public.cyber_projects, public.cyber_assets TO service_role;
GRANT USAGE ON SEQUENCE public.cyber_project_seq TO authenticated, service_role;
ALTER TABLE public.cyber_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cyber_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read cyber projects" ON public.cyber_projects FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR manager_id = auth.uid() OR auth.uid() = ANY(team) OR public.has_permission(auth.uid(),'cyber.view'));
CREATE POLICY "Create cyber projects" ON public.cyber_projects FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "Update cyber projects" ON public.cyber_projects FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'cyber.edit') OR manager_id = auth.uid());
CREATE POLICY "Delete cyber projects" ON public.cyber_projects FOR DELETE TO authenticated USING (public.has_permission(auth.uid(),'cyber.delete'));

CREATE POLICY "Read cyber assets" ON public.cyber_assets FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'cyber.view') OR EXISTS (SELECT 1 FROM public.cyber_projects p WHERE p.id = project_id AND (p.manager_id = auth.uid() OR auth.uid() = ANY(p.team))));
CREATE POLICY "Write cyber assets" ON public.cyber_assets FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "Update cyber assets" ON public.cyber_assets FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "Delete cyber assets" ON public.cyber_assets FOR DELETE TO authenticated USING (public.has_permission(auth.uid(),'cyber.delete'));

CREATE OR REPLACE FUNCTION public.cyber_project_before() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.project_code := 'CYP-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.cyber_project_seq')::text, 4, '0');
    NEW.created_by := auth.uid();
  ELSE
    NEW.project_code := OLD.project_code; NEW.created_at := OLD.created_at;
    IF NOT public.has_permission(auth.uid(),'cyber.edit') THEN
      NEW.manager_id := OLD.manager_id; NEW.team := OLD.team; NEW.customer_id := OLD.customer_id;
    END IF;
  END IF;
  IF NEW.status = 'completed' THEN NEW.progress := 100; NEW.actual_end := COALESCE(NEW.actual_end, current_date); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER cyber_project_before BEFORE INSERT OR UPDATE ON public.cyber_projects FOR EACH ROW EXECUTE FUNCTION public.cyber_project_before();
CREATE TRIGGER cyber_assets_touch BEFORE UPDATE ON public.cyber_assets FOR EACH ROW EXECUTE FUNCTION public.cyber_touch();
CREATE TRIGGER audit_cyber_projects AFTER INSERT OR UPDATE OR DELETE ON public.cyber_projects FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_cyber_assets AFTER INSERT OR UPDATE OR DELETE ON public.cyber_assets FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();