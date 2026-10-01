INSERT INTO public.app_modules (key, name, description, is_enabled, display_order, depends_on)
VALUES ('cyber', 'Cyber security', 'Cyber security services, categories and packages', true, 50, '{}')
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.permissions (key, module_key, action, description, is_sensitive) VALUES
 ('cyber.view','cyber','view','View cyber security catalogue admin',false),
 ('cyber.create','cyber','create','Create cyber services, categories and packages',false),
 ('cyber.edit','cyber','edit','Edit cyber services, categories and packages',false),
 ('cyber.delete','cyber','delete','Delete cyber services, categories and packages',true)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE public.cyber_service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cyber_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.cyber_service_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text NOT NULL DEFAULT '',
  full_description text NOT NULL DEFAULT '',
  image_url text,
  icon text NOT NULL DEFAULT 'shield',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('active','inactive','draft')),
  pricing_model text NOT NULL DEFAULT 'custom_quote' CHECK (pricing_model IN ('fixed','starting_from','hourly','daily','monthly','custom_quote')),
  price numeric,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('TZS','USD','EUR','GBP')),
  estimated_duration text,
  delivery_method text NOT NULL DEFAULT 'hybrid' CHECK (delivery_method IN ('remote','onsite','hybrid')),
  is_featured boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  show_price boolean NOT NULL DEFAULT true,
  seo_title text, meta_description text,
  features jsonb NOT NULL DEFAULT '[]',
  deliverables jsonb NOT NULL DEFAULT '[]',
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cyber_service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  includes jsonb NOT NULL DEFAULT '[]',
  price numeric,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('TZS','USD','EUR','GBP')),
  pricing_model text NOT NULL DEFAULT 'custom_quote' CHECK (pricing_model IN ('fixed','starting_from','hourly','daily','monthly','custom_quote')),
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cyber_service_categories, public.cyber_services, public.cyber_service_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cyber_service_categories, public.cyber_services, public.cyber_service_packages TO authenticated;
GRANT ALL ON public.cyber_service_categories, public.cyber_services, public.cyber_service_packages TO service_role;

ALTER TABLE public.cyber_service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cyber_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cyber_service_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active categories" ON public.cyber_service_categories FOR SELECT TO anon, authenticated USING (is_active OR public.has_permission(auth.uid(),'cyber.view'));
CREATE POLICY "Cyber staff insert categories" ON public.cyber_service_categories FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'cyber.create'));
CREATE POLICY "Cyber staff update categories" ON public.cyber_service_categories FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "Cyber staff delete categories" ON public.cyber_service_categories FOR DELETE TO authenticated USING (public.has_permission(auth.uid(),'cyber.delete'));

CREATE POLICY "Public reads live services" ON public.cyber_services FOR SELECT TO anon, authenticated USING ((status = 'active' AND is_public) OR public.has_permission(auth.uid(),'cyber.view'));
CREATE POLICY "Cyber staff insert services" ON public.cyber_services FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'cyber.create'));
CREATE POLICY "Cyber staff update services" ON public.cyber_services FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "Cyber staff delete services" ON public.cyber_services FOR DELETE TO authenticated USING (public.has_permission(auth.uid(),'cyber.delete'));

CREATE POLICY "Public reads active packages" ON public.cyber_service_packages FOR SELECT TO anon, authenticated USING (is_active OR public.has_permission(auth.uid(),'cyber.view'));
CREATE POLICY "Cyber staff insert packages" ON public.cyber_service_packages FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'cyber.create'));
CREATE POLICY "Cyber staff update packages" ON public.cyber_service_packages FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'cyber.edit'));
CREATE POLICY "Cyber staff delete packages" ON public.cyber_service_packages FOR DELETE TO authenticated USING (public.has_permission(auth.uid(),'cyber.delete'));

CREATE OR REPLACE FUNCTION public.cyber_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.created_by := COALESCE(NEW.created_by, auth.uid()); END IF;
  NEW.updated_by := auth.uid(); NEW.updated_at := now(); RETURN NEW;
END $$;
CREATE TRIGGER cyber_touch BEFORE INSERT OR UPDATE ON public.cyber_service_categories FOR EACH ROW EXECUTE FUNCTION public.cyber_touch();
CREATE TRIGGER cyber_touch BEFORE INSERT OR UPDATE ON public.cyber_services FOR EACH ROW EXECUTE FUNCTION public.cyber_touch();
CREATE TRIGGER cyber_touch BEFORE INSERT OR UPDATE ON public.cyber_service_packages FOR EACH ROW EXECUTE FUNCTION public.cyber_touch();
CREATE TRIGGER audit_cyber_categories AFTER INSERT OR UPDATE OR DELETE ON public.cyber_service_categories FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_cyber_services AFTER INSERT OR UPDATE OR DELETE ON public.cyber_services FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_cyber_packages AFTER INSERT OR UPDATE OR DELETE ON public.cyber_service_packages FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

INSERT INTO public.cyber_service_categories (name, slug, display_order) VALUES
 ('Cybersecurity Assessment','cybersecurity-assessment',1),('Vulnerability Assessment','vulnerability-assessment',2),
 ('Penetration Testing','penetration-testing',3),('Web Application Security Testing','web-application-security-testing',4),
 ('Mobile Application Security Testing','mobile-application-security-testing',5),('Network Security Assessment','network-security-assessment',6),
 ('Cloud Security Assessment','cloud-security-assessment',7),('Security Audit','security-audit',8),
 ('Security Awareness Training','security-awareness-training',9),('Incident Response','incident-response',10),
 ('Malware Investigation','malware-investigation',11),('Digital Forensics','digital-forensics',12),
 ('Data Protection & Privacy Consulting','data-protection-privacy-consulting',13),('Firewall & Endpoint Security','firewall-endpoint-security',14),
 ('Security Monitoring','security-monitoring',15),('Security Policy Development','security-policy-development',16),
 ('Risk Assessment','risk-assessment',17),('Compliance Assessment','compliance-assessment',18),
 ('Cybersecurity Consultation','cybersecurity-consultation',19),('Other','other',20);

INSERT INTO public.cyber_service_packages (name, slug, includes, display_order) VALUES
 ('Cyber Security Basic','basic','["Basic Security Consultation","Website Security Review","Security Recommendations"]',1),
 ('Cyber Security Business','business','["Vulnerability Assessment","Security Configuration Review","Risk Assessment","Security Report","Consultation"]',2),
 ('Cyber Security Enterprise','enterprise','["Security Assessment","Vulnerability Assessment","Penetration Testing","Risk Assessment","Security Awareness Training","Detailed Security Report","Remediation Consultation"]',3);