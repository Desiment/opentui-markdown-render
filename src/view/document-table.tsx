import { parseColor, TextAttributes, TextTableRenderable, type RenderContext, type RGBA, type TextChunk, type TextTableContent } from "@opentui/core"
import { extend } from "@opentui/solid"
import { resolveTableOptions, type ResolvedTableOptions } from "../core/tables"
import type { Block } from "../core/document"
import { ScrollableTableRenderable } from "./table"
import { toTableChunks } from "./inline-style"
import type { HeadingStyles } from "../headings"
import type { Theme } from "../theme/types"

export type DocumentTableOptions = {
  tableData: TextTableContent
  resolved: ResolvedTableOptions
  foreground: RGBA
  background: RGBA
  tableBorderColor: RGBA
}

export class MarkdownTableRenderable extends ScrollableTableRenderable {
  constructor(ctx: RenderContext, _options?: Partial<DocumentTableOptions> & { id?: string }) {
    const defaults = resolveTableOptions()
    const table = new TextTableRenderable(ctx, {
      content: [],
      columnWidthMode: defaults.widthMode,
      columnFitter: defaults.columnFitter,
      cellPaddingX: defaults.cellPaddingX,
      wrapMode: defaults.wrapMode,
      showBorders: true, border: true, outerBorder: true, borderStyle: "single",
      selectable: true,
    })
    super(ctx, table)
  }

  // The Solid reconciler stringifies every `content` prop. Use a different
  // public setter so TextChunk[][] reaches the OpenTUI table intact.
  get tableData(): TextTableContent { return this.table.content }
  set tableData(value: TextTableContent) {
    this.table.content = value
    this.syncOverflowState()
  }

  get resolved(): ResolvedTableOptions {
    return {
      widthMode: this.table.columnWidthMode,
      columnFitter: this.table.columnFitter,
      cellPaddingX: this.table.cellPaddingX,
      wrapMode: this.table.wrapMode === "none" ? "none" : "word",
      overflow: this.panEnabled ? "scroll" : "wrap",
    }
  }
  set resolved(value: ResolvedTableOptions) {
    this.table.columnWidthMode = value.widthMode
    this.table.columnFitter = value.columnFitter
    this.table.cellPaddingX = value.cellPaddingX
    this.table.wrapMode = value.wrapMode
    this.panEnabled = value.widthMode === "content" && value.overflow === "scroll"
    this.syncOverflowState()
  }

  get foreground(): RGBA { return this.table.fg }
  set foreground(value: RGBA) { this.table.fg = value; this.syncOverflowState() }
  get tableBorderColor(): RGBA { return this.table.borderColor }
  set tableBorderColor(value: RGBA) { this.table.borderColor = value }
  get background(): RGBA { return this.backgroundColor }
  set background(value: RGBA) {
    this.backgroundColor = value
    this.syncOverflowState()
  }
}

// Register once, through the public Solid extension API.
extend({ md_text_table: MarkdownTableRenderable })

declare module "@opentui/solid" {
  interface OpenTUIComponents {
    md_text_table: typeof MarkdownTableRenderable
  }
}

export function TableBlock(props: {
  block: Extract<Block, { type: "table" }>
  options: ResolvedTableOptions
  theme: Theme
  headings: HeadingStyles
  hyperlinks?: boolean
  surface?: () => string
}) {
  const cell = (inlines: readonly import("../core/document").Inline[], header: boolean): TextChunk[] => {
    const chunks = toTableChunks(inlines, props.theme, props.headings, props.hyperlinks)
    if (!header) return chunks
    return chunks.map((chunk) => ({ ...chunk, fg: props.theme.markdown.heading, attributes: TextAttributes.BOLD }))
  }
  const content = (): TextTableContent => [
    props.block.header.map((value) => cell(value.children, true)),
    ...props.block.rows.map((row) => row.map((value) => cell(value.children, false))),
  ]
  return <md_text_table tableData={content()} resolved={props.options}
    foreground={props.theme.markdown.text} background={props.surface ? parseColor(props.surface()) : props.theme.background.base}
    tableBorderColor={props.theme.border.base} />
}
