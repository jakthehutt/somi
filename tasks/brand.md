# sovereign mind — brand guidelines

A working brand book for the product. It covers what the brand stands for, how it should sound, and how it should look. Use this whenever you write copy, touch UI code, or evaluate a design choice.

---

## 1. What this product is

**sovereign mind** is a commitment device. It lets someone block distracting websites on their phone behind a delay and a second person's approval — so the moment of willpower doesn't have to happen at 11pm on the couch, alone, with a thumb hovering over a toggle.

**The structural insight**: willpower fails in predictable ways. A pact with a friend, plus a 24-hour cooling-off, shifts the decision out of the failure window and into a different time and a different person's hands. The product is the enforcement of that pact.

**What this is not:**
- Not a productivity tracker. No streaks, no XP, no graphs of "hours saved".
- Not a parental control app. The user locks themselves — by their own hand.
- Not a wellness product. No breathing exercises, no meditation tips, no "take a moment".
- Not a tech toy. DNS-level blocking and cron-executed unlocks exist because they work, not because they're impressive.

---

## 2. Audience

**Primary user — the owner.** An adult who has decided that certain websites are bad for them and has tried willpower. Probably technical enough to deploy the app themselves. Uses the dashboard in two modes: **planning mode** (mornings, after coffee, adding blocks; calm, deliberate) and **temptation mode** (late, tired, wanting to unlock; the UI must hold the line).

**Secondary user — the friend.** A trusted person who receives unlock requests. Not an adversary, not a gatekeeper bot — a human being the owner chose. Uses the product infrequently and briefly. Needs context to make a fair call and a path to deny without feeling mean.

Both users are on the same side. The interface should reflect that.

---

## 3. Brand personality

Three words, in order of weight:

1. **Resolute** — the product keeps its word. No backdoors. No emergency unlock. Copy is direct. Type is firm.
2. **Calm** — no flashing red, no drill-sergeant scolding, no dark patterns. Someone in temptation mode should feel met, not managed.
3. **Humane** — two people, a written promise, a wait. The product is small and personal. It shouldn't feel like SaaS.

**Feels like:**

- A handwritten pact between friends, scanned and saved.
- A monastery rule book — serious, but not gloomy.
- The Light Phone — a refusal of maximalism, a product-as-position.
- Muji stationery — neutral, warm, unembarrassed by being plain.

**Does not feel like:**

- A productivity dashboard with gradient cards and a weekly email report.
- A crypto wallet with neon accents on dark navy.
- A habit tracker with confetti and streak flames.
- A corporate SaaS with a mascot, illustrations, and "Oops!" empty states.

---

## 4. Voice & tone

### General voice

**Direct. First-person when it fits. Plain English. A little dry.** Never cute. Never scolding. Never urgent unless something is actually urgent.

The product speaks as **a neutral witness to a promise the owner made**. Not as a coach, not as a friend, not as an authority. Closest analog: a well-edited legal document that a human could have written.

### Concrete rules

- **Use "sovereign mind" as a noun, never as a verb or adjective.** The product is not "sovereign-minded". It is sovereign mind.
- **Never write "somi" in UI copy.** That's a technical slug — package name, repo name, URLs. Not brand.
- **Prefer exact times over vague ones.** "Unlocks 14:02 tomorrow" beats "unlocks in 24 hours". The specificity is calming.
- **Name the other person.** "Your friend" not "an approver". If we know their email, show it.
- **No exclamation marks.** Not in success, not in errors, not in empty states.
- **No emoji.** The product doesn't need them and they'd fight the tone.
- **No AI-ese.** Ban words: *empower, unlock (as a metaphor), journey, seamless, elevate, supercharge, effortless*. Yes, we use "unlock" — but only in its literal, mechanical sense.
- **Sentence case for everything.** Including headings and buttons. (Labels and tiny metadata may use small-caps via `text-transform`, but copy in source stays sentence case.)

### Tone by context

