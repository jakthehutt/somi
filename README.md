# somi — sovereign mind

A self-hosted dashboard that blocks websites on an Android phone via NextDNS, where **removing a block requires a friend's approval plus a cooling-off delay**. Adding blocks is instant. The whole point is moving the unlock decision off your own phone — where you'd cave in a weak moment — into a web flow that involves another human and a delay.

## Architecture

```
[Me]                          [Friend]
  |                                |
  v                                v
+-------------------+        +-----------------+
| Dashboard (Vite)  | <----> |    Supabase     |
| - request unlock  |        | - blocklist     |
| - add new blocks  |        | - lock state    |
+-------------------+        | - approvals     |
                             | - audit log     |
+-------------------+        +-----------------+
| Friend dashboard  | <----> | (same)          |
| - approve / deny  |        |                 |
+-------------------+        +-----------------+
                                     |
                                     | edge function on change
                                     v
                              +---------------+
                              |  NextDNS API  |
                              +---------------+
                                     |
                                     | DNS filtering
                                     v
                              +---------------+
                              |  My phone     |
                              | (NextDNS app, |
                              |  always-on    |
                              |  VPN)         |
                              +---------------+
```

Phone runs the official NextDNS Android app as always-on VPN, pointed at a NextDNS profile. We never ship phone code. All policy lives in Supabase, mirrored to NextDNS via their REST API.

## Lock Rules

| Action | Who | Requires |
|--------|-----|----------|
| Add domain to blocklist | Owner | Nothing — instant |
| Extend `locked_until` further into the future | Owner | Nothing — instant |
| Remove domain from blocklist | Owner requests, friend approves | Approval row + cooling-off delay (default 24 h after approval) |
| Shorten `locked_until` | Owner requests, friend approves | Approval + cooling-off delay |
| Approve / deny unlock requests | Friend only | Auth as `friend` role |

The cooling-off is configurable per-system (default 24 h). Approvals don't take effect immediately — a `pg_cron` job executes them once `now() >= approved_at + cooling_off_interval`.

**No backdoors.** No admin override, no emergency unlock, no reset-all path.

## Stack

- **Frontend:** Vite + React + TypeScript, Supabase JS client, Tailwind CSS, TanStack Query
- **Backend:** Supabase — Postgres, Auth (magic link), Edge Functions (Deno/TS), Row Level Security
- **DNS filtering:** NextDNS REST API
- **Deployment:** Vercel (frontend), Supabase cloud (backend)
- **Testing:** Vitest (unit), Deno test (NextDNS client), SQL/psql (RLS policies)

## Roles

Two users only: `owner` and `friend`. Stored in a `profiles` table joined to `auth.users`. RLS uses the role to gate writes.

## Setup

Full, first-time setup for a fresh clone. Existing users see "Local development" below.

### Prerequisites

- Node.js 20+
- Homebrew (macOS) or a way to install the Supabase CLI
- NextDNS account with a profile configured
- Free Supabase project
- Vercel account (for deploy)

### 1. Clone and install

```bash
git clone https://github.com/jakthehutt/somi && cd somi
npm install
```

### 2. Supabase — backend

1. Create a project at [supabase.com](https://supabase.com) → note the **project ref** (from the URL)
2. Install the CLI and authenticate:
   ```bash
   brew install supabase/tap/supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   ```
3. Push all migrations to your new project:
   ```bash
   supabase db push
   ```
4. Deploy the sync-nextdns edge function (JWT verification is enabled by default — do **not** pass `--no-verify-jwt`):
   ```bash
   supabase functions deploy sync-nextdns
   ```
5. Set the NextDNS credentials on the edge function:
   ```bash
   supabase secrets set NEXTDNS_PROFILE_ID=<your profile id>
   supabase secrets set NEXTDNS_API_KEY=<your api key>
   ```
6. **Important:** the sync trigger inside `20260422000003_app_settings.sql` is hardcoded with the original project's URL and anon key. When forking to a new project, edit that migration's `net.http_post` call to point to your own function URL and anon key before running `supabase db push`.

### 3. Create the owner and friend users

Supabase magic-link sign-up doesn't pass a role — you must seed the first two accounts yourself. Use the Supabase dashboard (Auth → Users → Add user) or the admin API:

```bash
curl -X POST "https://<ref>.supabase.co/auth/v1/admin/users" \
  -H "apikey: <service_role_key>" \
  -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"...","email_confirm":true,"user_metadata":{"role":"owner"}}'
```

Repeat for the friend with `"role":"friend"`. The `handle_new_user` trigger creates the `profiles` row from the metadata.

### 4. Frontend — environment variables

Copy `.env.example` to `.env` and fill it in. `.env` is gitignored.

### 5. NextDNS Android app

See [`tasks/phone-setup.md`](tasks/phone-setup.md) for the always-on VPN configuration that makes blocks actually enforce on the phone.

### 6. Deploy to Vercel

```bash
vercel deploy --prod
```

Then set the two `VITE_*` env vars in **Vercel → Settings → Environment Variables**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Trigger a redeploy once added.

### Local development

```bash
npm run dev        # start dev server
npm run build      # type-check + production build
npm test           # run RLS + NextDNS tests (hits your live Supabase project)
```

## Deploy checklist

For each change that touches the backend:

- [ ] New migration in `supabase/migrations/` → `supabase db push`
- [ ] Edge function change → `supabase functions deploy sync-nextdns`
- [ ] Commit covers one logical step only
- [ ] `npm test` passes
- [ ] Push to both remotes: `git push origin main && git push lovable main`

## Git Remotes

This repo is mirrored to two remotes. Every push must go to both:

```bash
git push origin main && git push lovable main
```

| Remote | URL | Purpose |
|--------|-----|---------|
| `origin` | https://github.com/jakthehutt/somi | Main repo |
| `lovable` | https://github.com/jakthehutt/git-connect.git | Lovable sync |

Note: Lovable may push directly to `git-connect` when you edit in its editor. Pull from there before pushing if you've been using the Lovable UI: `git pull lovable main`.
