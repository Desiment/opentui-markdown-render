// Table sizing is a layout decision, not a renderer one: the answer is a set of
// options OpenTUI understands, and it can be computed without a render context.
export const tableWidthModes = ["content", "full"] as const

// "content" sizes the columns to the cells, which keeps a two-column table from
// stretching over the whole window. "full" is OpenTUI's grid default.
export type TableWidthMode = (typeof tableWidthModes)[number]

export function isTableWidthMode(value: unknown): value is TableWidthMode {
  return typeof value === "string" && (tableWidthModes as readonly string[]).includes(value)
}

export const tableOverflows = ["scroll", "wrap"] as const

// A table wider than the document either scrolls sideways (like the Mermaid
// diagrams) or wraps its cells to fit.
export type TableOverflow = (typeof tableOverflows)[number]

export function isTableOverflow(value: unknown): value is TableOverflow {
  return typeof value === "string" && (tableOverflows as readonly string[]).includes(value)
}

export const tableColumnFitters = ["proportional", "balanced"] as const

export type TableColumnFitter = (typeof tableColumnFitters)[number]

export function isTableColumnFitter(value: unknown): value is TableColumnFitter {
  return typeof value === "string" && (tableColumnFitters as readonly string[]).includes(value)
}

export type TablesConfig = {
  readonly widthMode?: TableWidthMode
  readonly overflow?: TableOverflow
  readonly columnFitter?: TableColumnFitter
  readonly cellPaddingX?: number
}

export type ResolvedTableOptions = {
  readonly widthMode: TableWidthMode
  readonly overflow: TableOverflow
  readonly columnFitter: TableColumnFitter
  readonly cellPaddingX: number
  // A table that may scroll keeps its intrinsic width. A table that has to fit
  // wraps its cells instead of being clipped at the window edge.
  readonly wrapMode: "none" | "word"
}

export function resolveTableOptions(config?: TablesConfig): ResolvedTableOptions {
  const widthMode = config?.widthMode ?? "content"
  const overflow = config?.overflow ?? "scroll"
  return {
    widthMode,
    overflow,
    columnFitter: config?.columnFitter ?? "balanced",
    cellPaddingX: config?.cellPaddingX ?? 1,
    wrapMode: overflow === "scroll" && widthMode === "content" ? "none" : "word",
  }
}
