ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operations_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'consultant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'content_manager';

CREATE TABLE public.app_modules (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.permissions (
  key text PRIMARY KEY,
  module_key text NOT NULL REFERENCES public.app_modules(key) ON DELETE CASCADE,
  action text NOT NULL,
  description text,
  is_sensitive boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission_key)
);

GRANT SELECT ON public.app_modules, public.permissions, public.role_permissions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_modules, public.permissions, public.role_permissions TO authenticated;
GRANT ALL ON public.app_modules, public.permissions, public.role_permissions TO service_role;

ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules read" ON public.app_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "modules super admin" ON public.app_modules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "perms read" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "perms super admin" ON public.permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "rp read" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rp super admin" ON public.role_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role::text
    JOIN public.permissions p ON p.key = rp.permission_key
    JOIN public.app_modules m ON m.key = p.module_key AND m.is_enabled
    WHERE ur.user_id = _user_id AND rp.permission_key = _perm)
$$;

CREATE OR REPLACE FUNCTION public.my_permissions()
RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.key FROM public.permissions p JOIN public.app_modules m ON m.key = p.module_key AND m.is_enabled
  WHERE public.has_permission(auth.uid(), p.key)
$$;

CREATE TRIGGER audit_role_permissions AFTER INSERT OR DELETE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_app_modules AFTER UPDATE ON public.app_modules FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();