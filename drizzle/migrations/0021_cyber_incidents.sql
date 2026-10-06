CREATE SEQUENCE IF NOT EXISTS public.cyber_incident_seq;
CREATE TABLE public.cyber_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_code text NOT NULL UNIQUE DEFAULT '',
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  project_id uuid REFERENCES public.cyber_projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  incident_type text NOT NULL DEFAULT 'other' CHECK (incident_type IN ('malware','phishing','unauthorized_access','data_exposure','account_compromise','ransomware','website_compromise','dos','suspicious_activity','other')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  detected_at date,
  reported_at date DEFAULT current_date,
  handler_id uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'reported' CHECK (status IN ('reported','investigating','contained','eradication','recovery','closed')),
  description text,
  actions_taken text,
  lessons_learned text,
  final_report text,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cyber_incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.cyber_incidents(id) ON DELETE CASCADE,
  actor_id uuid,
  from_status text, to_status text NOT NULL, note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cyber_incidents TO authenticated;
GRANT SELECT ON public.cyber_incident_events TO authenticated;
GRANT ALL ON public.cyber_incidents, public.cyber_incident_events TO service_role;
GRANT USAGE ON SEQUENCE public.cyber_incident_seq TO authenticated;
ALTER TABLE public.cyber_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cyber_incident_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incidents read" ON public.cyber_incidents FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR handler_id = auth.uid() OR public.has_permission(auth.uid(),'cyber.view'));
CREATE POLICY "incidents insert" ON public.cyber_incidents FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "incidents update" ON public.cyber_incidents FOR UPDATE TO authenticated
  USING (handler_id = auth.uid() OR public.has_permission(auth.uid(),'cyber.edit'))
  WITH CHECK (handler_id = auth.uid() OR public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "incidents delete" ON public.cyber_incidents FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(),'cyber.delete'));
CREATE POLICY "incident events read" ON public.cyber_incident_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cyber_incidents i WHERE i.id = incident_id AND (i.customer_id = auth.uid() OR i.handler_id = auth.uid() OR public.has_permission(auth.uid(),'cyber.view'))));

CREATE OR REPLACE FUNCTION public.cyber_incident_before() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE staff boolean := public.has_permission(auth.uid(),'cyber.edit');
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.incident_code := 'INC-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.cyber_incident_seq')::text,5,'0');
    NEW.created_by := auth.uid();
    IF NOT staff THEN NEW.status := 'reported'; NEW.handler_id := NULL; NEW.actions_taken := NULL; NEW.lessons_learned := NULL; NEW.final_report := NULL; END IF;
  ELSE
    NEW.incident_code := OLD.incident_code; NEW.customer_id := OLD.customer_id; NEW.created_at := OLD.created_at;
    IF NOT staff THEN NEW.handler_id := OLD.handler_id; END IF;
  END IF;
  NEW.updated_by := auth.uid(); NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER cyber_incident_before BEFORE INSERT OR UPDATE ON public.cyber_incidents FOR EACH ROW EXECUTE FUNCTION public.cyber_incident_before();

CREATE OR REPLACE FUNCTION public.cyber_incident_timeline() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.cyber_incident_events(incident_id, actor_id, to_status, note) VALUES (NEW.id, auth.uid(), NEW.status, 'Incident reported');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.cyber_incident_events(incident_id, actor_id, from_status, to_status) VALUES (NEW.id, auth.uid(), OLD.status, NEW.status);
  ELSIF NEW.handler_id IS DISTINCT FROM OLD.handler_id THEN
    INSERT INTO public.cyber_incident_events(incident_id, actor_id, from_status, to_status, note) VALUES (NEW.id, auth.uid(), OLD.status, NEW.status, 'Handler changed');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cyber_incident_timeline AFTER INSERT OR UPDATE ON public.cyber_incidents FOR EACH ROW EXECUTE FUNCTION public.cyber_incident_timeline();
CREATE TRIGGER audit_cyber_incidents AFTER INSERT OR UPDATE OR DELETE ON public.cyber_incidents FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();