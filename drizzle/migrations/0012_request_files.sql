CREATE OR REPLACE FUNCTION public.can_access_request(_req uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.service_requests r
    WHERE r.id = _req AND (r.customer_id = auth.uid() OR r.assigned_technician_id = auth.uid() OR public.is_staff(auth.uid())))
$$;

CREATE TABLE public.request_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid(),
  path text NOT NULL UNIQUE,
  name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.request_files TO authenticated;
GRANT ALL ON public.request_files TO service_role;
ALTER TABLE public.request_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rf read" ON public.request_files FOR SELECT TO authenticated USING (public.can_access_request(request_id));
CREATE POLICY "rf insert" ON public.request_files FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.can_access_request(request_id));
CREATE POLICY "rf delete own" ON public.request_files FOR DELETE TO authenticated USING (sender_id = auth.uid());
CREATE INDEX request_files_req_idx ON public.request_files (request_id, created_at);

CREATE POLICY "request files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'request-files' AND public.can_access_request((split_part(name, '/', 1))::uuid));
CREATE POLICY "request files upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'request-files' AND public.can_access_request((split_part(name, '/', 1))::uuid));
CREATE POLICY "request files delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'request-files' AND owner = auth.uid());

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.request_files; EXCEPTION WHEN others THEN NULL; END;
END $$;