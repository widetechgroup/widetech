GRANT SELECT, INSERT, UPDATE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
CREATE POLICY "services staff read all" ON public.services FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "services admin insert" ON public.services FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "services admin update" ON public.services FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS audit_services ON public.services;
CREATE TRIGGER audit_services AFTER INSERT OR UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();