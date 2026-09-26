ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'all';
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_scope_chk CHECK (scope IN ('all','team','assigned','own','custom'));
GRANT UPDATE ON public.role_permissions TO authenticated;
DROP POLICY IF EXISTS "rp super admin update" ON public.role_permissions;
CREATE POLICY "rp super admin update" ON public.role_permissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
-- Technicians work on assigned records by default
UPDATE public.role_permissions SET scope = 'assigned' WHERE role = 'technician' AND permission_key LIKE ANY (ARRAY['requests.%','projects.%']);
UPDATE public.role_permissions SET scope = 'own' WHERE role = 'customer';

CREATE TABLE public.user_permission_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'all' CHECK (scope IN ('all','team','assigned','own','custom')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  reason text NOT NULL,
  granted_by uuid DEFAULT auth.uid(),
  revoked_at timestamptz,
  revoked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
GRANT SELECT, INSERT, UPDATE ON public.user_permission_grants TO authenticated;
GRANT ALL ON public.user_permission_grants TO service_role;
ALTER TABLE public.user_permission_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upg read" ON public.user_permission_grants FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "upg insert" ON public.user_permission_grants FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin') AND user_id <> auth.uid() AND granted_by = auth.uid());
CREATE POLICY "upg revoke" ON public.user_permission_grants FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE INDEX upg_user_idx ON public.user_permission_grants (user_id, ends_at);
CREATE TRIGGER audit_user_permission_grants AFTER INSERT OR UPDATE ON public.user_permission_grants FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

-- All (permission, scope) pairs a user effectively holds right now
CREATE OR REPLACE FUNCTION public.effective_permissions(_user_id uuid)
RETURNS TABLE (permission_key text, scope text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH src AS (
    SELECT p.key AS permission_key, 'all'::text AS scope FROM public.permissions p
      WHERE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
    UNION ALL
    SELECT rp.permission_key, rp.scope FROM (
        SELECT role::text AS rk FROM public.user_roles WHERE user_id = _user_id
        UNION SELECT role_key FROM public.user_custom_roles WHERE user_id = _user_id) ur
      JOIN public.roles r ON r.key = ur.rk AND r.is_active
      JOIN public.role_permissions rp ON rp.role = ur.rk
    UNION ALL
    SELECT g.permission_key, g.scope FROM public.user_permission_grants g
      WHERE g.user_id = _user_id AND g.revoked_at IS NULL AND now() >= g.starts_at AND now() < g.ends_at
  )
  SELECT s.permission_key,
    (array_agg(s.scope ORDER BY array_position(ARRAY['all','team','custom','assigned','own'], s.scope)))[1]
  FROM src s
  JOIN public.permissions p ON p.key = s.permission_key
  JOIN public.app_modules m ON m.key = p.module_key AND m.is_enabled
  GROUP BY s.permission_key
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.effective_permissions(_user_id) e WHERE e.permission_key = _perm)
$$;

CREATE OR REPLACE FUNCTION public.permission_scope(_user_id uuid, _perm text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT scope FROM public.effective_permissions(_user_id) WHERE permission_key = _perm
$$;

-- Super admin can preview anyone's access (read-only)
CREATE OR REPLACE FUNCTION public.preview_user_permissions(_user_id uuid)
RETURNS TABLE (permission_key text, scope text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'Only the super admin can preview access'; END IF;
  RETURN QUERY SELECT * FROM public.effective_permissions(_user_id);
END $$;

-- Record-scope checks used by policies
CREATE OR REPLACE FUNCTION public.scope_allows(_user_id uuid, _perm text, _owner uuid, _assignee uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE public.permission_scope(_user_id, _perm)
    WHEN 'all' THEN true WHEN 'team' THEN true WHEN 'custom' THEN true
    WHEN 'assigned' THEN _assignee = _user_id
    WHEN 'own' THEN _owner = _user_id
    ELSE false END
$$;

CREATE POLICY "scoped read requests" ON public.service_requests FOR SELECT TO authenticated
  USING (public.scope_allows(auth.uid(), 'requests.view', customer_id, assigned_technician_id));
CREATE POLICY "scoped edit requests" ON public.service_requests FOR UPDATE TO authenticated
  USING (public.scope_allows(auth.uid(), 'requests.edit', customer_id, assigned_technician_id));
CREATE POLICY "scoped read projects" ON public.projects FOR SELECT TO authenticated
  USING (public.scope_allows(auth.uid(), 'projects.view', customer_id,
    (SELECT r.assigned_technician_id FROM public.service_requests r WHERE r.id = request_id)));
CREATE POLICY "scoped edit projects" ON public.projects FOR UPDATE TO authenticated
  USING (public.scope_allows(auth.uid(), 'projects.edit', customer_id,
    (SELECT r.assigned_technician_id FROM public.service_requests r WHERE r.id = request_id)));