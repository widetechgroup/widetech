ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;
UPDATE public.profiles SET account_status = 'suspended' WHERE is_suspended;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_status_chk CHECK (account_status IN ('active','pending','suspended','disabled','locked'));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_uniq ON public.profiles (lower(username)) WHERE username IS NOT NULL;

-- Runs before guard_profile_suspension (alphabetical), keeps is_suspended in sync and blocks self/non-super-admin status changes
CREATE OR REPLACE FUNCTION public.a_sync_account_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    IF auth.uid() IS NOT NULL AND (NOT public.has_role(auth.uid(), 'super_admin') OR NEW.id = auth.uid()) THEN
      RAISE EXCEPTION 'Not allowed to change account status';
    END IF;
    NEW.is_suspended := NEW.account_status IN ('suspended','disabled','locked');
  ELSIF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
    NEW.account_status := CASE WHEN NEW.is_suspended THEN 'suspended' ELSE 'active' END;
  END IF;
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at AND auth.uid() IS NOT NULL AND NEW.id <> auth.uid() THEN
    NEW.last_sign_in_at := OLD.last_sign_in_at;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER a_sync_account_status BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.a_sync_account_status();

-- guard_profile_suspension must allow service-role (auth.uid() null) changes made by trusted server code
CREATE OR REPLACE FUNCTION public.guard_profile_suspension()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
    IF auth.uid() IS NOT NULL AND (NOT public.has_role(auth.uid(), 'super_admin') OR NEW.id = auth.uid()) THEN
      RAISE EXCEPTION 'Not allowed to change suspension';
    END IF;
    NEW.suspended_at := CASE WHEN NEW.is_suspended THEN now() ELSE NULL END;
  END IF;
  RETURN NEW;
END $$;