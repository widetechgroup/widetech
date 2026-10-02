CREATE SEQUENCE IF NOT EXISTS public.cyber_request_seq;

CREATE TABLE public.cyber_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.cyber_services(id) ON DELETE SET NULL,
  package_id uuid REFERENCES public.cyber_service_packages(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  customer_name text NOT NULL,
  organization text,
  email text NOT NULL,
  phone text,
  security_concern text NOT NULL,
  description text NOT NULL,
  preferred_date date,
  preferred_method text NOT NULL DEFAULT 'remote' CHECK (preferred_method IN ('remote','onsite','hybrid')),
  organization_type text NOT NULL DEFAULT 'individual',
  asset_count integer CHECK (asset_count IS NULL OR asset_count >= 0),
  website_url text,
  application_name text,
  domain_name text,
  additional_info text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','under_review','client_contacted','scoping','quote_prepared','approved','scheduled','in_progress','quality_review','report_prepared','client_delivery','completed','closed','cancelled')),
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  internal_notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.cyber_service_requests (customer_id);
CREATE INDEX ON public.cyber_service_requests (status);

CREATE TABLE public.cyber_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.cyber_service_requests(id) ON DELETE CASCADE,
  actor_id uuid,
  from_status text,
  to_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.cyber_request_events (request_id);

GRANT SELECT, INSERT, UPDATE ON public.cyber_service_requests TO authenticated;
GRANT ALL ON public.cyber_service_requests TO service_role;
GRANT SELECT ON public.cyber_request_events TO authenticated;
GRANT ALL ON public.cyber_request_events TO service_role;
GRANT USAGE ON SEQUENCE public.cyber_request_seq TO authenticated, service_role;

ALTER TABLE public.cyber_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cyber_request_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers read own cyber requests" ON public.cyber_service_requests FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR assigned_to = auth.uid() OR public.has_permission(auth.uid(),'cyber.view'));
CREATE POLICY "Customers create own cyber requests" ON public.cyber_service_requests FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Cyber staff update requests" ON public.cyber_service_requests FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'cyber.edit') OR assigned_to = auth.uid());

CREATE POLICY "Read events of visible requests" ON public.cyber_request_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cyber_service_requests r WHERE r.id = request_id
    AND (r.customer_id = auth.uid() OR r.assigned_to = auth.uid() OR public.has_permission(auth.uid(),'cyber.view'))));

-- Before insert: code, force safe defaults for customers
CREATE OR REPLACE FUNCTION public.cyber_request_before_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.request_code := 'CYB-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.cyber_request_seq')::text, 5, '0');
  NEW.created_by := auth.uid();
  IF NOT public.has_permission(auth.uid(),'cyber.edit') THEN
    NEW.status := 'new'; NEW.assigned_to := NULL; NEW.internal_notes := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cyber_request_before_insert BEFORE INSERT ON public.cyber_service_requests FOR EACH ROW EXECUTE FUNCTION public.cyber_request_before_insert();

-- Before update: protect fixed fields, stamp updater
CREATE OR REPLACE FUNCTION public.cyber_request_before_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.request_code := OLD.request_code;
  NEW.customer_id := OLD.customer_id;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  IF NOT public.has_permission(auth.uid(),'cyber.edit') THEN
    NEW.assigned_to := OLD.assigned_to;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cyber_request_before_update BEFORE UPDATE ON public.cyber_service_requests FOR EACH ROW EXECUTE FUNCTION public.cyber_request_before_update();

-- Timeline
CREATE OR REPLACE FUNCTION public.cyber_request_timeline() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.cyber_request_events(request_id, actor_id, from_status, to_status, note) VALUES (NEW.id, auth.uid(), NULL, NEW.status, 'Request submitted');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.cyber_request_events(request_id, actor_id, from_status, to_status) VALUES (NEW.id, auth.uid(), OLD.status, NEW.status);
  ELSIF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    INSERT INTO public.cyber_request_events(request_id, actor_id, from_status, to_status, note) VALUES (NEW.id, auth.uid(), OLD.status, NEW.status, 'Analyst assignment changed');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cyber_request_timeline AFTER INSERT OR UPDATE ON public.cyber_service_requests FOR EACH ROW EXECUTE FUNCTION public.cyber_request_timeline();
CREATE TRIGGER audit_cyber_requests AFTER INSERT OR UPDATE ON public.cyber_service_requests FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

ALTER PUBLICATION supabase_realtime ADD TABLE public.cyber_service_requests;