CREATE TABLE public.roles (
  key text PRIMARY KEY CHECK (key ~ '^[a-z0-9_]{2,40}$'),
  name text NOT NULL,
  description text,
  role_type text NOT NULL DEFAULT 'custom' CHECK (role_type IN ('system','custom')),
  audience text NOT NULL DEFAULT 'staff' CHECK (audience IN ('staff','customer')),
  is_active boolean NOT NULL DEFAULT true,
  is_protected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles read" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles super admin insert" ON public.roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'super_admin') AND role_type = 'custom');
CREATE POLICY "roles super admin update" ON public.roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin') AND (key <> 'super_admin' OR is_active));
CREATE POLICY "roles super admin delete" ON public.roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin') AND role_type = 'custom' AND NOT is_protected);

INSERT INTO public.roles (key,name,description,role_type,audience,is_protected) VALUES
 ('super_admin','Super Admin','Full control of the platform','system','staff',true),
 ('admin','Admin','Only the permissions the super admin gives','system','staff',true),
 ('operations_manager','Operations Manager','Runs daily operations','system','staff',true),
 ('operator','Operator','Handles requests and dispatch','system','staff',true),
 ('sales','Sales / Business Development','Quotes and customer follow-up','system','staff',true),
 ('technician','Technician','Works on assigned requests','system','staff',true),
 ('consultant','Consultant','Runs consultations','system','staff',true),
 ('support','Customer Support','Answers customer conversations','system','staff',true),
 ('finance','Finance','Quotes, invoices and payments','system','staff',true),
 ('content_manager','Content / Media Manager','Services content and media','system','staff',true),
 ('customer','Customer','Customer account','system','customer',true);

-- role_permissions.role may point to any role key (system or custom)
DELETE FROM public.role_permissions WHERE role NOT IN (SELECT key FROM public.roles);
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_fk FOREIGN KEY (role) REFERENCES public.roles(key) ON DELETE CASCADE;

CREATE TABLE public.user_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_key text NOT NULL REFERENCES public.roles(key) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_key)
);
GRANT SELECT, INSERT, DELETE ON public.user_custom_roles TO authenticated;
GRANT ALL ON public.user_custom_roles TO service_role;
ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ucr own read" ON public.user_custom_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "ucr super admin insert" ON public.user_custom_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin') AND user_id <> auth.uid()
    AND EXISTS (SELECT 1 FROM public.roles r WHERE r.key = role_key AND r.role_type = 'custom'));
CREATE POLICY "ucr super admin delete" ON public.user_custom_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin') AND user_id <> auth.uid());
CREATE TRIGGER audit_user_custom_roles AFTER INSERT OR DELETE ON public.user_custom_roles FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_roles AFTER INSERT OR UPDATE OR DELETE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

-- Primary role label on the profile (super admin only)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_role text;
CREATE OR REPLACE FUNCTION public.guard_primary_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.primary_role IS DISTINCT FROM OLD.primary_role AND auth.uid() IS NOT NULL
     AND (NOT public.has_role(auth.uid(),'super_admin') OR NEW.id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the super admin can change the primary role';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_primary_role BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_primary_role();

-- Module dependencies
ALTER TABLE public.app_modules ADD COLUMN IF NOT EXISTS depends_on text[] NOT NULL DEFAULT '{}';
INSERT INTO public.app_modules (key,name,description,display_order,is_enabled) VALUES
 ('customers','Customers','Customer records',13,true),
 ('chat','Chat & files','Messages and shared files',14,true),
 ('invoices','Invoices','Billing (coming soon)',15,false),
 ('payments','Payments','Payment records (coming soon)',16,false),
 ('products','Products','Product catalogue (coming soon)',17,false),
 ('branding','Branding','Logo, colours and company details',18,true)
ON CONFLICT (key) DO NOTHING;
UPDATE public.app_modules SET depends_on = ARRAY['requests'] WHERE key IN ('quotations','chat');
UPDATE public.app_modules SET depends_on = ARRAY['requests','quotations'] WHERE key = 'projects';
UPDATE public.app_modules SET depends_on = ARRAY['users'] WHERE key = 'roles';
UPDATE public.app_modules SET depends_on = ARRAY['customers','invoices'] WHERE key = 'payments';
UPDATE public.app_modules SET depends_on = ARRAY['customers'] WHERE key = 'invoices';
UPDATE public.app_modules SET depends_on = ARRAY['media'] WHERE key IN ('services','branding');

-- Granular permissions
INSERT INTO public.permissions (key, module_key, action, description, is_sensitive)
SELECT m.key || '.' || a, m.key, a, initcap(a) || ' ' || lower(m.name), a IN ('delete','manage')
FROM public.app_modules m CROSS JOIN unnest(ARRAY['view','create','edit','delete','manage']) a
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.permissions (key, module_key, action, description, is_sensitive) VALUES
 ('services.publish','services','publish','Publish or hide services',false),
 ('services.manage_rates','services','manage_rates','Change prices and exchange rates',true),
 ('services.manage_categories','services','manage_categories','Manage service categories',false),
 ('services.manage_features','services','manage_features','Edit what is included',false),
 ('users.activate','users','activate','Activate accounts',true),
 ('users.suspend','users','suspend','Suspend or disable accounts',true),
 ('users.assign_role','users','assign_role','Assign roles to people',true),
 ('users.manage_permissions','users','manage_permissions','Change role permissions',true),
 ('users.view_activity','users','view_activity','See a person''s activity',false),
 ('users.revoke_sessions','users','revoke_sessions','Sign people out of devices',true),
 ('requests.assign','requests','assign','Assign technicians',false),
 ('requests.edit_assigned','requests','edit_assigned','Update requests assigned to them',false),
 ('chat.reply','chat','reply','Reply to customers',false),
 ('chat.attach','chat','attach','Send files and media',false),
 ('chat.assign','chat','assign','Hand conversations to staff',false),
 ('chat.escalate','chat','escalate','Escalate conversations',false),
 ('invoices.send','invoices','send','Send invoices',false),
 ('invoices.cancel','invoices','cancel','Cancel invoices',true),
 ('invoices.refund','invoices','refund','Refund invoices',true),
 ('invoices.export','invoices','export','Export invoices',false),
 ('projects.update_status','projects','update_status','Update project progress',false),
 ('media.upload_documents','media','upload_documents','Upload technical documents',false)
ON CONFLICT (key) DO NOTHING;

-- Effective permissions = union of all active system + custom roles
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'super_admin')
  OR EXISTS (
    SELECT 1 FROM (
      SELECT role::text AS rk FROM public.user_roles WHERE user_id = _user_id
      UNION SELECT role_key FROM public.user_custom_roles WHERE user_id = _user_id
    ) ur
    JOIN public.roles r ON r.key = ur.rk AND r.is_active
    JOIN public.role_permissions rp ON rp.role = ur.rk AND rp.permission_key = _perm
    JOIN public.permissions p ON p.key = rp.permission_key
    JOIN public.app_modules m ON m.key = p.module_key AND m.is_enabled)
$$;