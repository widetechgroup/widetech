CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin','operator'))
$$;

CREATE POLICY "staff read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "super admin add roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "super admin remove roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') AND user_id <> auth.uid());
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;