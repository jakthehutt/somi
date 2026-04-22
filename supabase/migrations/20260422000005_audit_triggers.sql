-- ============================================================
-- blockd — audit log triggers
-- ============================================================
-- Every INSERT/UPDATE/DELETE on blocklist, lock_state,
-- and unlock_requests appends a row to audit_log with:
--   actor   = auth.uid() (NULL if system/cron action)
--   action  = table name + operation (e.g. 'blocklist:insert')
--   payload = before/after snapshots as JSONB
-- Runs as SECURITY DEFINER so it can write to audit_log
-- regardless of the triggering user's RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION audit_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object('after', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object('before', to_jsonb(OLD));
  END IF;

  INSERT INTO audit_log (actor, action, payload)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME || ':' || lower(TG_OP),
    payload
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to every mutating table
DROP TRIGGER IF EXISTS audit_blocklist         ON blocklist;
DROP TRIGGER IF EXISTS audit_lock_state        ON lock_state;
DROP TRIGGER IF EXISTS audit_unlock_requests   ON unlock_requests;

CREATE TRIGGER audit_blocklist
  AFTER INSERT OR UPDATE OR DELETE ON blocklist
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();

CREATE TRIGGER audit_lock_state
  AFTER INSERT OR UPDATE OR DELETE ON lock_state
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();

CREATE TRIGGER audit_unlock_requests
  AFTER INSERT OR UPDATE OR DELETE ON unlock_requests
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
