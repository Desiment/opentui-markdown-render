import type { ThemeOverride } from "../theme/types"

// The configuration file is a plain JSON/JSONC object. Every section is
// optional; a missing section keeps the bundled default.
export type MarkdownConfig = {
  // Colour scheme. Mirrors the theme override shape.
  readonly theme?: ThemeOverride
  readonly statusline?: StatusLineConfig
  readonly math?: MathConfig
  readonly images?: ImagesConfig
  readonly mermaid?: MermaidConfig
}

// The status line is a single row of labelled fields. `fields` selects and
// orders them; a field without a value is skipped.
export type StatusLineConfig = {
  readonly enabled?: boolean
  readonly fields?: readonly StatusLineField[]
  readonly separator?: string
  readonly border?: StatusLineBorder
  // "plain" keeps the line in the page colours, "bar" gives it its own
  // background and an accent border.
  readonly style?: StatusLineStyle
  // The field that gets the accent treatment.
  readonly highlight?: StatusLineField
}

export type StatusLineField = "title" | "mode" | "protocol" | "cell" | "mathScale" | "position" | "hint" | "text"

export type StatusLineBorder = "none" | "top" | "bottom"

export type StatusLineStyle = "plain" | "bar"

export const statusLineStyles: readonly StatusLineStyle[] = ["plain", "bar"]

export function isStatusLineStyle(value: unknown): value is StatusLineStyle {
  return typeof value === "string" && statusLineStyles.includes(value as StatusLineStyle)
}

export type MathConfig = {
  // Multiplier for every rendered formula.
  readonly scale?: number
  // Multiplier applied to display math only.
  readonly displayScale?: number
}

export type ImagesConfig = {
  // Maximum width of a rendered image in terminal columns.
  readonly maxColumns?: number
  // Maximum height of a rendered image in terminal rows.
  readonly maxRows?: number
}

export type MermaidConfig = {
  readonly compact?: boolean
  readonly layoutMaxWidth?: number
}

export const statusLineFields: readonly StatusLineField[] = [
  "title",
  "mode",
  "protocol",
  "cell",
  "mathScale",
  "position",
  "hint",
  "text",
]

export function isStatusLineField(value: unknown): value is StatusLineField {
  return typeof value === "string" && statusLineFields.includes(value as StatusLineField)
}