| Context | Tone | Example |
|---|---|---|
| Lock state, active | Calm statement of fact | `Locked until 4 May 2026 (10d 4h remaining).` |
| Add a domain | Neutral instruction | `Block a domain.` |
| Request submitted | Acknowledgement, no praise | `Sent to your friend. You'll see the outcome here.` |
| Request pending (owner view) | Patient | `Awaiting your friend's call.` |
| Friend sees a request | Context + fair choice | `Jakob wants reddit.com unblocked. Approving starts a 24 h cooling-off before it takes effect.` |
| Denied by friend | No drama | `Denied by your friend. The block stays.` |
| Approved, cooling-off running | Specific timing | `Unblocks 14:02 tomorrow.` |
| Network/API error | Honest + state-preserving | `Couldn't reach NextDNS. Still locked, for now.` |
| Unauthorized | Plain | `You're signed in but this page isn't for your role.` |
| Empty blocklist | Teach the interface | `Nothing blocked yet. Add a domain above to start.` |

### What to never say

- `Great choice!` — not a choice worth celebrating, and we're not a store.
- `You've unlocked a new badge.` — no badges. Ever.
- `Oops!` / `Uh oh!` — the product doesn't cutesy up failures.
- `🎉 Welcome back!` — no emoji, no exclamation, no faux-warmth.
- `Stay strong!` — patronising; not our role.

---

## 5. Naming system

| Surface | Term | Rule |
|---|---|---|
| Package, repo, URL, folder, env var | `somi` | Lowercase, no space, slug only. |
| Title, h1, nav, visible UI copy | **sovereign mind** | Always lowercase. Always the full two words. No hyphen. |
| Role identifiers | `owner`, `friend` | Lowercase in code and copy. |
| Account-holder in copy | "you" (owner) / "your friend" (friend) | Never "user" or "account holder". |

**Never write "somi — sovereign mind" in UI.** That format exists in README and package metadata only. In the app, "sovereign mind" stands alone.

---

## 6. Visual system

### 6.1 Aesthetic direction

**Considered paper.** Warm ivory surface. Inked charcoal text. A single committed accent (oxblood) that only shows up where it earns its place. Left-aligned. Room to breathe. Serifed headings that feel set, not rendered.

The reference object: **a vow written on good paper.**

**Theme: light only.** The dashboard is most often used in daytime or under temptation at night — and under temptation we want the UI to feel like switching on a reading lamp, not sliding into a dark cave. Dark mode is deliberately not supported; that's a decision, not an oversight.

### 6.2 Color — OKLCH palette

Use OKLCH, not HSL or hex. Reduce chroma near the lightness extremes. Tint every neutral toward the brand hue (warm, ~70°) so surfaces and text feel related.

```css
/* Paper — the base surface. Ivory, warm. */
--paper:          oklch(0.975 0.006 80);   /* page background */
--paper-raised:   oklch(0.955 0.008 80);   /* pulled-forward section */
--paper-sunken:   oklch(0.93  0.010 80);   /* recessed, e.g. input field */

/* Ink — the text and the rule lines. Warm charcoal, not pure black. */
--ink:            oklch(0.22  0.012 60);   /* primary text */
--ink-muted:      oklch(0.48  0.012 60);   /* secondary text, labels */
--ink-faint:      oklch(0.65  0.010 70);   /* metadata, placeholders */
--rule:           oklch(0.88  0.010 75);   /* hairline borders */

/* Oxblood — the single accent. Used for the lock itself and for primary action. */
--oxblood:        oklch(0.42  0.12  28);   /* buttons, locked-state emphasis */
--oxblood-hover:  oklch(0.36  0.13  28);
--oxblood-tint:   oklch(0.94  0.03  28);   /* subtle fill for "locked" badges */

/* Sage — used only for "approved / released". Muted, not triumphant. */
--sage:           oklch(0.45  0.06 150);
--sage-tint:      oklch(0.94  0.025 150);

/* Amber — used only for "pending friend review". Held, not alarmed. */
--amber:          oklch(0.55  0.10  75);
--amber-tint:     oklch(0.94  0.035 75);
```

**Weight distribution (60/30/10):**
- ~60% paper surfaces + ink-faint rules — the room.
- ~30% ink and ink-muted text — the content.
- ~10% oxblood + sage + amber combined, and only on semantic moments — the marks.

