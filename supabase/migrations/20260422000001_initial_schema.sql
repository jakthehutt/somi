-- ============================================================
-- blockd — initial schema
-- ============================================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- pg_net is used by the sync-nextdns trigger (added in Step 5)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- Tables
-- ============================================================

-- User profiles — linked 1-to-1 with auth.users, created via trigger.
-- Only 'owner' and 'friend' roles exist. Profiles seeded by service role;
-- trigger auto-creates on magic-link sign-up when role is set in metadata.
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('owner', 'friend')),
  email      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Website blocklist
CREATE TABLE IF NOT EXISTS blocklist (
  id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  domain   TEXT        NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by UUID        NOT NULL REFERENCES profiles(id),
  status   TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending_removal', 'removed'))
);

-- One active-or-pending entry per domain; allows re-adding after removal
CREATE UNIQUE INDEX IF NOT EXISTS blocklist_domain_active_unique
  ON blocklist(domain)
  WHERE status IN ('active', 'pending_removal');

-- Lock state — singleton row (id must equal 1)
CREATE TABLE IF NOT EXISTS lock_state (
  id                INT         PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  locked_until      TIMESTAMPTZ,
  cooling_off_hours INT         NOT NULL DEFAULT 24 CHECK (cooling_off_hours >= 1),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the singleton row
INSERT INTO lock_state (id, cooling_off_hours)
  VALUES (1, 24)
  ON CONFLICT (id) DO NOTHING;

-- Unlock requests — covers both domain removal and lock-duration shortening
CREATE TABLE IF NOT EXISTS unlock_requests (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Exactly one of these two must be set (checked below)
  target_blocklist_id UUID        REFERENCES blocklist(id),
  target_lock_change  JSONB,      -- {new_locked_until: <iso8601>} for lock shortening requests
  requested_by        UUID        NOT NULL REFERENCES profiles(id),
  requested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason              TEXT,
  status              TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied', 'executed')),
  approved_at         TIMESTAMPTZ,
  executed_at         TIMESTAMPTZ,
  friend_user_id      UUID        REFERENCES profiles(id),

  CONSTRAINT exactly_one_target CHECK (
    (target_blocklist_id IS NOT NULL)::int +
    (target_lock_change  IS NOT NULL)::int = 1
  ),
  -- Data integrity: timestamps and actor must be set when status transitions
  CONSTRAINT approved_at_required CHECK (
    status != 'approved' OR approved_at IS NOT NULL
  ),
  CONSTRAINT executed_at_required CHECK (
    status != 'executed' OR executed_at IS NOT NULL
  ),
  CONSTRAINT friend_required_when_resolved CHECK (
    status NOT IN ('approved', 'denied') OR friend_user_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS unlock_requests_status_idx
  ON unlock_requests(status, approved_at);
CREATE INDEX IF NOT EXISTS unlock_requests_requested_by_idx
  ON unlock_requests(requested_by);

-- Audit log — append-only, written by SECURITY DEFINER triggers (Step 12)
CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor      UUID        REFERENCES profiles(id),
  action     TEXT        NOT NULL,
  payload    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_actor_idx      ON audit_log(actor);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at DESC);

-- ============================================================
-- Profile creation trigger
-- ============================================================

-- Reads `role` from auth user metadata (set when sending the magic-link invite).
-- Only inserts a profile when role is 'owner' or 'friend'; all other sign-ups ignored.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := new.raw_user_meta_data->>'role';
  IF user_role IN ('owner', 'friend') THEN
    INSERT INTO public.profiles (id, role, email)
    VALUES (new.id, user_role, new.email)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Helper functions (used in RLS policies — SECURITY DEFINER to avoid recursion)
-- ============================================================

-- Returns the role of the currently authenticated user
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Returns current lock_state.locked_until for use in UPDATE policy comparison.
-- Must be SECURITY DEFINER so the RLS policy on lock_state can read its own table.
CREATE OR REPLACE FUNCTION current_locked_until()
RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT locked_until FROM lock_state WHERE id = 1;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocklist       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lock_state      ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log       ENABLE ROW LEVEL SECURITY;

-- ---- profiles ------------------------------------------------

-- Both owner and friend can read all profiles (needed for friend view)
CREATE POLICY "profiles: authenticated can read"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE: profiles are managed via service role and the trigger above.

-- ---- blocklist -----------------------------------------------

CREATE POLICY "blocklist: authenticated can read"
  ON blocklist FOR SELECT
  TO authenticated
  USING (true);

-- Owner can add new domains; must start as 'active'
CREATE POLICY "blocklist: owner can insert active"
  ON blocklist FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'owner'
    AND status = 'active'
  );

-- Owner can toggle between 'active' and 'pending_removal'.
-- Cannot ever set status='removed' via client — that is service-role only (pg_cron Step 10).
CREATE POLICY "blocklist: owner can toggle pending removal"
  ON blocklist FOR UPDATE
  TO authenticated
  USING  (get_my_role() = 'owner' AND status IN ('active', 'pending_removal'))
  WITH CHECK (
    get_my_role() = 'owner'
    AND status IN ('active', 'pending_removal')
  );

-- No DELETE policy — domains are logically removed via status='removed'

-- ---- lock_state ---------------------------------------------

CREATE POLICY "lock_state: authenticated can read"
  ON lock_state FOR SELECT
  TO authenticated
  USING (true);

-- Owner can ONLY extend locked_until (set it further into the future).
-- Shortening requires an unlock_request (enforced here: new value must be >= current).
-- current_locked_until() reads the current row as service role to avoid circular RLS.
CREATE POLICY "lock_state: owner can only extend"
  ON lock_state FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'owner')
  WITH CHECK (
    get_my_role() = 'owner'
    AND (
      current_locked_until() IS NULL
      OR (locked_until IS NOT NULL AND locked_until >= current_locked_until())
    )
  );

-- ---- unlock_requests ----------------------------------------

-- Owner sees their own requests; friend sees all (pending + history)
CREATE POLICY "unlock_requests: owner sees own, friend sees all"
  ON unlock_requests FOR SELECT
  TO authenticated
  USING (
    (get_my_role() = 'owner' AND requested_by = auth.uid())
    OR get_my_role() = 'friend'
  );

-- Owner can submit new requests; all audit fields must be unset at insert time
CREATE POLICY "unlock_requests: owner can insert pending"
  ON unlock_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'owner'
    AND requested_by = auth.uid()
    AND status = 'pending'
    AND approved_at   IS NULL
    AND executed_at   IS NULL
    AND friend_user_id IS NULL
  );

-- Friend can move a pending request to 'approved' or 'denied'.
-- Must set friend_user_id to themselves and approved_at when approving.
CREATE POLICY "unlock_requests: friend can approve or deny"
  ON unlock_requests FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'friend'
    AND status = 'pending'
  )
  WITH CHECK (
    get_my_role() = 'friend'
    AND status IN ('approved', 'denied')
    AND friend_user_id = auth.uid()
    AND (status != 'approved' OR approved_at IS NOT NULL)
  );

-- ---- audit_log ----------------------------------------------

CREATE POLICY "audit_log: authenticated can read"
  ON audit_log FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT policy: audit entries written only by SECURITY DEFINER triggers (Step 12)
