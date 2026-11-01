import { TextAttributes, type RGBA } from "@opentui/core"
import type { HeadingLevelConfig, HeadingsConfig } from "./config/types"
import type { HeadingLevel, Theme } from "./theme/types"

// A terminal has a single text size, so a heading level is expressed through
// attributes, colour and spacing instead of a larger font.
export type HeadingStyle = {
  readonly bold: boolean
  readonly italic: boolean
  readonly underline: boolean
  readonly dim: boolean
  readonly uppercase: boolean
  // Empty rows above the heading.
  readonly marginTop: number
  // Empty rows below the heading.
  readonly marginBottom: number
}

export type HeadingStyles = Record<HeadingLevel, HeadingStyle>

export const headingLevels: readonly HeadingLevel[] = [1, 2, 3, 4, 5, 6]

// The bundled look: the top level is the loudest one, the lowest levels fade
// into the prose around them.
export const defaultHeadingStyles: HeadingStyles = {
  1: { bold: true, italic: false, underline: true, dim: false, uppercase: false, marginTop: 2, marginBottom: 1 },
  2: { bold: true, italic: false, underline: false, dim: false, uppercase: false, marginTop: 1, marginBottom: 0 },
  3: { bold: true, italic: false, underline: false, dim: false, uppercase: false, marginTop: 1, marginBottom: 0 },
  4: { bold: false, italic: true, underline: false, dim: false, uppercase: false, marginTop: 1, marginBottom: 0 },
  5: { bold: false, italic: true, underline: false, dim: true, uppercase: false, marginTop: 1, marginBottom: 0 },
  6: { bold: false, italic: false, underline: false, dim: true, uppercase: false, marginTop: 1, marginBottom: 0 },
}

// The configuration only carries the options the author set, so the rest of the
// style keeps the bundled default of that level.
function mergeHeadingStyle(base: HeadingStyle, override: HeadingLevelConfig | undefined): HeadingStyle {
  if (!override) return base
  return {
    bold: override.bold ?? base.bold,
    italic: override.italic ?? base.italic,
    underline: override.underline ?? base.underline,
    dim: override.dim ?? base.dim,
    uppercase: override.uppercase ?? base.uppercase,
    marginTop: override.marginTop ?? base.marginTop,
    marginBottom: override.marginBottom ?? base.marginBottom,
  }
}

export function resolveHeadingStyles(config?: HeadingsConfig): HeadingStyles {
  const styles = {} as HeadingStyles
  for (const level of headingLevels) {
    styles[level] = mergeHeadingStyle(defaultHeadingStyles[level], config?.levels?.[`${level}` as "1"])
  }
  return styles
}

export function headingAttributes(style: HeadingStyle): number {
  let attributes = TextAttributes.NONE
  if (style.bold) attributes |= TextAttributes.BOLD
  if (style.italic) attributes |= TextAttributes.ITALIC
  if (style.underline) attributes |= TextAttributes.UNDERLINE
  if (style.dim) attributes |= TextAttributes.DIM
  return attributes
}

export function headingColor(theme: Theme, level: HeadingLevel): RGBA {
  // A theme that was built by hand may not carry the ramp; the base heading
  // colour is the fallback then.
  return theme.markdown.headingLevels?.[level - 1] ?? theme.markdown.heading
}

// The level of a heading that came from a document is always one of the six,
// but a host that builds a block by hand may pass any number.
export function headingLevel(level: number): HeadingLevel {
  const value = Math.min(6, Math.max(1, Math.round(level)))
  return value as HeadingLevel
}
