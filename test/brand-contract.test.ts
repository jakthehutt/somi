/*
 * Brand & build contract tests.
 *
 * These are cheap, filesystem-level guardrails against the regressions we've
 * already hit once:
 *
 *  1. UI text drifting back to "blockd" (brand naming rule).
 *  2. Defining --spacing-<suffix> tokens that collide with Tailwind v4's
 *     max-w-<suffix> utility and silently collapse the main column.
 *  3. Reaching for the default Tailwind palette (gray-*, red-*, etc.) instead
 *     of brand tokens (paper/ink/oxblood/sage/amber).
 *  4. Losing the Vercel SPA rewrite (causes 404: NOT_FOUND on any route
 *     other than `/` because React Router never gets to see the path).
 *  5. Impeccable's absolute bans: colored side-stripe borders >1px and
 *     gradient text.
 *
 * Run with: npm test
 */

import { describe, test, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname

function walk(dir: string, exts: string[], acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue
    const full = join(dir, name)
    const s = statSync(full)
    if (s.isDirectory()) walk(full, exts, acc)
    else if (exts.some(e => name.endsWith(e))) acc.push(full)
  }
  return acc
}

const SRC_FILES = walk(join(ROOT, 'src'), ['.ts', '.tsx', '.css'])

function findMatches(pattern: RegExp, files: string[]): { file: string; line: number; text: string }[] {
  const hits: { file: string; line: number; text: string }[] = []
  for (const f of files) {
    const lines = readFileSync(f, 'utf8').split('\n')
    lines.forEach((text, i) => {
      if (pattern.test(text)) {
        hits.push({ file: relative(ROOT, f), line: i + 1, text: text.trim() })
      }
    })
  }
  return hits
}

function fmtHits(hits: { file: string; line: number; text: string }[]): string {
  return hits.map(h => `  ${h.file}:${h.line}  ${h.text}`).join('\n')
}

describe('naming rule — "sovereign mind" vs "somi"', () => {
  test('no UI copy or page source contains the old "blockd" name', () => {
    // UI copy: src/**/*.{tsx,ts} and index.html (excluding generated build output).
    const files = [
      ...walk(join(ROOT, 'src'), ['.ts', '.tsx']),
      join(ROOT, 'index.html'),
    ]
    const hits = findMatches(/\bblockd\b/i, files)
    expect(hits, `Found legacy "blockd" references:\n${fmtHits(hits)}`).toHaveLength(0)
  })
})

describe('design tokens — no --spacing-<suffix> collision with max-w-*', () => {
  const cssPath = join(ROOT, 'src/index.css')
  const css = readFileSync(cssPath, 'utf8')

  // Tailwind v4 uses the --spacing-<suffix> namespace to resolve both p-*
  // AND max-w-<suffix>. Declaring --spacing-md (etc.) silently overrides
  // max-w-md's width. These suffixes are the ones that collide.
  const COLLIDING_SUFFIXES = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl']

  test.each(COLLIDING_SUFFIXES)('index.css does not declare --spacing-%s', (suffix) => {
    const re = new RegExp(`--spacing-${suffix}\\s*:`, 'm')
    expect(
      re.test(css),
      `src/index.css declares --spacing-${suffix}; this will hijack max-w-${suffix} and collapse layout widths. Use Tailwind's numeric scale (p-4, p-6, p-8, p-12, p-16) instead.`,
    ).toBe(false)
  })

  test('index.css declares the brand palette tokens', () => {
    for (const token of ['--color-paper', '--color-ink', '--color-oxblood', '--color-sage', '--color-amber', '--color-rule']) {
      expect(css, `src/index.css missing token ${token}`).toMatch(new RegExp(`${token}\\s*:`))
    }
  })
})

