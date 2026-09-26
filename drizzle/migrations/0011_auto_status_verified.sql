ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.guard_profile_verified()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    IF NOT public.has_role(auth.uid(), 'super_admin') THEN
      RAISE EXCEPTION 'Only the super admin can verify accounts';
    END IF;
    NEW.verified_at := CASE WHEN NEW.is_verified THEN now() ELSE NULL END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_profile_verified BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_verified();
CREATE TRIGGER audit_profiles_verified AFTER UPDATE ON public.profiles
  FOR EACH ROW WHEN (OLD.is_verified IS DISTINCT FROM NEW.is_verified) EXECUTE FUNCTION public.write_audit_log();

-- Assigning a technician moves a pending request to reviewing
CREATE OR REPLACE FUNCTION public.on_request_assign()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_technician_id IS NOT NULL AND OLD.assigned_technician_id IS DISTINCT FROM NEW.assigned_technician_id AND NEW.status = 'pending' THEN
    NEW.status := 'reviewing';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER request_assign BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_request_assign();

-- Declined quote sends the request back to reviewing
CREATE OR REPLACE FUNCTION public.on_quote_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.service_requests SET status = 'quoted' WHERE id = NEW.request_id AND status IN ('pending','reviewing');
  ELSIF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    INSERT INTO public.projects (quotation_id, request_id, customer_id, title)
      SELECT NEW.id, r.id, NEW.customer_id, r.title FROM public.service_requests r WHERE r.id = NEW.request_id
      ON CONFLICT (quotation_id) DO NOTHING;
    UPDATE public.service_requests SET status = 'in_progress' WHERE id = NEW.request_id;
  ELSIF NEW.status = 'declined' AND OLD.status <> 'declined' THEN
    UPDATE public.service_requests SET status = 'reviewing' WHERE id = NEW.request_id AND status = 'quoted';
  END IF;
  RETURN NEW;
END $$;

-- Project progress drives the request status
CREATE OR REPLACE FUNCTION public.on_project_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.progress >= 100 AND NEW.status <> 'completed' THEN
    NEW.status := 'completed';
  END IF;
  IF NEW.status = 'completed' THEN
    NEW.progress := 100;
    UPDATE public.service_requests SET status = 'completed' WHERE id = NEW.request_id AND status <> 'completed';
  ELSIF NEW.status = 'cancelled' THEN
    UPDATE public.service_requests SET status = 'cancelled' WHERE id = NEW.request_id;
  ELSIF NEW.progress > 0 THEN
    UPDATE public.service_requests SET status = 'in_progress' WHERE id = NEW.request_id AND status NOT IN ('in_progress','completed');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER project_change BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.on_project_change();

-- Live updates for the tracking page
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.projects; EXCEPTION WHEN others THEN NULL; END;
END $$;