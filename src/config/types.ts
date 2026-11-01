import type { FrameConfig } from "../core/frame"
import type { TablesConfig } from "../core/tables"
import type { ThemeOverride } from "../theme/types"

// The configuration file is a plain JSON/JSONC object. Every section is
// optional; a missing section keeps the bundled default.
export type MarkdownConfig = {
  // Colour scheme. Mirrors the theme override shape.
  readonly theme?: ThemeOverride
  readonly statusline?: StatusLineConfig
  readonly images?: ImagesConfig
  readonly mermaid?: MermaidConfig
  readonly headings?: HeadingsConfig
  // How the viewer window is drawn around the document.
  readonly frame?: FrameConfig
  // How tables size themselves and what happens when they are too wide.
  readonly tables?: TablesConfig
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

export type ImagesConfig = {
  // Maximum width of a rendered image in terminal columns.
  readonly maxColumns?: number
  // Maximum height of a rendered image in terminal rows.
  readonly maxRows?: number
}

export type MermaidConfig = {
  readonly compact?: boolean
  readonly layoutMaxWidth?: number
  /** Class diagrams only; defaults to the built-in layout. */
  readonly classLayout?: "builtin" | "dagre"
}

// The heading levels are addressed by their number, the way Markdown writes
// them.
export type HeadingLevelKey = "1" | "2" | "3" | "4" | "5" | "6"

// The look of a single heading level. Every option is optional: a missing one
// keeps the bundled default for that level.
export type HeadingLevelConfig = {
  readonly bold?: boolean
  readonly italic?: boolean
  readonly underline?: boolean
  readonly dim?: boolean
  // Render the text of the heading in upper case.
  readonly uppercase?: boolean
  // Empty rows above the heading.
  readonly marginTop?: number
  // Empty rows below the heading.
  readonly marginBottom?: number
}

export type HeadingsConfig = {
  readonly levels?: { readonly [K in HeadingLevelKey]?: HeadingLevelConfig }
}

export const headingLevelKeys: readonly HeadingLevelKey[] = ["1", "2", "3", "4", "5", "6"]

export function isHeadingLevelKey(value: string): value is HeadingLevelKey {
  return (headingLevelKeys as readonly string[]).includes(value)
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
