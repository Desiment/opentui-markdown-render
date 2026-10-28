import { BoxRenderable, TextTableRenderable, type RenderContext } from "@opentui/core"
import type { ResolvedTableOptions } from "../core/tables"
import type { Block } from "../core/document"
import { createTableRenderer } from "./table"
import type { TextTableContent } from "@opentui/core"
import { flattenInline } from "./inline-style"
import { defaultHeadingStyles } from "../headings"
import type { Theme } from "../theme/types"

function toTableChunks(inlines: any[], theme: Theme) {
  const atoms = flattenInline(inlines, { theme, headings: defaultHeadingStyles })
  const chunks: any[] = []
  for (const a of atoms) {
    if (a.type === "text") {
      chunks.push({ text: a.text, fg: a.fg, attributes: a.attributes, link: a.href ? { url: a.href } : undefined })
    } else if (a.type === "math") {
      chunks.push({ text: a.raw, fg: theme.markdown.text })
    } else if (a.type === "break") {
      chunks.push({ text: "\n" })
    }
  }
  if (chunks.length === 0) chunks.push({ text: " " })
  return chunks
}

export function TableBlock(props: { block: Block & { type: "table" }; options: ResolvedTableOptions; theme: Theme }) {
  const b = props.block
  const content: TextTableContent = [
    b.header.map((h: any) => toTableChunks(h.children, props.theme)),
    ...b.rows.map((row: any) => row.map((cell: any) => toTableChunks(cell.children, props.theme))),
  ]
  return (
    <md_text_table content={content} resolved={props.options} foreground={props.theme.text.base} background={props.theme.background.base} />
  )
}

export function registerTableRenderable() {
  try {
    // try to extend
    const { extend } = require("@opentui/solid")
    extend({ md_text_table: MarkdownTableRenderable as any })
  } catch (e) {
    // ignore
  }
}

export class MarkdownTableRenderable extends BoxRenderable {
  private table: TextTableRenderable
  constructor(
    ctx: RenderContext,
    options: { content: TextTableContent; resolved: ResolvedTableOptions; foreground: any; background: any },
  ) {
    super(ctx, { width: "100%" })
    this.table = new TextTableRenderable(ctx, {
      content: options.content,
      columnWidthMode: options.resolved.widthMode as any,
      columnFitter: options.resolved.columnFitter as any,
      cellPaddingX: options.resolved.cellPaddingX,
      wrapMode: options.resolved.wrapMode as any,
      showBorders: true,
      border: true,
      outerBorder: true,
      borderStyle: "single",
      selectable: true,
      fg: options.foreground,
      bg: options.background,
    } as any)
    this.add(this.table)
  }
}
