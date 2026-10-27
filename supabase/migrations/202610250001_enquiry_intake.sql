-- Applied atomically by the guarded local migration runner, with safe logging
-- already effective. This file contains no passwords or business fixtures.
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'stratadrive_enquiry_owner') THEN
    CREATE ROLE stratadrive_enquiry_owner NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'stratadrive_enquiry_app') THEN
    CREATE ROLE stratadrive_enquiry_app LOGIN;
  END IF;
END
$roles$;
ALTER ROLE stratadrive_enquiry_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
ALTER ROLE stratadrive_enquiry_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
DO $memberships$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE member = 'stratadrive_enquiry_app'::regrole) THEN
    RAISE EXCEPTION 'Unexpected application role membership';
  END IF;
END
$memberships$;
REVOKE ALL ON DATABASE postgres FROM stratadrive_enquiry_app;
REVOKE TEMPORARY ON DATABASE postgres FROM PUBLIC;
GRANT TEMPORARY ON DATABASE postgres TO postgres, supabase_admin;
GRANT CONNECT ON DATABASE postgres TO stratadrive_enquiry_app;
REVOKE CREATE ON SCHEMA public FROM stratadrive_enquiry_app;

CREATE SCHEMA enquiry_private AUTHORIZATION stratadrive_enquiry_owner;
REVOKE ALL ON SCHEMA enquiry_private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA enquiry_private TO stratadrive_enquiry_app, postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE stratadrive_enquiry_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE stratadrive_enquiry_owner IN SCHEMA enquiry_private REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role, stratadrive_enquiry_app;

