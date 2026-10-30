import { Marked, type Token, type Tokens } from "marked"
import { createMathDisplayExtension, createMathInlineExtension, type MathDisplayToken, type MathInlineToken } from "./math"
import type { Block, Document, Inline, SourceRange, TableCell } from "./document"

const parser = new Marked({
  gfm: true,
  breaks: false,
  async: false,
  extensions: [createMathDisplayExtension(), createMathInlineExtension()],
})

type ParserToken = Token | MathDisplayToken | MathInlineToken

function isDisplay(token: ParserToken): token is MathDisplayToken {
  return token.type === "mathDisplay"
}

function isInlineMath(token: ParserToken): token is MathInlineToken {
  return token.type === "mathInline"
}

function childrenOf(token: ParserToken): ParserToken[] {
  return "tokens" in token && Array.isArray(token.tokens) ? token.tokens : []
}

function inlineToken(token: ParserToken): Inline[] {
  if (isInlineMath(token)) {
    return [{ type: "math", content: token.content, raw: token.raw, open: token.open, close: token.close }]
  }
  if (isDisplay(token)) return [{ type: "text", text: token.raw }]
  switch (token.type) {
    case "text":
      return childrenOf(token).length ? convertInline(childrenOf(token)) : [{ type: "text", text: token.text }]
    case "escape":
      return [{ type: "text", text: token.text }]
    case "codespan":
      return [{ type: "code", text: token.text }]
    case "strong":
    case "em":
    case "del":
      return [{ type: token.type, children: convertInline(token.tokens ?? []) }]
    case "link":
      return [{ type: "link", href: token.href, title: token.title ?? null, children: convertInline(token.tokens ?? []) }]
    case "image":
      return [{ type: "inline-image", href: token.href, title: token.title ?? null, alt: token.text }]
    case "br":
      return [{ type: "break", hard: true }]
    case "checkbox":
      return [] // ListItem.task/checked already carry the marker.
    default:
      return token.raw ? [{ type: "text", text: token.raw }] : []
  }
}

function convertInline(tokens: readonly ParserToken[]): Inline[] {
  return tokens.flatMap(inlineToken)
}

function directInline(tokens: readonly ParserToken[]): ParserToken[] {
  // Marked wraps the inline tokens of tight list items in a `text` block.
  return tokens.flatMap((token) => token.type === "text" && childrenOf(token).length ? childrenOf(token) : [token])
}

function convertParagraph(token: ParserToken, source: SourceRange | null): Block[] {
  const tokens = directInline(childrenOf(token))
  const visible = convertInline(tokens).filter((node) => node.type !== "text" || node.text.trim().length > 0)
  if (visible.length === 1 && visible[0].type === "inline-image") {
    const image = visible[0]
    return [{ type: "image", href: image.href, alt: image.alt, title: image.title, raw: token.raw, source }]
  }

  if (!tokens.some(isDisplay)) return [{ type: "paragraph", children: convertInline(tokens), raw: token.raw, source }]

  const blocks: Block[] = []
  let pending: ParserToken[] = []
  // Only direct top-level children with exact raw alignment receive a range;
  // Marked normalizes tokens inside nested quotes and list items.
  let offset = source?.start ?? 0
  let aligned = source !== null
  let pendingStart = offset
  const flush = () => {
    if (!pending.length) return
    const raw = pending.map((child) => child.raw).join("")
    const children = convertInline(pending)
    if (children.length) blocks.push({ type: "paragraph", raw, source: aligned ? { start: pendingStart, end: offset } : null, children })
    pending = []
    pendingStart = offset
  }
  for (const child of tokens) {
    if (aligned && token.raw.slice(offset - source!.start, offset - source!.start + child.raw.length) !== child.raw) aligned = false
    if (isDisplay(child)) {
      flush()
      offset += child.raw.length
      blocks.push({
        type: "display-math", content: child.content, open: child.open, close: child.close,
        raw: child.raw, source: aligned ? { start: offset - child.raw.length, end: offset } : null,
      })
      pendingStart = offset
    } else {
      pending.push(child)
      offset += child.raw.length
    }
  }
  flush()
  return blocks
}

