-- ============================================================
-- blockd — RLS policy tests
-- ============================================================
-- Reference SQL test. Run with direct psql access:
--
--   psql "$DATABASE_URL" -f supabase/tests/rls.sql
--
-- where DATABASE_URL is the Supabase session-mode connection string:
--   postgresql://postgres.<project-ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres
--
-- All assertions run inside a single transaction that is rolled back
-- at the end, leaving no test data in the database.
-- PASS/FAIL messages are emitted via RAISE NOTICE.
-- Any unhandled failure raises an exception and aborts the script.
-- ============================================================

BEGIN;

DO $$
DECLARE
  -- Fixed UUIDs for test users (not in auth.users; we insert directly into profiles)
  owner_id  UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  friend_id UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
  block_id  UUID;
  req_id    UUID;
  row_count INT;
BEGIN

  -- ---- seed test profiles (runs as postgres / superuser, bypasses RLS) ----
  INSERT INTO public.profiles (id, role, email)
  VALUES (owner_id, 'owner', 'rls-test-owner@blockd.internal'),
         (friend_id, 'friend', 'rls-test-friend@blockd.internal');

  -- ===========================================================
  -- 1. OWNER: can add an active domain
  -- ===========================================================
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', owner_id::text, 'role', 'authenticated')::text,
    true  -- local to transaction
  );
  SET LOCAL ROLE authenticated;

  INSERT INTO public.blocklist (domain, added_by, status)
  VALUES ('evil-distraction.com', owner_id, 'active')
  RETURNING id INTO block_id;

  RAISE NOTICE 'PASS 1: owner can insert active domain (id=%)', block_id;

  RESET ROLE;

  -- ===========================================================
  -- 2. OWNER: cannot set status = 'removed' directly
  -- ===========================================================
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', owner_id::text, 'role', 'authenticated')::text,
    true
  );
  SET LOCAL ROLE authenticated;

  BEGIN
    UPDATE public.blocklist SET status = 'removed' WHERE id = block_id;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    IF row_count > 0 THEN
      RAISE EXCEPTION 'FAIL 2: owner was able to set status=removed directly';
    END IF;
    RAISE NOTICE 'PASS 2: owner cannot set status=removed (0 rows updated by RLS)';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS 2: owner cannot set status=removed (RLS raised insufficient_privilege)';
  END;

  RESET ROLE;

  -- ===========================================================
  -- 3. OWNER: can mark domain as pending_removal
  -- ===========================================================
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', owner_id::text, 'role', 'authenticated')::text,
    true
  );
  SET LOCAL ROLE authenticated;

  UPDATE public.blocklist SET status = 'pending_removal' WHERE id = block_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL 3: owner could not set status=pending_removal (rows updated: %)', row_count;
  END IF;
  RAISE NOTICE 'PASS 3: owner can mark domain as pending_removal';

  -- Revert to active for subsequent tests
  UPDATE public.blocklist SET status = 'active' WHERE id = block_id;

  RESET ROLE;

  -- ===========================================================
  -- 4. FRIEND: cannot insert into blocklist
  -- ===========================================================
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', friend_id::text, 'role', 'authenticated')::text,
    true
  );
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO public.blocklist (domain, added_by, status)
    VALUES ('friend-blocked.com', friend_id, 'active');
    RAISE EXCEPTION 'FAIL 4: friend was able to insert into blocklist';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS 4: friend cannot insert into blocklist';
  END;

  RESET ROLE;

  -- ===========================================================
  -- 5. OWNER: can submit an unlock request (status=pending)
  -- ===========================================================
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', owner_id::text, 'role', 'authenticated')::text,
    true
  );
  SET LOCAL ROLE authenticated;

  INSERT INTO public.unlock_requests (target_blocklist_id, requested_by, status, reason)
  VALUES (block_id, owner_id, 'pending', 'Testing approval flow')
  RETURNING id INTO req_id;

  RAISE NOTICE 'PASS 5: owner can submit unlock request (id=%)', req_id;

  RESET ROLE;

  -- ===========================================================
  -- 6. OWNER: cannot submit unlock request with status=approved
  -- ===========================================================
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', owner_id::text, 'role', 'authenticated')::text,
    true
  );
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO public.unlock_requests (
      target_blocklist_id, requested_by, status,
      approved_at, friend_user_id
    )
    VALUES (block_id, owner_id, 'approved', now(), friend_id);
    RAISE EXCEPTION 'FAIL 6: owner was able to self-approve an unlock request';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS 6: owner cannot insert unlock request with status=approved';
  END;

  RESET ROLE;

  -- ===========================================================
  -- 7. FRIEND: cannot see owner's unlock requests (SELECT as friend sees all — this is expected)
  --    and can approve a pending request
  -- ===========================================================
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', friend_id::text, 'role', 'authenticated')::text,
    true
  );
  SET LOCAL ROLE authenticated;

  -- Friend should be able to read the pending request
  SELECT count(*) INTO row_count
  FROM public.unlock_requests
  WHERE id = req_id AND status = 'pending';

  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL 7a: friend cannot see pending unlock request';
  END IF;
  RAISE NOTICE 'PASS 7a: friend can read pending unlock requests';

  -- Friend approves
  UPDATE public.unlock_requests
  SET status = 'approved',
      approved_at = now(),
      friend_user_id = friend_id
  WHERE id = req_id;

  GET DIAGNOSTICS row_count = ROW_COUNT;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL 7b: friend could not approve the request (rows: %)', row_count;
  END IF;
  RAISE NOTICE 'PASS 7b: friend can approve a pending unlock request';

  RESET ROLE;

  -- ===========================================================
  -- 8. FRIEND: cannot approve a request twice (status is no longer pending)
  -- ===========================================================
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', friend_id::text, 'role', 'authenticated')::text,
    true
  );
  SET LOCAL ROLE authenticated;

  UPDATE public.unlock_requests
  SET status = 'approved', approved_at = now(), friend_user_id = friend_id
  WHERE id = req_id;

  GET DIAGNOSTICS row_count = ROW_COUNT;
  IF row_count > 0 THEN
    RAISE EXCEPTION 'FAIL 8: friend was able to update an already-approved request (double-approve)';
  END IF;
  RAISE NOTICE 'PASS 8: friend cannot re-approve an already-approved request (USING filters it out)';

  RESET ROLE;

  -- ===========================================================
  -- 9. REMOVAL before cooling-off: authenticated user cannot set status=removed
  --    (cooling-off is enforced by pg_cron using service role — only service role can write removed)
  -- ===========================================================
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', owner_id::text, 'role', 'authenticated')::text,
    true
  );
  SET LOCAL ROLE authenticated;

  BEGIN
    UPDATE public.blocklist SET status = 'removed' WHERE id = block_id;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    IF row_count > 0 THEN
      RAISE EXCEPTION 'FAIL 9: authenticated user set status=removed without being service role';
    END IF;
    RAISE NOTICE 'PASS 9: authenticated user cannot set status=removed (cooling-off enforced by pg_cron / service role)';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS 9: authenticated user cannot set status=removed (RLS error)';
  END;

  RESET ROLE;

  -- ===========================================================
  -- 10. REMOVAL after cooling-off: service role (postgres) CAN set status=removed
  --     (simulates pg_cron executing after the cooling-off period elapses)
  -- ===========================================================
  -- We are now back as postgres (superuser), which represents service-role / pg_cron
  UPDATE public.blocklist SET status = 'removed' WHERE id = block_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL 10: service role could not set status=removed';
  END IF;
  RAISE NOTICE 'PASS 10: service role (pg_cron) can set status=removed after cooling-off';

  -- ===========================================================
  -- 11. LOCK STATE: owner can extend locked_until
  -- ===========================================================
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', owner_id::text, 'role', 'authenticated')::text,
    true
  );
  SET LOCAL ROLE authenticated;

  UPDATE public.lock_state
  SET locked_until = now() + INTERVAL '7 days'
  WHERE id = 1;

  GET DIAGNOSTICS row_count = ROW_COUNT;
  IF row_count != 1 THEN
    RAISE EXCEPTION 'FAIL 11: owner could not extend locked_until';
  END IF;
  RAISE NOTICE 'PASS 11: owner can extend locked_until';

  RESET ROLE;

  -- ===========================================================
  -- 12. LOCK STATE: owner cannot shorten locked_until
  -- ===========================================================
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', owner_id::text, 'role', 'authenticated')::text,
    true
  );
  SET LOCAL ROLE authenticated;

  BEGIN
    UPDATE public.lock_state
    SET locked_until = now() + INTERVAL '1 hour'  -- shorter than the 7 days we just set
    WHERE id = 1;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    IF row_count > 0 THEN
      RAISE EXCEPTION 'FAIL 12: owner was able to shorten locked_until without approval';
    END IF;
    RAISE NOTICE 'PASS 12: owner cannot shorten locked_until (0 rows updated by RLS)';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS 12: owner cannot shorten locked_until (RLS raised insufficient_privilege)';
  END;

  RESET ROLE;

  -- Reset lock_state for cleanliness
  UPDATE public.lock_state SET locked_until = NULL WHERE id = 1;

  RAISE NOTICE '';
  RAISE NOTICE '=== All RLS tests passed ===';

END;
$$;

ROLLBACK;  -- leave no test data behind
