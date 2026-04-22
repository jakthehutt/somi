-- ============================================================
-- blockd — updated sync trigger function
-- ============================================================
-- Replaces notify_sync_nextdns() to use hardcoded values
-- (ALTER DATABASE is not permitted for the migration role).
--
-- The anon key is the Supabase public JWT — already exposed in
-- the Vite client bundle. The edge function validates it via
-- Supabase's built-in JWT verification (no --no-verify-jwt).
-- ============================================================

CREATE OR REPLACE FUNCTION notify_sync_nextdns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  payload JSONB;
BEGIN
  -- Skip if status did not change
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object('domain', NEW.domain, 'status', NEW.status);

  PERFORM net.http_post(
    url     := 'https://ctcpjumkyxcgskmqrrpv.supabase.co/functions/v1/sync-nextdns',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0Y3BqdW1reXhjZ3NrbXFycnB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODI3MjEsImV4cCI6MjA5MjQ1ODcyMX0.srNA-OLuCT_FRt6Kr9uyUTzR8ry0WfYjb-Rk1X0ueGU'
    ),
    body    := payload
  );

  RETURN NEW;
END;
$$;