**Never:**
- Pure white (`#fff`) or pure black (`#000`).
- Generic Tailwind grays (`gray-50`, `gray-900`, etc.) — they're neutral toward blue and will clash with the paper tint.
- Red / yellow / green Tailwind palettes as status colors — oxblood / amber / sage only.
- Gradients of any kind.
- Gradient text (`background-clip: text`) — this is in impeccable's absolute ban list.
- Colored left-border stripes on cards — absolute ban list.

### 6.3 Typography

**Brand words:** resolute, calm, humane. Not "modern" or "clean" — those lead to Inter.

**Type pairing:**
- **Display / headings — Young Serif.** A wedged, agricultural serif. Single weight (400). Google Fonts. Sets like a stamp, not a logo. Used for h1 and page titles.
- **Body / UI — Literata.** A variable serif designed by TypeTogether for Google Books. Warm, readable, honest, not in the impeccable ban list. Used for everything: paragraphs, labels, buttons, inputs.
- **Technical — JetBrains Mono.** Only for domain names, timestamps rendered as structure, and code. Never as a "technical vibes" font on prose.

```css
--font-display:  'Young Serif', ui-serif, Georgia, serif;
--font-body:     'Literata', ui-serif, Georgia, serif;
--font-mono:     'JetBrains Mono', ui-monospace, 'SF Mono', monospace;
```

**Type scale.** Fixed `rem` scale for the app (no `clamp()` fluid sizing inside the product). Ratio ~1.25. Fewer sizes with more contrast beats many sizes close together.

| Token | Size | Line height | Use |
|---|---|---|---|
| `text-display` | 2.25rem / 36px | 1.15 | Page title (Login h1, brand mark) |
| `text-h2` | 1.5rem / 24px | 1.2 | Section titles |
| `text-h3` | 1.125rem / 18px | 1.3 | Request card domain, inline section |
| `text-body` | 1rem / 16px | 1.55 | Paragraphs, controls |
| `text-small` | 0.875rem / 14px | 1.5 | Helper text, buttons |
| `text-micro` | 0.75rem / 12px | 1.4 | Metadata, timestamps, small-caps labels |

**Weight:**
- Display: 400 (Young Serif has one weight)
- Body headings: 600 for section titles, 500 for inline
- Body prose: 400
- Buttons: 500
- Metadata: 400

**Rules:**
- Line-length cap on prose: `max-width: 62ch` for reading.
- Small-caps section labels are allowed via `text-transform: uppercase; letter-spacing: 0.08em`. Keep to one line, short.
- Numbers — timestamps, countdowns — use `font-variant-numeric: tabular-nums` so digits don't jiggle as they tick.
- Do not use monospace as decorative texture on prose. Reserve it for `reddit.com`, `14:02:33`, code.

### 6.4 Spacing

4pt baseline grid. Semantic names, not pixel names.

```css
--space-2xs: 0.25rem;  /* 4  */
--space-xs:  0.5rem;   /* 8  */
--space-sm:  0.75rem;  /* 12 */
--space-md:  1rem;     /* 16 */
--space-lg:  1.5rem;   /* 24 */
--space-xl:  2rem;     /* 32 */
--space-2xl: 3rem;     /* 48 */
--space-3xl: 4rem;     /* 64 */
```

**Rhythm rules:**
- Vary spacing to show importance. A section heading gets `--space-xl` above it, not the same `--space-md` every other element uses.
- Use `gap` for sibling spacing — never `margin-bottom`.
- Dashboard main column: `max-width: 42rem` (672 px). Narrow on purpose — this is a reading UI, not a control panel.
- Generous breathing room at the top: `--space-2xl` between header and first section. The product is not anxious; don't pack it.

### 6.5 Elements

**Surfaces.** Prefer paper + hairline rules over cards. When a section needs containment, use a thin 1px rule in `--rule` and generous padding — not a drop shadow, not a full border on all sides. A section is a **block of type**, not a box.

- Do not wrap every section in a card.
- Do not nest containers. If two cards touch, delete one.
- No rounded-xl drop-shadow cards in a grid. That's the single most common AI layout — avoid it.

