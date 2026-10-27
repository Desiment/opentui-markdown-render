import { resolveFrame, type FrameConfig, type ResolvedFrame } from "./frame"
import { resolveTableOptions, type ResolvedTableOptions, type TablesConfig } from "./tables"

export type DocumentLayoutInput = {
  // The width the host gives the document, in terminal columns.
  readonly viewport: number
  readonly frame?: FrameConfig
  readonly tables?: TablesConfig
}

// Everything a host needs to size the document without mounting the renderer.
// The frame width and the content width are resolved together so no block can
// disagree about where the right edge is.
export type DocumentLayout = {
  readonly frame: ResolvedFrame
  readonly contentWidth: number
  readonly tables: ResolvedTableOptions
}

export function createDocumentLayout(input: DocumentLayoutInput): DocumentLayout {
  const frame = resolveFrame(input.viewport, input.frame)
  return {
    frame,
    contentWidth: frame.contentWidth,
    tables: resolveTableOptions(input.tables),
  }
}
