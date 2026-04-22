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

## Development Setup

See `tasks/plan.md` for build status. Environment variables are documented in `.env.example` (added in step 13).

### Prerequisites

- Node.js 20+
- Supabase CLI
- A NextDNS account with a profile configured

### Run locally

```bash
npm install
npm run dev
```

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