**Buttons.**

- **Primary:** filled oxblood, ink-on-oxblood contrast verified to WCAG AA, `border-radius: 2px` (minimal, not pill), `font-family: body`, weight 500, `text-small`. Hover: darken to `--oxblood-hover`.
- **Secondary / destructive-secondary (Deny, Cancel):** ink-muted text, 1px `--rule` border, transparent fill, `border-radius: 2px`.
- **Tertiary / text link:** inline ink-muted text with underline on hover. No button chrome.

Never more than one primary button in a view. Hierarchy matters.

**Inputs.**

- No filled backgrounds. A thin `--rule` bottom border only — like a line on paper. On focus, the line thickens to 2px and changes to `--ink`.
- Placeholder in `--ink-faint`. Never the same color as real text.
- Domain input: `font-family: var(--font-mono)`.

**Badges / status chips.**

- Small-caps, `text-micro`, 6px vertical padding, 10px horizontal, 2px radius.
- **Locked / active block** → `--oxblood-tint` bg, `--oxblood` text.
- **Pending friend review** → `--amber-tint` bg, `--amber` text.
- **Approved — cooling off / Released** → `--sage-tint` bg, `--sage` text.

**Modal.**

Impeccable says modals are usually lazy. Here we keep one: **the remove-request modal**. A removal request is the single most important moment in the product — it deserves a page-stopping gesture. Style it as a page-within-a-page: `--paper-raised` surface, a single `--rule` around it, no drop shadow. Background behind: `--ink` at 60% opacity — a firm fade-out, not a gimmick blur.

### 6.6 Motion

Motion is used sparingly, and only for state change — not as decoration.

- Duration: 180ms for small state changes, 260ms for section reveals, 0ms for disabled/enabled toggles.
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quart). **Never bounce or elastic.**
- Animate `transform` and `opacity` only — never `width`, `height`, `top`, `left`.
- A countdown ticks via content change, not motion — do not animate the digits.
- Honor `prefers-reduced-motion: reduce` — drop all transitions to 0ms.

### 6.7 The AI-slop test

Before shipping any view, look at it and ask: **"If someone said 'an AI made this', would I immediately believe them?"** If yes, the view needs to change — not more polish, a different structure.

Specific fingerprints we will never ship:
- A 3-across card grid of "feature tiles" with an icon above a heading above body text.
- A purple-to-blue gradient anywhere.
- Gradient text for emphasis.
- A colored left border on a callout.
- A "big number, small label" hero metric.
- Glassmorphism / blurred translucent panels.
- A rounded-square icon tile above every section heading.
- A dark navy UI with cyan accents.
- Fraunces, Instrument Serif, Inter, DM Sans, Plus Jakarta Sans, IBM Plex — all banned (both by impeccable and by us).

---

## 7. How to apply this

- **When writing copy:** read section 4. If the sentence ends with `!` delete it. If it contains *journey, seamless, empower, stay strong* — rewrite.
- **When writing a component:** use tokens from section 6.2 and 6.4. If you find yourself writing `#fff`, `#000`, `gray-50`, or a hex color — stop and use a token.
- **When reviewing a PR:** run the AI-slop test in 6.7. Then check the naming rule in section 5.
- **When using impeccable skills in Claude Code:**
  - `/impeccable teach` already has its context pre-filled — see `.impeccable.md` in the project root. Do not re-run teach.
  - Use `/audit <area>` to get a technical quality report.
  - Use `/distill` when a view feels busy — not to remove features, to find the one thing it's really for.
  - Use `/polish` as the last step before committing a visual change.
  - Run `/critique <area>` before shipping a redesign — it catches taste-level issues `/audit` won't.

---

## 8. Open questions (not yet decided)

- Logo / mark. There is no logo yet. The h1 wordmark in Young Serif is the mark for now. If a graphic mark is ever added, it must read at 16×16 favicon size and not rely on color.
- Email from the product (magic link, digests). Currently piggybacks on Supabase default email — that's off-brand and should be replaced. Deferred until there's a real sender.
- Favicon. Current `/favicon.svg` is placeholder.

These are explicit follow-ups, not oversights.
