-- Roles
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','operator','technician','customer');
CREATE TYPE public.request_status AS ENUM ('pending','reviewing','quoted','in_progress','completed','cancelled');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  city TEXT DEFAULT 'Dar es Salaam',
  country TEXT DEFAULT 'Tanzania',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- First user becomes super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INTEGER;
  assigned_role public.app_role;
BEGIN
  SELECT count(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN assigned_role := 'super_admin'; ELSE assigned_role := 'customer'; END IF;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', 'WideTech User'));

  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, assigned_role);
  RETURN new;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();

-- Services
CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INT DEFAULT 0
);
GRANT SELECT ON public.service_categories TO anon, authenticated;
GRANT ALL ON public.service_categories TO service_role;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.service_categories FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL,
  full_description TEXT NOT NULL,
  starting_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  price_tzs NUMERIC,
  billing_type TEXT NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services public read" ON public.services FOR SELECT TO anon, authenticated USING (is_active);

-- Requests
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT 'WT-' || to_char(now(),'YYMM') || '-' || upper(substr(md5(random()::text||clock_timestamp()::text),1,6))
$$;

CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code TEXT NOT NULL UNIQUE DEFAULT public.generate_tracking_code(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'medium',
  status public.request_status NOT NULL DEFAULT 'pending',
  assigned_technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  estimated_budget NUMERIC,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own requests read" ON public.service_requests FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = assigned_technician_id
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "own requests insert" ON public.service_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "staff requests update" ON public.service_requests FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = assigned_technician_id
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'operator'));

CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.consultations TO authenticated;
GRANT ALL ON public.consultations TO service_role;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own consultations read" ON public.consultations FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "own consultations insert" ON public.consultations FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "staff consultations update" ON public.consultations FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'operator'));

-- Seed official services
INSERT INTO public.service_categories (name, slug, description, display_order) VALUES
('Build','build','Software, web and systems engineering',1),
('Protect','protect','Cyber security, data safety and backup',2),
('Operate','operate','Maintenance, installations and advisory',3);

INSERT INTO public.services (category_id, title, slug, short_description, full_description, starting_price, price_tzs, billing_type, features, display_order) VALUES
((SELECT id FROM public.service_categories WHERE slug='build'),'Software Solutions & Management Systems','software-solutions','Custom ERP, POS, inventory and CRM systems.','We design and build management systems tailored to Tanzanian businesses: ERP, point of sale, inventory control and CRM platforms delivered in milestones.',1500,3900000,'Project / Milestones','["Custom ERP","POS & inventory","CRM platforms","Milestone delivery"]',1),
((SELECT id FROM public.service_categories WHERE slug='protect'),'Cyber Solutions','cyber-solutions','Penetration tests, endpoint hardening, firewalls.','Full-spectrum security: penetration testing, endpoint hardening, network firewall design and continuous monitoring retainers.',800,2080000,'Audit / Monthly','["Penetration testing","Endpoint hardening","Firewall design","Incident response"]',2),
((SELECT id FROM public.service_categories WHERE slug='build'),'Web Development','web-development','High-speed corporate portals and e-commerce.','Corporate portals, e-commerce stores and web applications engineered for speed, SEO and mobile-first East African audiences.',600,1560000,'One-off / Retainer','["Corporate portals","E-commerce","Web apps","SEO ready"]',3),
((SELECT id FROM public.service_categories WHERE slug='operate'),'Computer Maintenance','computer-maintenance','Scheduled servicing, diagnostics, OS cleanup.','Monthly SLA covering scheduled hardware servicing, diagnostics, OS cleanup and priority on-site response.',50,130000,'Monthly SLA','["Scheduled servicing","Hardware diagnostics","OS cleanup","Priority response"]',4),
((SELECT id FROM public.service_categories WHERE slug='build'),'Digital Marketing','digital-marketing','Social campaigns, Google Ads, SEO, content.','Monthly retainer growth programmes: social campaigns, Google Ads management, SEO and content production.',300,780000,'Monthly Retainer','["Social campaigns","Google Ads","SEO","Content growth"]',5),
((SELECT id FROM public.service_categories WHERE slug='operate'),'CCTV Installation','cctv-installation','IP cameras, NVR setups, remote monitoring.','Site survey, IP camera deployment, NVR configuration and remote mobile monitoring for homes, shops and industrial sites.',400,1040000,'Per Site / Cameras','["Site survey","IP cameras","NVR setup","Remote monitoring"]',6),
((SELECT id FROM public.service_categories WHERE slug='operate'),'Technology Consultation','technology-consultation','IT roadmapping and digital transformation.','Hourly advisory sessions on IT roadmapping, digital transformation and cloud strategy for growing organisations.',150,390000,'Hourly Session','["IT roadmapping","Digital transformation","Cloud advisory","Vendor selection"]',7),
((SELECT id FROM public.service_categories WHERE slug='protect'),'Data Safety & Backup','data-safety-backup','Encrypted backups and disaster recovery.','Automated encrypted backups, offsite replication and regular disaster recovery drills so your data survives anything.',200,520000,'Monthly / Cloud','["Automated backups","Encryption","Offsite replication","DR drills"]',8);