ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

CREATE POLICY "super admin update profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.guard_profile_suspension()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
    IF NOT public.has_role(auth.uid(), 'super_admin') OR NEW.id = auth.uid() THEN
      RAISE EXCEPTION 'Not allowed to change suspension';
    END IF;
    NEW.suspended_at := CASE WHEN NEW.is_suspended THEN now() ELSE NULL END;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER guard_profile_suspension BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_suspension();
CREATE TRIGGER audit_profiles AFTER UPDATE ON public.profiles
  FOR EACH ROW WHEN (OLD.is_suspended IS DISTINCT FROM NEW.is_suspended) EXECUTE FUNCTION public.write_audit_log();