import { BoxRenderable, CodeRenderable, StyledText, TextRenderable, type MarkdownOptions, type RenderContext, type Renderable, type RGBA } from "@opentui/core"
import type { Theme } from "../theme/types"
import { generateSyntax } from "../theme/syntax"

type ListToken = Extract<Parameters<NonNullable<MarkdownOptions["renderNode"]>>[0], { type: "list" }>

function isListToken(value: unknown): value is ListToken {
  return typeof value === "object" && value !== null && "type" in value && value.type === "list" &&
    "items" in value && Array.isArray(value.items) && "ordered" in value && typeof value.ordered === "boolean"
}

function colorListMarkers(list: BoxRenderable, token: ListToken, color: RGBA) {
  for (const [index, item] of token.items.entries()) {
    const row = list.getChildren()[index]
    if (!(row instanceof BoxRenderable)) continue
    const children = row.getChildren()
    const marker = children[0]
    if (token.ordered && marker instanceof TextRenderable) {
      marker.content = new StyledText(marker.chunks.map((chunk) => ({ ...chunk, fg: color })))
    }
    const content = children[1]
    if (!(content instanceof BoxRenderable)) continue
    // OpenTUI's list items render each non-space token as one content child;
    // descend into nested lists without disturbing their wrapping or layout.
    const visible = item.tokens.filter((child) => child.type !== "checkbox" && child.type !== "space")
    for (const [childIndex, childToken] of visible.entries()) {
      const child = content.getChildren()[childIndex]
      if (isListToken(childToken) && child instanceof BoxRenderable) colorListMarkers(child, childToken, color)
    }
  }
}

// OpenTUI renders horizontal rules as boxes and uses the same syntax scope for
// both kinds of list marker. Decorate its default nodes rather than copying its
// Markdown parser or reimplementing list layout.
export function createMarkdownStyleRenderer(ctx: RenderContext, theme: () => Theme): NonNullable<MarkdownOptions["renderNode"]> {
  // Returning the default renderable allows OpenTUI to reconcile it in place,
  // which resets our colours. A wrapper makes styled nodes replaceable while
  // preserving the default node's parsing and layout.
  const wrap = (node: Renderable) => {
    const box = new BoxRenderable(ctx, { width: "100%", flexDirection: "column", flexShrink: 0 })
    box.add(node)
    return box
  }
  return (token, context) => {
    if (token.type === "hr") {
      const rule = context.defaultRender()
      if (!(rule instanceof BoxRenderable)) return undefined
      rule.borderColor = theme().markdown.horizontalRule
      return wrap(rule)
    }
    if (token.type === "code") {
      const code = context.defaultRender()
      if (!(code instanceof CodeRenderable)) return undefined
      code.fg = theme().markdown.codeBlock
      // CodeRenderable uses the SyntaxStyle default for unhighlighted text,
      // which wins over fg. Keep language-specific syntax colours unchanged.
      code.syntaxStyle = generateSyntax(theme(), undefined, theme().markdown.codeBlock)
      return wrap(code)
    }
    if (isListToken(token) && !theme().markdown.listEnumeration.equals(theme().markdown.listItem)) {
      const list = context.defaultRender()
      if (!(list instanceof BoxRenderable)) return undefined
      colorListMarkers(list, token, theme().markdown.listEnumeration)
      return wrap(list)
    }
    return undefined
  }
}
