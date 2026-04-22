-- ============================================================
-- blockd — cooling-off execution
-- ============================================================
-- Every minute, pg_cron runs execute_approved_unlocks(), which:
--   • finds unlock_requests with status='approved' whose cooling-off has elapsed
--   • applies the requested change (remove domain OR shorten lock_until)
--   • marks the request 'executed'
-- The change to blocklist.status='removed' fires notify_sync_nextdns(),
-- which propagates the removal to the NextDNS denylist.
--
-- This function runs as SECURITY DEFINER so it bypasses the RLS policies
-- that prevent end users from making these state transitions directly.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION execute_approved_unlocks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req           RECORD;
  cooling_hours INT;
BEGIN
  SELECT cooling_off_hours INTO cooling_hours FROM lock_state WHERE id = 1;

  FOR req IN
    SELECT *
    FROM unlock_requests
    WHERE status = 'approved'
      AND approved_at + (cooling_hours * INTERVAL '1 hour') <= now()
  LOOP
    -- Domain removal
    IF req.target_blocklist_id IS NOT NULL THEN
      UPDATE blocklist
      SET status = 'removed'
      WHERE id = req.target_blocklist_id;
    -- Lock duration shortening
    ELSIF req.target_lock_change IS NOT NULL THEN
      UPDATE lock_state
      SET locked_until = (req.target_lock_change->>'new_locked_until')::TIMESTAMPTZ
      WHERE id = 1;
    END IF;

    UPDATE unlock_requests
    SET status = 'executed',
        executed_at = now()
    WHERE id = req.id;
  END LOOP;
END;
$$;

-- Schedule every minute. cron.schedule is idempotent on the job name.
SELECT cron.schedule(
  'execute-approved-unlocks',
  '* * * * *',
  $$SELECT execute_approved_unlocks()$$
);
