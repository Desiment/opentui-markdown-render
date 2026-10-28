import { Marked } from "marked"
import { createMathDisplayExtension, createMathInlineExtension } from "./math"
import type { Block, Document, Inline, ListItem, SourceRange, TableCell } from "./document"

function isMermaidLanguage(lang: string | null | undefined): boolean {
  if (!lang) return false
  const first = lang.trim().split(/\s+/)[0]?.toLowerCase()
  return first === "mermaid"
}

function createParser() {
  const m = new Marked({
    gfm: true,
    breaks: false,
    async: false,
    extensions: [createMathDisplayExtension() as any, createMathInlineExtension() as any],
  })
  return m
}

const parser = createParser()

function makeRange(source: string, raw: string, cursor: { v: number }): SourceRange | null {
  if (!raw) return null
  if (cursor.v + raw.length <= source.length && source.slice(cursor.v, cursor.v + raw.length) === raw) {
    const start = cursor.v
    cursor.v += raw.length
    return { start, end: cursor.v }
  }
  // try to advance
  if (cursor.v + raw.length <= source.length) {
    const start = cursor.v
    cursor.v += raw.length
    return null
  }
  cursor.v += raw.length
  return null
}

function convertInlineToken(t: any): Inline[] {
  if (!t) return []
  if (t.type === "mathInline") {
    return [
      {
        type: "math",
        content: t.content || "",
        open: t.open === "\\(" ? "\\(" : "$",
        close: t.close === "\\)" ? "\\)" : "$",
        raw: t.raw || "",
      },
    ]
  }
  if (t.type === "mathDisplay") {
    return [{ type: "text", text: t.raw || t.text || "" }]
  }
  if (t.type === "text") {
    if (Array.isArray(t.tokens) && t.tokens.length > 0) {
      const out: Inline[] = []
      for (const child of t.tokens) {
        out.push(...convertInlineToken(child))
      }
      return out
    }
    return [{ type: "text", text: t.text || "" }]
  }
  if (t.type === "escape") {
    return [{ type: "text", text: t.text || "" }]
  }
  if (t.type === "codespan") {
    return [{ type: "code", text: t.text || "" }]
  }
  if (t.type === "strong") {
    const children: Inline[] = []
    if (Array.isArray(t.tokens)) {
      for (const c of t.tokens) children.push(...convertInlineToken(c))
    } else if (t.text) {
      children.push({ type: "text", text: t.text })
    }
    return [{ type: "strong", children }]
  }
  if (t.type === "em") {
    const children: Inline[] = []
    if (Array.isArray(t.tokens)) {
      for (const c of t.tokens) children.push(...convertInlineToken(c))
    } else if (t.text) {
      children.push({ type: "text", text: t.text })
    }
    return [{ type: "em", children }]
  }
  if (t.type === "del") {
    const children: Inline[] = []
    if (Array.isArray(t.tokens)) {
      for (const c of t.tokens) children.push(...convertInlineToken(c))
    } else if (t.text) {
      children.push({ type: "text", text: t.text })
    }
    return [{ type: "del", children }]
  }
  if (t.type === "link") {
    const children: Inline[] = []
    if (Array.isArray(t.tokens)) {
      for (const c of t.tokens) children.push(...convertInlineToken(c))
    } else if (t.text) {
      children.push({ type: "text", text: t.text })
    }
    return [{ type: "link", href: t.href || "", title: t.title || null, children }]
  }
  if (t.type === "image") {
    return [{ type: "inline-image", href: t.href || "", alt: t.text || t.alt || "", title: t.title || null }]
  }
  if (t.type === "br") {
    return [{ type: "break", hard: true }]
  }
  if (t.type === "html") {
    return [{ type: "text", text: t.text || t.raw || "" }]
  }
  if (t.raw) return [{ type: "text", text: t.raw }]
  if (t.text) return [{ type: "text", text: t.text }]
  return []
}