function convertBlocks(tokens: readonly ParserToken[], source: string | null, start = 0): Block[] {
  const blocks: Block[] = []
  let cursor = start
  for (const token of tokens) {
    const range: SourceRange | null = source !== null && source.slice(cursor, cursor + token.raw.length) === token.raw
      ? { start: cursor, end: cursor + token.raw.length }
      : null
    // `space` and `def` are invisible, but still occupy source positions.
    cursor += token.raw.length
    if (token.type === "space" || token.type === "def" || token.type === "checkbox") continue
    if (isDisplay(token)) {
      blocks.push({ type: "display-math", content: token.content, open: token.open, close: token.close, raw: token.raw, source: range })
      continue
    }
    switch (token.type) {
      case "paragraph":
      case "text":
        blocks.push(...convertParagraph(token, range))
        break
      case "heading":
        blocks.push({ type: "heading", level: token.depth as 1 | 2 | 3 | 4 | 5 | 6, children: convertInline(childrenOf(token)), raw: token.raw, source: range })
        break
      case "blockquote":
        blocks.push({ type: "quote", blocks: convertBlocks(childrenOf(token), null), raw: token.raw, source: range })
        break
      case "list": {
        const list = token as Tokens.List
        let cursor = 0
        const items = list.items.map((item) => {
          let itemSource: SourceRange | null = null
          if (range !== null && list.raw.slice(cursor, cursor + item.raw.length) === item.raw) {
            itemSource = { start: range.start + cursor, end: range.start + cursor + item.raw.length }
          }
          cursor += item.raw.length
          return {
            task: item.task, checked: item.task ? (item.checked ?? false) : null, loose: item.loose,
            blocks: convertBlocks(item.tokens, null),
            source: itemSource,
          }
        })
        blocks.push({
          type: "list", raw: list.raw, source: range, ordered: list.ordered,
          start: list.start === "" ? 1 : list.start, loose: list.loose,
          items,
        })
        break
      }
      case "table": {
        const table = token as Tokens.Table
        const convertCell = (cell: Tokens.TableCell | undefined, header: boolean, align: TableCell["align"]): TableCell => ({
          children: cell ? convertInline(cell.tokens) : [], header, align,
        })
        const align = table.align
        const header = table.header.map((cell, i) => convertCell(cell, true, align[i] ?? null))
        const rows = table.rows.map((row) => header.map((_, i) => convertCell(row[i], false, align[i] ?? null)))
        blocks.push({ type: "table", align, header, rows, raw: table.raw, source: range })
        break
      }
      case "code": {
        const language = token.lang ?? null
        if (language?.trim().split(/\s+/)[0]?.toLowerCase() === "mermaid") {
          blocks.push({ type: "mermaid", content: token.text, language: "mermaid", raw: token.raw, source: range })
        } else {
          blocks.push({ type: "code", content: token.text, language, fenced: /^ {0,3}(?:`{3,}|~{3,})/.test(token.raw), raw: token.raw, source: range })
        }
        break
      }
      case "hr":
        blocks.push({ type: "rule", raw: token.raw, source: range })
        break
      default:
        // HTML and unknown extensions are literal, never executed or silently lost.
        if (token.raw) blocks.push({ type: "literal", text: token.raw, raw: token.raw, source: range })
    }
  }
  return blocks
}

export function parseDocument(source: string): Document {
  // Marked token raw text uses LF even for CRLF input. Parse against the same
  // normalized text, then translate proven offsets back into the host's source.
  const normalized = source.replace(/\r\n?/g, "\n")
  const blocks = convertBlocks(parser.lexer(normalized), normalized)
  if (normalized === source) return { source, blocks }

  const offsets: number[] = [0]
  for (let index = 0; index < source.length; index++) {
    if (source[index] === "\r" && source[index + 1] === "\n") index++
    offsets.push(index + 1)
  }
  const originalRange = (range: SourceRange | null): SourceRange | null => range === null ? null
    : { start: offsets[range.start]!, end: offsets[range.end]! }
  const originalBlock = (block: Block): Block => {
    if (block.type === "list") return {
      ...block, source: originalRange(block.source),
      items: block.items.map((item) => ({ ...item, source: originalRange(item.source) })),
    }
    return { ...block, source: originalRange(block.source) }
  }
  return { source, blocks: blocks.map(originalBlock) }
}
