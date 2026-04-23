# Progress Log

This file is updated by Claude at the end of every response. Each entry records what changed, why, and what was fixed.

---

## 2026-04-22

### Init: Created LOG.md and added logging rule to CLAUDE.md
- **What:** Added `LOG.md` (this file) to the project root and updated `CLAUDE.md` to require a log entry after every response.
- **Why:** User requested a persistent progress log so changes are always documented with context.

---

## 2026-04-23

### Brand guidelines + whole-app visual refactor against impeccable
- **What:** Installed `pbakaus/impeccable` skills + anti-patterns agent into `.claude/`. Wrote full brand book at `tasks/brand.md` (strategy, audience, voice, naming, OKLCH palette, type pairing, spacing, motion, AI-slop test). Added `.impeccable.md` design-context file so future `/audit` and `/polish` runs skip the teach step. Added design tokens to `src/index.css` via Tailwind v4 `@theme` (paper/ink/oxblood/sage/amber colors, Young Serif + Literata + JetBrains Mono fonts, 4pt spacing scale). Loaded fonts in `index.html`. Rewrote all five pages (Dashboard, FriendDashboard, Login, Unauthorized, AuditLog) and all three components (AddDomainForm, LockControls, RequestRemovalModal) plus RequireRole's loading state to use the tokens. Removed the orphaned `src/App.tsx`. Fixed four pages that still said "blockd" to use "sovereign mind" per the naming rule.
- **Why:** User asked to make the product look "good and solid, not like AI slop." Current UI was white-cards-on-gray with generic Tailwind status colors and four pages off-brand. New system is paper-toned with inked text, a single oxblood accent, hairline rules instead of cards, serifed display type, and tightened copy — gives the product a distinct identity grounded in its actual purpose (a pact written on paper) instead of generic SaaS aesthetics. Build passes; 25/25 tests green.

### Fix: spacing token suffix collision collapsed the main column + design the logo
- **What:** Removed the `--spacing-{2xs..3xl}` semantic tokens from `index.css` — they collided with Tailwind v4's `max-w-<suffix>` namespace and were silently making `max-w-2xl` resolve to 3rem instead of 42rem, squeezing the dashboard main column to ~48px wide (every word wrapped onto its own line). Converted the spacing utility class names across every page and component to Tailwind's default numeric scale (`p-4`, `gap-6`, `pt-8`, `pb-16` etc.) which maps 1:1 to the 4pt scale in `tasks/brand.md §6.4`. Replaced the Lovable purple-gradient `public/favicon.svg` with a hanko-style oxblood seal (ring + center dot) on paper — the sovereign mind logo. Added `src/components/Wordmark.tsx` exporting `<Seal>` and `<Wordmark>` components; wired them into every header (Dashboard, FriendDashboard, AuditLog), the Login splash, and Unauthorized.
- **Why:** The screenshot the user sent showed the layout was broken — the main column had collapsed and all text was wrapping per-word — because of the Tailwind v4 token-namespace collision. User also asked for a logo. The mark I designed is aligned with the brand book: a sealed circle echoing a pact on paper, readable at 16×16 favicon size, and works inline next to the wordmark without introducing any new colors. Build passes; tests green.

---
