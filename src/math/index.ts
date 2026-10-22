import { createHash } from "node:crypto"
import type { RGBA } from "@opentui/core"
import type { CellSize } from "../graphics"
import { renderMath } from "./renderer"
import { isRenderableLatex } from "./validate"

export type { CellSize } from "../graphics"

export type MathImage = {
  readonly png: Uint8Array
  readonly columns: number
  readonly rows: number
  readonly baseline: number
  // Whether the raster was scaled below the standard text size to fit a single
  // text row. A formula that was not scaled can keep that size.
  readonly clamped: boolean
}

export function rgbaToHex(color: RGBA) {
  const channel = (value: number) =>
    Math.round(Math.max(0, Math.min(1, value)) * 255)
      .toString(16)
      .padStart(2, "0")
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`
}

export function mathImageID(
  content: string,
  display: boolean,
  color: string,
  cell: CellSize | null,
  scale = 1,
  compact = false,
  standard = false,
) {
  return createHash("sha256")
    .update(JSON.stringify({ content, display, color, cell, scale, compact, standard, renderer: "mitex-typst-png-v2" }))
    .digest("hex")
}

// The Typst page is laid out at 12pt, so a scale of `px / 12` puts one em at one
// terminal cell height: the same text size the port reference targets with its
// `textColumns = 2` / cell-aspect-ratio model. `scale` is only the caller's own
// enlargement (`+`/`-`) on top of that text-relative base.
const fontSizePoints = 12

// The native renderer produces a tight page whose frame baseline is known, so a
// formula maps onto a cell box without any of the padding the SVG path needed.
export async function renderMathImage(
  content: string,
  display: boolean,
  color: string,
  background: string,
  cell: CellSize | null,
  scale = 1,
  compact = false,
  standard = false,
): Promise<MathImage | undefined> {
  // A formula that Typst would happily accept as a truncated expression (a
  // trailing `\frac{1}{`, say) is not a formula an author meant to typeset, so
  // it falls back to its source rather than rendering a mis-shaped image.
  const latex = content.trim()
  if (!isRenderableLatex(latex)) return undefined
  const cellWidth = cell?.width ?? 8
  const cellHeight = cell?.height ?? 16
  const base = cellHeight / fontSizePoints
  // The native raster is padded to an exact whole-cell box, so the source and the
  // cell box share an aspect ratio and `fit` draws it 1:1 instead of stretching
  // the ink to fill the box.
  const rendered = await renderMath({
    latex,
    foreground: color,
    background,
    scale: base * scale,
    display,
    cellWidth,
    cellHeight,
    compact,
    standard,
  })
  if (!rendered) return undefined
  const columns = Math.max(1, Math.round(rendered.pixelWidth / cellWidth))
  const rows = Math.max(1, Math.round(rendered.pixelHeight / cellHeight))
  const baseline = rendered.baseline / cellHeight
  return { png: rendered.png, columns, rows, baseline, clamped: rendered.clamped }
}