function collectInlineFromTokens(tokens: any[]): Inline[] {
  const out: Inline[] = []
  if (!Array.isArray(tokens)) return out
  for (const t of tokens) {
    if (t.type === "text" && Array.isArray(t.tokens) && t.tokens.length > 0) {
      for (const c of t.tokens) {
        out.push(...convertInlineToken(c))
      }
      continue
    }
    out.push(...convertInlineToken(t))
  }
  return out
}

function convertBlocks(tokens: any[], source: string, cursor: { v: number }): Block[] {
  const blocks: Block[] = []
  if (!Array.isArray(tokens)) return blocks
  for (const token of tokens) {
    if (token.type === "space" || token.type === "def") {
      if (token.raw) cursor.v += token.raw.length
      continue
    }
    if (token.type === "paragraph") {
      const pTokens = token.tokens || []
      // check for standalone image
      const meaningful = pTokens.filter((pt: any) => {
        if (pt.type === "text") {
          const txt = pt.text || ""
          if (txt.trim() === "") return false
          return true
        }
        return true
      })
      if (meaningful.length === 1 && meaningful[0].type === "image") {
        const img = meaningful[0]
        const raw = token.raw || ""
        const srcRange = makeRange(source, raw, cursor)
        blocks.push({ type: "image", href: img.href || "", alt: img.text || img.alt || "", title: img.title || null, raw, source: srcRange })
        continue
      }
      // check display math
      let hasDirectDisplay = false
      for (const pt of pTokens) {
        if (pt.type === "mathDisplay") {
          hasDirectDisplay = true
          break
        }
        if (pt.type === "text" && Array.isArray(pt.tokens)) {
          for (const c of pt.tokens) {
            if (c.type === "mathDisplay") {
              hasDirectDisplay = true
              break
            }
          }
          if (hasDirectDisplay) break
        }
      }
      if (hasDirectDisplay) {
        let buffer: any[] = []
        for (const pt of pTokens) {
          if (pt.type === "mathDisplay") {
            if (buffer.length > 0) {
              const children = collectInlineFromTokens(buffer)
              blocks.push({ type: "paragraph", children, raw: token.raw || "", source: null })
              buffer = []
            }
            blocks.push({
              type: "display-math",
              content: pt.content || "",
              open: pt.open === "\\[" ? "\\[" : "$$",
              close: pt.close === "\\]" ? "\\]" : "$$",
              raw: pt.raw || "",
              source: null,
            })
            continue
          }
          if (pt.type === "text" && Array.isArray(pt.tokens)) {
            let hasDisp = pt.tokens.some((c: any) => c.type === "mathDisplay")
            if (hasDisp) {
              let innerBuf: any[] = []
              for (const c of pt.tokens) {
                if (c.type === "mathDisplay") {
                  if (innerBuf.length > 0) {
                    const children = collectInlineFromTokens([{ type: "text", tokens: innerBuf }])
                    blocks.push({ type: "paragraph", children, raw: token.raw || "", source: null })
                    innerBuf = []
                  }
                  blocks.push({
                    type: "display-math",
                    content: c.content || "",
                    open: c.open === "\\[" ? "\\[" : "$$",
                    close: c.close === "\\]" ? "\\]" : "$$",
                    raw: c.raw || "",
                    source: null,
                  })
                  continue
                }
                innerBuf.push(c)
              }
              if (innerBuf.length > 0) {
                const children = collectInlineFromTokens([{ type: "text", tokens: innerBuf }])
                blocks.push({ type: "paragraph", children, raw: token.raw || "", source: null })
              }
              continue
            } else {
              buffer.push(pt)
              continue
            }
          }
          buffer.push(pt)
        }
        if (buffer.length > 0) {
          const children = collectInlineFromTokens(buffer)
          blocks.push({ type: "paragraph", children, raw: token.raw || "", source: makeRange(source, token.raw || "", cursor) })
        }
        continue
      }
      const children = collectInlineFromTokens(pTokens)
      const raw = token.raw || ""
      const srcRange = makeRange(source, raw, cursor)
      blocks.push({ type: "paragraph", children, raw, source: srcRange })
      continue
    }
    if (token.type === "heading") {
      const children = collectInlineFromTokens(token.tokens || [])
      const raw = token.raw || ""
      const srcRange = makeRange(source, raw, cursor)
      blocks.push({ type: "heading", level: token.depth || 1, children, raw, source: srcRange })
      continue
    }
    if (token.type === "blockquote") {
      const innerBlocks = convertBlocks(token.tokens || [], source, cursor)
      const raw = token.raw || ""
      const srcRange = makeRange(source, raw, cursor)
      blocks.push({ type: "quote", blocks: innerBlocks, raw, source: srcRange })
      continue
    }
    if (token.type === "list") {
      const items: ListItem[] = []
      if (Array.isArray(token.items)) {
        for (const it of token.items) {
          const blocks = convertBlocks(it.tokens || [], source, cursor)
          items.push({
            task: !!it.task,
            checked: it.checked === true ? true : it.checked === false ? false : null,
            loose: !!it.loose,
            blocks,
          })
        }
      }
      const raw = token.raw || ""
      const srcRange = makeRange(source, raw, cursor)
      blocks.push({
        type: "list",
        ordered: !!token.ordered,
        start: typeof token.start === "number" ? token.start : token.start === "" || token.start === undefined ? 1 : Number(token.start) || 1,
        loose: !!token.loose,
        items,
        raw,
        source: srcRange,
      })
      continue
    }
    if (token.type === "table") {
      const alignArr: (null | "left" | "center" | "right")[] = []
      if (Array.isArray(token.align)) {
        for (const a of token.align) {
          if (a === "left" || a === "center" || a === "right") alignArr.push(a)
          else alignArr.push(null)
        }
      }
      const header: TableCell[] = []
      if (Array.isArray(token.header)) {
        for (let i = 0; i < token.header.length; i++) {
          const c = token.header[i]
          const children = collectInlineFromTokens(c.tokens || [])
          header.push({ children, header: true, align: alignArr[i] || null })
        }
      }
      const rows: TableCell[][] = []
      if (Array.isArray(token.rows)) {
        for (const row of token.rows) {
          const cells: TableCell[] = []
          const rowArr = Array.isArray(row) ? row : []
          for (let i = 0; i < header.length; i++) {
            const c = rowArr[i]
            if (!c) {
              cells.push({ children: [], header: false, align: alignArr[i] || null })
              continue
            }
            const children = collectInlineFromTokens(c.tokens || [])
            cells.push({ children, header: false, align: alignArr[i] || null })
          }
          rows.push(cells)
        }
      }
      const raw = token.raw || ""
      const srcRange = makeRange(source, raw, cursor)
      blocks.push({ type: "table", align: alignArr, header, rows, raw, source: srcRange })
      continue
    }
    if (token.type === "code") {
      const lang = token.lang || null
      const content = token.text || ""
      if (isMermaidLanguage(lang)) {
        const raw = token.raw || ""
        const srcRange = makeRange(source, raw, cursor)
        blocks.push({ type: "mermaid", content, language: (lang?.trim().split(/\s+/)[0]) || "mermaid", raw, source: srcRange })
        continue
      }
      const raw = token.raw || ""
      const srcRange = makeRange(source, raw, cursor)
      blocks.push({ type: "code", language: lang, content, fenced: true, raw, source: srcRange })
      continue
    }
    if (token.type === "hr") {
      const raw = token.raw || ""
      const srcRange = makeRange(source, raw, cursor)
      blocks.push({ type: "rule", raw, source: srcRange })
      continue
    }
    if (token.type === "html") {
      const raw = token.raw || token.text || ""
      const srcRange = makeRange(source, raw, cursor)
      blocks.push({ type: "literal", text: raw, raw, source: srcRange })
      continue
    }
    const raw = token.raw || ""
    if (raw) {
      const srcRange = makeRange(source, raw, cursor)
      blocks.push({ type: "literal", text: raw, raw, source: srcRange })
      continue
    }
  }
  return blocks
}

export function parseDocument(source: string): Document {
  const tokens = (parser.lexer(source) as any[]) || []
  const cursor = { v: 0 }
  const blocks = convertBlocks(tokens, source, cursor)
  return { source, blocks }
}
