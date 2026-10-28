import { TextAttributes, type RGBA } from "@opentui/core"
import type { HeadingLevel, Theme } from "../theme/types"
import type { HeadingStyles } from "../headings"
import { headingColor } from "../headings"
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
}

function mergeAttributes(a: number, b: number) {
  return a | b
}

export function flattenInline(inlines: readonly Inline[], ctx: InlineStyleContext): StyledAtom[] {
  const out: StyledAtom[] = []
  const baseAttr = ctx.attributes || 0
  const quote = !!ctx.quote
  const linkCtx = ctx.link

  const pushText = (text: string, extraAttr: number, extraLink?: { href: string }) => {
    if (text.length === 0) return
    let fg = ctx.theme.markdown.text
    if (quote) fg = ctx.theme.markdown.blockQuote
    if (ctx.heading) {
      fg = headingColor(ctx.theme, ctx.heading.level)
    }
    if (linkCtx || extraLink) {
      fg = ctx.theme.markdown.linkText
    }
    const href = extraLink?.href || linkCtx?.href
    out.push({ type: "text", text, fg, attributes: baseAttr | extraAttr, href })
  }

  function walk(list: readonly Inline[], attr: number, link: { href: string; title?: string | null } | undefined) {
    for (const node of list) {
      if (node.type === "text") {
        let fg = ctx.theme.markdown.text
        if (quote && !link && !ctx.heading) fg = ctx.theme.markdown.blockQuote
        if (ctx.heading) fg = headingColor(ctx.theme, ctx.heading.level)
        if (link) fg = ctx.theme.markdown.linkText
        out.push({ type: "text", text: node.text, fg, attributes: baseAttr | attr, href: link?.href })
        continue
      }
      if (node.type === "code") {
        // code has priority styling
        const fg = ctx.theme.markdown.codeBlock
        out.push({ type: "text", text: node.text, fg, attributes: 0, href: link?.href })
        continue
      }
      if (node.type === "math") {
        // math will be handled by inline flow; represent as special marker? but inline flow needs atoms
        // push text marker not needed, but better to include structure - we'll handle separately
        out.push({ type: "math", content: node.content, raw: node.raw, open: node.open, close: node.close })
        continue
      }
      if (node.type === "break") {
        out.push({ type: "break", hard: true })
        continue
      }
      if (node.type === "strong") {
        walk(node.children, mergeAttributes(attr, TextAttributes.BOLD), link)
        continue
      }
      if (node.type === "em") {
        walk(node.children, mergeAttributes(attr, TextAttributes.ITALIC), link)
        continue
      }
      if (node.type === "del") {
        // if strikethrough not present, use muted
        const delAttr = (TextAttributes as any).STRIKETHROUGH || TextAttributes.BOLD
        walk(node.children, mergeAttributes(attr, delAttr), link)
        continue
      }
      if (node.type === "link") {
        const l = { href: node.href, title: node.title }
        walk(node.children, attr, l)
        continue
      }
      if (node.type === "inline-image") {
        const l = link
        // render alt as text with link style
        out.push({ type: "text", text: node.alt || node.href || "", fg: l ? ctx.theme.markdown.linkText : ctx.theme.markdown.imageText, attributes: baseAttr | attr, href: l?.href || node.href })
        continue
      }
    }
  }

  walk(inlines, baseAttr, linkCtx)
  return out
}
