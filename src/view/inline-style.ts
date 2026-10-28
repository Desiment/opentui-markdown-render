import { TextAttributes, type RGBA, type TextChunk } from "@opentui/core"
import type { HeadingLevel, Theme } from "../theme/types"
import type { HeadingStyles } from "../headings"
import { headingAttributes, headingColor } from "../headings"
import type { Inline } from "../core/document"

export type StyledAtom =
  | { type: "text"; text: string; fg: RGBA; attributes: number; href?: string }
  | { type: "math"; content: string; raw: string; open: string; close: string }
  | { type: "break"; hard: true }

export type InlineStyleContext = {
  theme: Theme
  headings: HeadingStyles
  heading?: { level: HeadingLevel }
  quote?: boolean
  link?: { href: string; title?: string | null }
  attributes?: number
  hyperlinks?: boolean
}

export function flattenInline(inlines: readonly Inline[], ctx: InlineStyleContext): StyledAtom[] {
  const out: StyledAtom[] = []
  const baseAttr = (ctx.attributes ?? 0) |
    (ctx.heading ? headingAttributes(ctx.headings[ctx.heading.level]) : 0) |
    (ctx.quote ? TextAttributes.ITALIC : 0)
  const quote = !!ctx.quote
  const linkCtx = ctx.link

  function walk(list: readonly Inline[], attr: number, link: { href: string; title?: string | null } | undefined) {
    for (const node of list) {
      if (node.type === "text") {
        let fg = ctx.theme.markdown.text
        if (quote && !link && !ctx.heading) fg = ctx.theme.markdown.blockQuote
        if (ctx.heading) fg = headingColor(ctx.theme, ctx.heading.level)
        if (link) fg = ctx.theme.markdown.linkText
        else if (attr & TextAttributes.BOLD && !ctx.heading) fg = ctx.theme.markdown.strong
        else if (attr & TextAttributes.ITALIC && !ctx.heading && !quote) fg = ctx.theme.markdown.emphasis
        if (node.text) out.push({ type: "text", text: node.text, fg, attributes: baseAttr | attr | (link ? TextAttributes.UNDERLINE : 0), href: link?.href })
        continue
      }
      if (node.type === "code") {
        // code has priority styling
        const fg = ctx.theme.markdown.code
        out.push({ type: "text", text: node.text, fg, attributes: TextAttributes.NONE, href: link?.href })
        continue
      }
      if (node.type === "math") {
        out.push({ type: "math", content: node.content, raw: node.raw, open: node.open, close: node.close })
        continue
      }
      if (node.type === "break") {
        out.push({ type: "break", hard: true })
        continue
      }
      if (node.type === "strong") {
        walk(node.children, attr | TextAttributes.BOLD, link)
        continue
      }
      if (node.type === "em") {
        walk(node.children, attr | TextAttributes.ITALIC, link)
        continue
      }
      if (node.type === "del") {
        walk(node.children, attr | TextAttributes.STRIKETHROUGH, link)
        continue
      }
      if (node.type === "link") {
        const l = { href: node.href, title: node.title }
        walk(node.children, attr, l)
        const label = node.children.map((child) => child.type === "text" || child.type === "code" ? child.text : "").join("")
        if (ctx.hyperlinks === false && label !== node.href) {
          out.push({ type: "text", text: ` (${node.href})`, fg: ctx.theme.markdown.link, attributes: baseAttr, href: node.href })
        }
        continue
      }
      if (node.type === "inline-image") {
        const l = link
        // render alt as text with link style
        out.push({ type: "text", text: node.alt || node.href || "image", fg: ctx.theme.markdown.linkText, attributes: baseAttr | attr, href: l?.href || node.href })
        continue
      }
    }
  }

  walk(inlines, baseAttr, linkCtx)
  return out
}

export function toTableChunks(inlines: readonly Inline[], theme: Theme, headings: HeadingStyles, hyperlinks = true): TextChunk[] {
  const chunks: TextChunk[] = []
  for (const atom of flattenInline(inlines, { theme, headings, hyperlinks })) {
    if (atom.type === "text") {
      chunks.push({ __isChunk: true, text: atom.text, fg: atom.fg, attributes: atom.attributes,
        ...(atom.href ? { link: { url: atom.href } } : {}) })
    } else if (atom.type === "math") {
      chunks.push({ __isChunk: true, text: atom.raw, fg: theme.markdown.text })
    } else {
      chunks.push({ __isChunk: true, text: "\n", fg: theme.markdown.text })
    }
  }
  return chunks.length ? chunks : [{ __isChunk: true, text: " ", fg: theme.markdown.text }]
}
