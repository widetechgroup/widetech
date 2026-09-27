CREATE OR REPLACE FUNCTION public.write_audit_log()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE rec jsonb; o jsonb; n jsonb; prev jsonb := '{}'; nxt jsonb := '{}'; k text;
BEGIN
  rec := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  IF TG_OP = 'UPDATE' THEN
    o := to_jsonb(OLD); n := to_jsonb(NEW);
    FOR k IN SELECT jsonb_object_keys(n) LOOP
      IF k NOT IN ('updated_at','password','token') AND (o->k) IS DISTINCT FROM (n->k) THEN
        prev := prev || jsonb_build_object(k, o->k);
        nxt := nxt || jsonb_build_object(k, n->k);
      END IF;
    END LOOP;
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, details)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, COALESCE(rec->>'id', rec->>'key'),
    jsonb_strip_nulls(jsonb_build_object('status', rec->>'status', 'old_status', CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD)->>'status' END,
      'role', COALESCE(rec->>'role', rec->>'role_key'), 'user_id', rec->>'user_id',
      'previous', CASE WHEN TG_OP='UPDATE' THEN prev END, 'new', CASE WHEN TG_OP='UPDATE' THEN nxt END)));
  RETURN NULL;
END $function$;

CREATE OR REPLACE FUNCTION public.admin_list_sessions()
RETURNS TABLE(id uuid, user_id uuid, created_at timestamptz, updated_at timestamptz, refreshed_at timestamp, user_agent text, ip text, not_after timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT s.id, s.user_id, s.created_at, s.updated_at, s.refreshed_at, s.user_agent, host(s.ip)::text, s.not_after
    FROM auth.sessions s ORDER BY COALESCE(s.refreshed_at::timestamptz, s.updated_at, s.created_at) DESC LIMIT 500;
END $$;

CREATE OR REPLACE FUNCTION public.admin_revoke_sessions(_user_id uuid DEFAULT NULL, _session_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _user_id IS NULL AND _session_id IS NULL THEN RAISE EXCEPTION 'Choose a user or session'; END IF;
  DELETE FROM auth.sessions WHERE (_session_id IS NOT NULL AND id = _session_id) OR (_session_id IS NULL AND user_id = _user_id);
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, details)
  VALUES (auth.uid(), 'revoke_sessions', 'auth_sessions', COALESCE(_session_id, _user_id)::text, jsonb_build_object('user_id', _user_id, 'count', n));
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.admin_list_sessions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_revoke_sessions(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_sessions(uuid, uuid) TO authenticated;