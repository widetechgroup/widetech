CREATE SEQUENCE IF NOT EXISTS public.cyber_finding_seq;
CREATE SEQUENCE IF NOT EXISTS public.cyber_risk_seq;

CREATE TABLE public.cyber_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.cyber_projects(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  name text NOT NULL,
  assessment_type text NOT NULL DEFAULT 'vulnerability',
  scope text, methodology text,
  start_date date, end_date date,
  analyst_id uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','reviewed')),
  executive_summary text, recommendations text,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cyber_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_code text NOT NULL UNIQUE DEFAULT ('FND-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.cyber_finding_seq')::text,5,'0')),
  assessment_id uuid REFERENCES public.cyber_assessments(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  asset_id uuid REFERENCES public.cyber_assets(id) ON DELETE SET NULL,
  title text NOT NULL, description text,
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('informational','low','medium','high','critical')),
  business_impact text, technical_impact text, evidence_ref text, remediation text,
  responsible text, due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','in_progress','resolved','retest_required','closed')),
  resolution_notes text,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cyber_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_code text NOT NULL UNIQUE DEFAULT ('RSK-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.cyber_risk_seq')::text,5,'0')),
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  project_id uuid REFERENCES public.cyber_projects(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES public.cyber_assets(id) ON DELETE SET NULL,
  title text NOT NULL, threat text, vulnerability text,
  likelihood int NOT NULL DEFAULT 3 CHECK (likelihood BETWEEN 1 AND 5),
  impact int NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  risk_level text GENERATED ALWAYS AS (CASE WHEN likelihood*impact >= 20 THEN 'critical' WHEN likelihood*impact >= 12 THEN 'high' WHEN likelihood*impact >= 6 THEN 'medium' ELSE 'low' END) STORED,
  owner text, mitigation text,
  treatment text NOT NULL DEFAULT 'mitigate' CHECK (treatment IN ('mitigate','accept','transfer','avoid')),
  target_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','closed')),
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cyber_assessments, public.cyber_findings, public.cyber_risks TO authenticated;
GRANT ALL ON public.cyber_assessments, public.cyber_findings, public.cyber_risks TO service_role;
GRANT USAGE ON SEQUENCE public.cyber_finding_seq, public.cyber_risk_seq TO authenticated, service_role;

ALTER TABLE public.cyber_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cyber_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cyber_risks ENABLE ROW LEVEL SECURITY;

-- Staff: cyber permissions; analysts see their own assessments; customers see reviewed assessments and their findings
CREATE POLICY "cyber assess read" ON public.cyber_assessments FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'cyber.view') OR analyst_id = auth.uid() OR (customer_id = auth.uid() AND status = 'reviewed'));
CREATE POLICY "cyber assess insert" ON public.cyber_assessments FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "cyber assess update" ON public.cyber_assessments FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'cyber.edit') OR analyst_id = auth.uid()) WITH CHECK (public.has_permission(auth.uid(),'cyber.edit') OR analyst_id = auth.uid());
CREATE POLICY "cyber assess delete" ON public.cyber_assessments FOR DELETE TO authenticated USING (public.has_permission(auth.uid(),'cyber.delete'));

CREATE POLICY "cyber finding read" ON public.cyber_findings FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'cyber.view') OR customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.cyber_assessments a WHERE a.id = assessment_id AND a.analyst_id = auth.uid()));
CREATE POLICY "cyber finding insert" ON public.cyber_findings FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(),'cyber.edit') OR EXISTS (SELECT 1 FROM public.cyber_assessments a WHERE a.id = assessment_id AND a.analyst_id = auth.uid()));
CREATE POLICY "cyber finding update" ON public.cyber_findings FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'cyber.edit') OR EXISTS (SELECT 1 FROM public.cyber_assessments a WHERE a.id = assessment_id AND a.analyst_id = auth.uid()))
  WITH CHECK (public.has_permission(auth.uid(),'cyber.edit') OR EXISTS (SELECT 1 FROM public.cyber_assessments a WHERE a.id = assessment_id AND a.analyst_id = auth.uid()));
CREATE POLICY "cyber finding delete" ON public.cyber_findings FOR DELETE TO authenticated USING (public.has_permission(auth.uid(),'cyber.delete'));

CREATE POLICY "cyber risk read" ON public.cyber_risks FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'cyber.view'));
CREATE POLICY "cyber risk insert" ON public.cyber_risks FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "cyber risk update" ON public.cyber_risks FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'cyber.edit')) WITH CHECK (public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "cyber risk delete" ON public.cyber_risks FOR DELETE TO authenticated USING (public.has_permission(auth.uid(),'cyber.delete'));

CREATE TRIGGER cyber_assess_touch BEFORE INSERT OR UPDATE ON public.cyber_assessments FOR EACH ROW EXECUTE FUNCTION public.cyber_touch();
CREATE TRIGGER cyber_finding_touch BEFORE INSERT OR UPDATE ON public.cyber_findings FOR EACH ROW EXECUTE FUNCTION public.cyber_touch();
CREATE TRIGGER cyber_risk_touch BEFORE INSERT OR UPDATE ON public.cyber_risks FOR EACH ROW EXECUTE FUNCTION public.cyber_touch();
CREATE TRIGGER cyber_assess_audit AFTER INSERT OR UPDATE OR DELETE ON public.cyber_assessments FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER cyber_finding_audit AFTER INSERT OR UPDATE OR DELETE ON public.cyber_findings FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER cyber_risk_audit AFTER INSERT OR UPDATE OR DELETE ON public.cyber_risks FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();