CREATE TABLE enquiry_private.environment (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  target text NOT NULL CHECK (target IN ('development', 'test'))
);
CREATE TABLE enquiry_private.enquiries (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  idempotency_key uuid NOT NULL UNIQUE,
  name text NOT NULL CHECK (pg_catalog.char_length(name) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (pg_catalog.char_length(email) BETWEEN 3 AND 254),
  message text CHECK (message IS NULL OR pg_catalog.char_length(message) BETWEEN 1 AND 2000),
  received_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
CREATE TABLE enquiry_private.intake_quota (
  bucket bigint PRIMARY KEY,
  count integer NOT NULL CHECK (count BETWEEN 0 AND 20)
);
ALTER TABLE enquiry_private.environment OWNER TO stratadrive_enquiry_owner;
ALTER TABLE enquiry_private.enquiries OWNER TO stratadrive_enquiry_owner;
ALTER TABLE enquiry_private.intake_quota OWNER TO stratadrive_enquiry_owner;

ALTER TABLE enquiry_private.environment ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiry_private.environment FORCE ROW LEVEL SECURITY;
ALTER TABLE enquiry_private.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiry_private.enquiries FORCE ROW LEVEL SECURITY;
ALTER TABLE enquiry_private.intake_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiry_private.intake_quota FORCE ROW LEVEL SECURITY;
CREATE POLICY owner_access ON enquiry_private.environment TO stratadrive_enquiry_owner USING (true) WITH CHECK (true);
CREATE POLICY owner_access ON enquiry_private.enquiries TO stratadrive_enquiry_owner USING (true) WITH CHECK (true);
CREATE POLICY owner_access ON enquiry_private.intake_quota TO stratadrive_enquiry_owner USING (true) WITH CHECK (true);
CREATE POLICY studio_read ON enquiry_private.environment FOR SELECT TO postgres USING (true);
CREATE POLICY studio_read ON enquiry_private.enquiries FOR SELECT TO postgres USING (true);
CREATE POLICY studio_read ON enquiry_private.intake_quota FOR SELECT TO postgres USING (true);
REVOKE ALL ON ALL TABLES IN SCHEMA enquiry_private FROM PUBLIC, anon, authenticated, service_role, stratadrive_enquiry_app;
GRANT SELECT ON ALL TABLES IN SCHEMA enquiry_private TO postgres;

CREATE FUNCTION enquiry_private.submit_enquiry(p_key uuid, p_name text, p_email text, p_message text, p_environment text)
RETURNS TABLE(outcome text, enquiry_id uuid, received_at timestamptz, retry_after integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, enquiry_private, pg_temp
AS $intake$
DECLARE
  v_trim text := U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';
  v_name text;
  v_email text;
  v_message text;
  v_existing enquiry_private.enquiries%ROWTYPE;
  v_count integer;
  v_bucket bigint;
  v_now timestamptz;
  v_id uuid;
  v_at integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM enquiry_private.environment AS env WHERE env.singleton AND env.target = p_environment) THEN
    RETURN QUERY SELECT 'unavailable'::text, NULL::uuid, NULL::timestamptz, NULL::integer;
    RETURN;
  END IF;
  IF p_key IS NULL OR pg_catalog.substr(p_key::text, 15, 1) <> '4' OR pg_catalog.substr(p_key::text, 20, 1) NOT IN ('8', '9', 'a', 'b')
    OR p_name IS NULL OR pg_catalog.char_length(p_name) NOT BETWEEN 1 AND 100 OR p_name ~ '[[:cntrl:]]'
    OR p_email IS NULL OR pg_catalog.char_length(p_email) > 254 OR p_email ~ '[^ -~]'
    OR (p_message IS NOT NULL AND pg_catalog.char_length(p_message) > 2000) THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::uuid, NULL::timestamptz, NULL::integer;
    RETURN;
  END IF;
  v_name := normalize(pg_catalog.btrim(p_name, v_trim), NFC);
  v_email := pg_catalog.btrim(p_email, v_trim);
  v_at := pg_catalog.strpos(v_email, '@');
  v_email := pg_catalog.left(v_email, v_at) || pg_catalog.lower(pg_catalog.substr(v_email, v_at + 1));
  v_message := NULLIF(normalize(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(COALESCE(p_message, ''), E'\r\n', E'\n'), E'\r', E'\n'), v_trim), NFC), '');
  IF pg_catalog.char_length(v_name) NOT BETWEEN 1 AND 100
    OR pg_catalog.char_length(v_email) > 254
    OR v_email !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*$'
    OR (v_message IS NOT NULL AND (pg_catalog.char_length(v_message) > 2000 OR pg_catalog.translate(v_message, E'\t\n', '') ~ '[[:cntrl:]]')) THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::uuid, NULL::timestamptz, NULL::integer;
    RETURN;
  END IF;

  -- The shared transaction lock covers replay lookup, quota admission and insert.
  PERFORM pg_catalog.pg_advisory_xact_lock(1937006964, 1);
  SELECT e.* INTO v_existing FROM enquiry_private.enquiries AS e WHERE e.idempotency_key = p_key;
  IF FOUND THEN
    IF v_existing.name = v_name AND v_existing.email = v_email AND v_existing.message IS NOT DISTINCT FROM v_message THEN
      RETURN QUERY SELECT 'replayed'::text, v_existing.id, v_existing.received_at, NULL::integer;
    ELSE
      RETURN QUERY SELECT 'conflict'::text, NULL::uuid, NULL::timestamptz, NULL::integer;
    END IF;
    RETURN;
  END IF;
  v_now := pg_catalog.clock_timestamp();
  v_bucket := pg_catalog.floor(EXTRACT(EPOCH FROM v_now) / 600)::bigint;
  SELECT q.count INTO v_count FROM enquiry_private.intake_quota AS q WHERE q.bucket = v_bucket;
  IF COALESCE(v_count, 0) >= 20 THEN
    RETURN QUERY SELECT 'throttled'::text, NULL::uuid, NULL::timestamptz,
      LEAST(600, GREATEST(1, pg_catalog.ceil((v_bucket + 1) * 600 - EXTRACT(EPOCH FROM v_now))))::integer;
    RETURN;
  END IF;
  INSERT INTO enquiry_private.intake_quota AS q (bucket, count) VALUES (v_bucket, 1)
    ON CONFLICT (bucket) DO UPDATE SET count = q.count + 1;
  v_id := pg_catalog.gen_random_uuid();
  INSERT INTO enquiry_private.enquiries (id, idempotency_key, name, email, message, received_at)
    VALUES (v_id, p_key, v_name, v_email, v_message, v_now);
  RETURN QUERY SELECT 'created'::text, v_id, v_now, NULL::integer;
END
$intake$;
ALTER FUNCTION enquiry_private.submit_enquiry(uuid, text, text, text, text) OWNER TO stratadrive_enquiry_owner;
REVOKE ALL ON FUNCTION enquiry_private.submit_enquiry(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION enquiry_private.submit_enquiry(uuid, text, text, text, text) TO stratadrive_enquiry_app;
