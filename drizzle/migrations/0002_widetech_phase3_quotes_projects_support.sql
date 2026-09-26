CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  amount_usd numeric(12,2) NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','accepted','declined')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "q staff all" ON public.quotations FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "q own read" ON public.quotations FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "q own respond" ON public.quotations FOR UPDATE TO authenticated USING (customer_id = auth.uid() AND status = 'sent') WITH CHECK (customer_id = auth.uid() AND status IN ('accepted','declined'));

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid UNIQUE REFERENCES public.quotations(id) ON DELETE SET NULL,
  request_id uuid REFERENCES public.service_requests(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','completed')),
  progress int NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p staff all" ON public.projects FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "p own read" ON public.projects FOR SELECT TO authenticated USING (customer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.on_quote_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.service_requests SET status = 'quoted', updated_at = now() WHERE id = NEW.request_id AND status IN ('pending','reviewing');
  ELSIF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    INSERT INTO public.projects (quotation_id, request_id, customer_id, title)
      SELECT NEW.id, r.id, NEW.customer_id, r.title FROM public.service_requests r WHERE r.id = NEW.request_id
      ON CONFLICT (quotation_id) DO NOTHING;
    UPDATE public.service_requests SET status = 'in_progress', updated_at = now() WHERE id = NEW.request_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER quote_change AFTER INSERT OR UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.on_quote_change();

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL DEFAULT auth.uid(),
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "t staff all" ON public.support_tickets FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "t own read" ON public.support_tickets FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "t own insert" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());

CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid(),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "m read" ON public.ticket_messages FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.customer_id = auth.uid()));
CREATE POLICY "m insert" ON public.ticket_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.customer_id = auth.uid())));

ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;