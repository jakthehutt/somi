-- ============================================================
-- blockd — sync-nextdns trigger
-- ============================================================
-- Fires after any INSERT or UPDATE on blocklist.
-- Calls the sync-nextdns edge function via pg_net HTTP POST.
-- The function adds or removes the domain from NextDNS based on status.
-- ============================================================

-- pg_net must be enabled (included in initial migration)
-- The function URL must be set via the SYNC_FUNCTION_URL app setting,
-- or we use the standard Supabase function URL pattern below.

CREATE OR REPLACE FUNCTION notify_sync_nextdns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  function_url  TEXT;
  service_key   TEXT;
  payload       JSONB;
BEGIN
  -- Only sync on status changes (or new inserts)
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  function_url := current_setting('app.sync_function_url', true);
  service_key  := current_setting('app.service_role_key', true);

  IF function_url IS NULL OR function_url = '' THEN
    RAISE WARNING '[sync-nextdns trigger] app.sync_function_url not set — skipping sync';
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'domain', NEW.domain,
    'status', NEW.status
  );

  PERFORM net.http_post(
    url     := function_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_key, '')
    ),
    body    := payload
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blocklist_sync_nextdns ON blocklist;
CREATE TRIGGER blocklist_sync_nextdns
  AFTER INSERT OR UPDATE OF status ON blocklist
  FOR EACH ROW
  EXECUTE FUNCTION notify_sync_nextdns();
