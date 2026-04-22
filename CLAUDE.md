# Working Principles

## Iterative Progress
- Break every task into discrete, numbered steps before starting
- After each step: **write the file(s)**, then **commit** with a short headline + one-sentence reason
- On the next iteration: improve, extend, or fix — then commit again
- If the step produces code, **run it** to catch bugs before moving on
- Never batch multiple logical changes into a single commit — keep history granular and readable

### Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project
- Never mark a task complete without proving it works
- Ask yourself: "Would a staff engineer approve this?"

## Test-Driven Development

- Write tests **before** writing implementation code
- Red → Green → Refactor: fail first, make it pass, then clean it up
- Run the full test suite after every meaningful change
- If no test framework exists yet, set one up as the very first step
- A feature is not done until it has a passing test

### Test Coverage Requirements

Every piece of functionality must have a corresponding test. No exceptions.

**What must be tested:**
- Every Supabase connection (auth, database reads/writes, realtime)
- Every RLS policy — run as each role (`owner`, `friend`, anonymous) and assert allow/deny
- Every edge function — test the HTTP interface with mocked and real payloads
- Every NextDNS API client function (`addDenylistDomain`, `removeDenylistDomain`, `listDenylist`)
- Every lock rule — adding blocks, requesting removal, approving, cooling-off, execution
- Every UI mutation — form submissions, button clicks that trigger database writes

**Test locations:**
- `test/` — Vitest unit + integration tests (TypeScript)
- `supabase/tests/` — SQL tests for RLS policies (run via psql against the linked project)
- Edge function tests live alongside the function in `supabase/functions/<name>/`

**Rules:**
- A connection is not trusted until a test proves it works
- An RLS policy is not trusted until a test proves it blocks what it should block
- Never skip RLS tests because "they're tedious" — they are the security boundary
- If a test is hard to write, that is a signal the code needs to be simpler

## Use Repository Context
If current task indicates prior knowledge and context read this file `repostory-info.md` to fetch infor about goal, structure and context of the project.

## 4. Commit After Every Message

- Commit at minimum once per response — more often if multiple logical changes were made
- Commit message format: `<type>: <short headline> — <one sentence why>`
  - **type**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
  - Example: `feat: add KAN layer forward pass — needed to validate B-spline basis output`
- Include keywords: what changed, why it changed
- Never leave uncommitted work at the end of a response

## 5. Update LOG.md After Every Response

At the end of every response, append a new entry to `tasks/LOG.md` under the current date with:
- **What:** one or two sentences on what changed or was fixed
- **Why:** the reason — bug, user request, requirement, etc.

Format:
```
### <short title>
- **What:** ...
- **Why:** ...
```

Never skip this step, even for small or partial changes.

## 6. Push to Both Remotes

This repo has two remotes that must stay in sync:
- `origin` → `https://github.com/jakthehutt/somi` (main repo)
- `lovable` → `https://github.com/jakthehutt/git-connect.git` (Lovable sync)

**Every push must go to both:**
```bash
git push origin main && git push lovable main
```
