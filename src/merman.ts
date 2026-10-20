import type { MarkdownOptions, RenderContext } from "@opentui/core"
import { createMermaidMarkdownRenderer } from "./merman/markdown"
import { resolveOpenCodeDiagramPalette } from "./merman/palette"
import type { Theme } from "./theme/types"

export { detectMermaidDiagram } from "./merman/detect"
export { MermaidSyntaxError, type MermaidDiagramKind } from "./merman/diagnostics"
export { createOpenCodeDiagramPalette, resolveOpenCodeDiagramPalette, type OpenCodeDiagramPalette } from "./merman/palette"

export type MermaidOptions = {
  readonly theme: () => Theme
  readonly compact?: boolean
  readonly layoutMaxWidth?: number
}

// The Mermaid engine renders terminal cells itself; the theme only supplies the
// palette so diagrams follow the Markdown and math surfaces around them.
export function createThemedMermaidRenderer(
  ctx: RenderContext,
  options: MermaidOptions,
): NonNullable<MarkdownOptions["renderNode"]> {
  return createMermaidMarkdownRenderer(ctx, () => ({
    compact: options.compact,
    layoutMaxWidth: options.layoutMaxWidth,
    colors: resolveOpenCodeDiagramPalette(options.theme()),
  }))
}
