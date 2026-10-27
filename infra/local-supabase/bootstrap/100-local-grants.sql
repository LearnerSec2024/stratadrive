-- Development bootstrap only: create no application schema, tables or records.
-- New public objects require deliberate grants in a later approved migration.
REVOKE ALL ON SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
-- The built-in PUBLIC EXECUTE default is global. A schema-local REVOKE alone
-- cannot remove it, so remove the global default for the migration owner too.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- The official webhook bootstrap is required to create a role consumed by
-- upstream roles.sql. Keep its unused HTTP functions away from public roles.
REVOKE ALL ON SCHEMA net, supabase_functions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA supabase_functions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA supabase_functions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA net, supabase_functions FROM PUBLIC, anon, authenticated;
