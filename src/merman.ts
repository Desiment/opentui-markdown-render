import type { MarkdownOptions, RenderContext } from "@opentui/core"
import { createMermaidMarkdownRenderer } from "./merman/markdown"
import { resolveOpenCodeDiagramPalette } from "./merman/palette"
import type { Theme } from "./theme/types"

export { detectMermaidDiagram } from "./merman/detect"
export { MermaidSyntaxError, type MermaidDiagramKind } from "./merman/diagnostics"
export { createOpenCodeDiagramPalette, resolveOpenCodeDiagramPalette, type OpenCodeDiagramPalette } from "./merman/palette"

export type MermaidOptions = {
  readonly theme: () => Theme
  readonly compact?: boolean | (() => boolean | undefined)
  readonly layoutMaxWidth?: number | (() => number | undefined)
}

// The Mermaid engine renders terminal cells itself; the theme only supplies the
// palette so diagrams follow the Markdown and math surfaces around them.
export function createThemedMermaidRenderer(
  ctx: RenderContext,
  options: MermaidOptions,
): NonNullable<MarkdownOptions["renderNode"]> {
  const value = <T>(input: T | (() => T | undefined) | undefined): T | undefined =>
    typeof input === "function" ? (input as () => T | undefined)() : input
  return createMermaidMarkdownRenderer(ctx, () => ({
    compact: value(options.compact),
    layoutMaxWidth: value(options.layoutMaxWidth),
    colors: resolveOpenCodeDiagramPalette(options.theme()),
  }))
}