describe('forbidden Tailwind defaults — brand uses its own palette', () => {
  test('no bg-white / bg-gray-* / text-gray-* / border-gray-* in source', () => {
    // Intentionally strict: if you want a tinted neutral, use paper/ink tokens.
    const hits = findMatches(
      /\b(bg-white|bg-gray-\d+|text-gray-\d+|border-gray-\d+|divide-gray-\d+)\b/,
      SRC_FILES,
    )
    expect(hits, `Found default Tailwind grays. Use brand tokens (bg-paper, text-ink, border-rule):\n${fmtHits(hits)}`).toHaveLength(0)
  })

  test('no generic status palettes (red/yellow/green/blue) — use oxblood/amber/sage', () => {
    const hits = findMatches(
      /\b(bg|text|border)-(red|yellow|green|blue|indigo|purple|violet|pink|rose|emerald|teal|cyan|sky|orange)-\d+\b/,
      SRC_FILES,
    )
    expect(hits, `Found generic status colors. Use oxblood (bad), amber (pending), sage (released):\n${fmtHits(hits)}`).toHaveLength(0)
  })

  test('no rounded-xl / rounded-2xl / rounded-3xl cards (brand is paper, not iOS)', () => {
    const hits = findMatches(/\brounded-[23]?xl\b/, SRC_FILES)
    expect(hits, `Found soft rounded cards. Use hairline rules with border-rule and padding:\n${fmtHits(hits)}`).toHaveLength(0)
  })
})

describe('impeccable absolute bans', () => {
  test('no colored side-stripe borders > 1px (border-l-[2-9]/border-r-[2-9] with color)', () => {
    // Flag border-l-2 .. border-l-8 where a color class appears on the same element.
    // Simpler: flag any occurrence of border-l-[2-9] or border-r-[2-9] at all —
    // we don't use thick side borders in this codebase and don't plan to.
    const hits = findMatches(/\bborder-[lr]-[2-9]\b/, SRC_FILES)
    expect(hits, `Found side-stripe border >1px (impeccable absolute ban 1):\n${fmtHits(hits)}`).toHaveLength(0)
  })

  test('no gradient text (background-clip: text + a gradient fill)', () => {
    // Catch the CSS pattern directly, and the Tailwind shortcut.
    const patterns = [
      /background-clip\s*:\s*text/i,
      /-webkit-background-clip\s*:\s*text/i,
      /\bbg-gradient-to-\w+\b/, // Tailwind gradient background; on text this is almost always the gradient-text pattern
      /\btext-transparent\b/,   // pairs with background-clip text
    ]
    for (const pat of patterns) {
      const hits = findMatches(pat, SRC_FILES)
      expect(hits, `Found gradient-text pattern (impeccable absolute ban 2):\n${fmtHits(hits)}`).toHaveLength(0)
    }
  })
})

describe('deployment — vercel.json SPA rewrite', () => {
  const vercelPath = join(ROOT, 'vercel.json')

  test('vercel.json exists at repo root', () => {
    expect(existsSync(vercelPath), 'Missing vercel.json. Without it, non-root routes 404 on refresh.').toBe(true)
  })

  test('vercel.json rewrites every path to /index.html so React Router handles routing', () => {
    const cfg = JSON.parse(readFileSync(vercelPath, 'utf8')) as {
      rewrites?: { source: string; destination: string }[]
    }
    expect(cfg.rewrites, 'vercel.json has no rewrites array').toBeTruthy()

    const spaRule = cfg.rewrites!.find(
      r => r.destination === '/index.html' && (r.source === '/(.*)' || r.source === '/:path*'),
    )
    expect(
      spaRule,
      'vercel.json is missing the SPA fallback rule mapping /(.*) → /index.html. Without it /login, /friend, /log all return NOT_FOUND on direct hit or refresh.',
    ).toBeTruthy()
  })
})

describe('wordmark — sovereign mind brand mark is wired in every user-facing page', () => {
  const PAGES = [
    'src/pages/Dashboard.tsx',
    'src/pages/FriendDashboard.tsx',
    'src/pages/AuditLog.tsx',
    'src/pages/Login.tsx',
    'src/pages/Unauthorized.tsx',
  ]

  test.each(PAGES)('%s renders the seal or Wordmark component', (page) => {
    const src = readFileSync(join(ROOT, page), 'utf8')
    const hasMark = /\b(Wordmark|Seal)\b/.test(src)
    expect(
      hasMark,
      `${page} doesn't import or render <Wordmark> or <Seal>. Every user-facing page should carry the brand mark.`,
    ).toBe(true)
  })
})
