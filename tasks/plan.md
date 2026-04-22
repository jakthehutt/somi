# blockd — Build Plan

Track one commit per numbered step. Check off as completed.

- [x] **Step 1** — Repo + scaffolding: Vite + React + TS + Tailwind, README, tasks files
- [x] **Step 2** — Supabase schema: migrations for profiles, blocklist, lock_state, unlock_requests, audit_log with RLS
- [ ] **Step 3** — Schema test fixtures: `supabase/tests/rls.sql` exercising RLS as different roles
- [ ] **Step 4** — NextDNS API client: `src/lib/nextdns.ts` with add/remove/list, Vitest tests
- [ ] **Step 5** — Sync edge function: `supabase/functions/sync-nextdns/index.ts`, triggered on blocklist changes
- [ ] **Step 6** — Dashboard read view: `/` owner route, `/login` magic-link, TanStack Query hooks
- [ ] **Step 7** — Add-to-blocklist flow: form + validation + insert; first end-to-end proof *(pause for manual verify)*
- [ ] **Step 8** — Unlock request flow: "Request removal" button + modal + pending list
- [ ] **Step 9** — Friend view + approval: `/friend` route, pending list, approve/deny buttons
- [ ] **Step 10** — Cooling-off + execution: pg_cron job, countdown UI, executed status
- [ ] **Step 11** — Lock duration controls: extend (instant) vs shorten (approval required), RLS enforced
- [ ] **Step 12** — Audit log: triggers on all mutating tables, `/log` page with filters
- [ ] **Step 13** — Polish + deploy: `.env.example`, README setup section, Vercel + Supabase prod docs
