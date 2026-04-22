# blockd — Lessons Learned

Read this at the start of every session before writing any code.

## Session 1

### Vite scaffold in non-empty directory
`npm create vite@latest .` cancels if the target directory is non-empty (even if it only contains `.git`). Workaround: scaffold to a temp directory (`/tmp/<name>`), then `cp -r /tmp/<name>/. .`.

### Tailwind v4 setup
Tailwind v4 uses `@tailwindcss/vite` (not `tailwindcss-vite` or the old PostCSS approach). Import in CSS with `@import "tailwindcss";` — no `tailwind.config.js` needed for basic setup.
