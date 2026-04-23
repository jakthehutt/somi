/*
 * The sovereign mind mark: oxblood ring + center dot. A hanko-style seal
 * stamped in ink. It's a lock face, a target, a promise on paper.
 *
 * <Seal /> renders the mark alone (decorative — aria-hidden).
 * <Wordmark /> renders the full lockup: seal + "sovereign mind" in Young Serif.
 */

interface SealProps {
  /** Pixel size. Favicon-scale (20) in headers, bigger (40+) on the login splash. */
  size?: number
  /** Tailwind color class applied to `currentColor` — defaults to oxblood. */
  className?: string
}

export function Seal({ size = 20, className = 'text-oxblood' }: SealProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="16"
        cy="16"
        r="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  )
}

interface WordmarkProps {
  /** 'compact' = inline header mark, 'display' = login splash. */
  size?: 'compact' | 'display'
  /** 'h1' for page-title use, 'span' for nav / inline use. Default 'span'. */
  as?: 'h1' | 'span'
  /** Optional suffix label, small-caps, right of the wordmark. e.g. "friend", "audit log". */
  suffix?: string
}

export function Wordmark({ size = 'compact', as: Tag = 'span', suffix }: WordmarkProps) {
  const isDisplay = size === 'display'
  const sealSize = isDisplay ? 40 : 20
  const textClass = isDisplay ? 'text-display' : 'text-h3'
  const tracking = isDisplay ? '-0.02em' : '-0.015em'
  const gap = isDisplay ? 'gap-4' : 'gap-3'

  return (
    <span className={`inline-flex items-baseline ${gap}`}>
      <Seal size={sealSize} className="text-oxblood self-center" />
      <Tag
        className={`${textClass} font-display text-ink`}
        style={{ letterSpacing: tracking }}
      >
        sovereign mind
      </Tag>
      {suffix && (
        <span
          className="text-micro text-ink-faint uppercase self-center"
          style={{ letterSpacing: '0.14em' }}
        >
          {suffix}
        </span>
      )}
    </span>
  )
}
