// The pure core: parsing, frame geometry and layout policy. Nothing here
// imports OpenTUI or Solid, so a host can use these without a renderer.
export { scanDocument, parseInlineRuns, standaloneImage } from "./blocks"
export type {
  CanvasBlock,
  CanvasSource,
  FlowBlock,
  FlowItem,
  InlineMathRun,
  InlineRun,
  InlineStyle,
  MarkdownImage,
} from "./blocks"
export { resolveFrame, frameAligns, frameStyles, isFrameAlign, isFrameStyle } from "./frame"
export type { FrameAlign, FrameConfig, FrameInsets, FrameStyle, ResolvedFrame } from "./frame"
export {
  resolveTableOptions,
  tableWidthModes,
  tableOverflows,
  tableColumnFitters,
  isTableWidthMode,
  isTableOverflow,
  isTableColumnFitter,
} from "./tables"
export type {
  ResolvedTableOptions,
  TableColumnFitter,
  TableOverflow,
  TableWidthMode,
  TablesConfig,
} from "./tables"
export { createDocumentLayout } from "./layout"
export type { DocumentLayout, DocumentLayoutInput } from "./layout"
