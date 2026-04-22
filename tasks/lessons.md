# blockd — Lessons Learned

Read this at the start of every session before writing any code.

## Session 1

### Vite scaffold in non-empty directory
`npm create vite@latest .` cancels if the target directory is non-empty (even if it only contains `.git`). Workaround: scaffold to a temp directory (`/tmp/<name>`), then `cp -r /tmp/<name>/. .`.

### Supabase CLI install on macOS with outdated Xcode
`brew install supabase/tap/supabase` fails if Xcode is below the required version. Workaround: download the binary directly from GitHub releases and place it in `~/.local/bin`.

### Sourcing .env with spaces around `=`
If `.env` has `KEY = value` (spaces around `=`), `source .env` treats the key as a command. Fix: `eval "$(grep -E '^[A-Z_]+\s*=' .env | sed 's/ *= */=/' | sed 's/^/export /')"`.

### Supabase REST API returns `[]` for RLS-blocked tables
When RLS blocks a query (no matching policy), the REST API returns `[]` rather than 403. This is expected. Use the service-role key to bypass RLS for seeding/verification.

### Tailwind v4 setup
Tailwind v4 uses `@tailwindcss/vite` (not `tailwindcss-vite` or the old PostCSS approach). Import in CSS with `@import "tailwindcss";` — no `tailwind.config.js` needed for basic setup.
