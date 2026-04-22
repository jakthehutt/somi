# blockd — Lessons Learned

Read this at the start of every session before writing any code.

## Session 1

### Vite scaffold in non-empty directory
`npm create vite@latest .` cancels if the target directory is non-empty (even if it only contains `.git`). Workaround: scaffold to a temp directory (`/tmp/<name>`), then `cp -r /tmp/<name>/. .`.

### Magic link sign-up does not pass user_metadata role
`signInWithOtp` does not pass `user_metadata`, so the `handle_new_user` trigger finds no role and skips profile creation. Result: user hits "Unauthorized" after clicking the magic link. Fix for existing users: insert profile manually via service role. Fix for new invites: use `supabase.auth.admin.inviteUserByEmail({ email, options: { data: { role } } })` from the backend instead of letting users self-sign-up. Implemented in Step 6 setup notes.

### Supabase migration role cannot ALTER DATABASE
The role used by `supabase db push` cannot run `ALTER DATABASE postgres SET "app.xxx"`. Solution: hardcode non-secret config directly in the trigger function body (function URL + public anon JWT). Never use `ALTER DATABASE` for app config in Supabase cloud migrations.

### Supabase secrets set rejects SUPABASE_ prefix
`supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...` is rejected — the `SUPABASE_` prefix is reserved. Edge functions receive `SUPABASE_SERVICE_ROLE_KEY` automatically as a built-in env var; never set it manually.

### Vitest env loading with spaces around `=` in .env
Vitest's built-in env loading (and `dotenv.config()`) can silently drop vars if the `.env` file has `KEY = VALUE` (spaces). Fix: use `loadEnv` from `vite` in `vitest.config.ts` with an empty prefix (`''`) to load ALL vars, then spread them into `test.env`. Use `import.meta.env` (not `process.env`) in tests — Vitest populates this from `test.env`.

### `loadEnv` is from `vite`, not `vitest/config`
`import { loadEnv } from 'vitest/config'` throws — it only exports `defineConfig`. Import `loadEnv` from `'vite'` separately.

### Supabase REST API returns `[]` for RLS UPDATE blocks (not an error)
When an RLS UPDATE policy's USING clause filters out all rows (e.g., friend trying to re-approve an already-approved request), Supabase returns `{ data: [], error: null }` — 0 rows affected, no error. Tests must check `data.length === 0`, not `error !== null`.

### Supabase CLI install on macOS with outdated Xcode
`brew install supabase/tap/supabase` fails if Xcode is below the required version. Workaround: download the binary directly from GitHub releases and place it in `~/.local/bin`.

### Sourcing .env with spaces around `=`
If `.env` has `KEY = value` (spaces around `=`), `source .env` treats the key as a command. Fix: `eval "$(grep -E '^[A-Z_]+\s*=' .env | sed 's/ *= */=/' | sed 's/^/export /')"`.

### Supabase REST API returns `[]` for RLS-blocked tables
When RLS blocks a query (no matching policy), the REST API returns `[]` rather than 403. This is expected. Use the service-role key to bypass RLS for seeding/verification.

### Tailwind v4 setup
Tailwind v4 uses `@tailwindcss/vite` (not `tailwindcss-vite` or the old PostCSS approach). Import in CSS with `@import "tailwindcss";` — no `tailwind.config.js` needed for basic setup.
