import { SyntaxStyle, type RGBA, type ThemeTokenStyle } from "@opentui/core"
import { defaultHeadingStyles, headingColor, headingLevels, type HeadingStyles } from "../headings"
import type { HeadingLevel, Theme } from "./types"

export function generateSyntax(theme: Theme, headings: HeadingStyles = defaultHeadingStyles) {
  const { markdown, syntax, text } = theme
  const feedback = text.feedback

  // A heading level is one colour and one set of attributes, so the levels
  // read as a hierarchy. The scope names are the ones the Markdown parser
  // reports for a heading.
  const headingStyle = (level: HeadingLevel) => {
    const style = headings[level]
    return {
      bold: style.bold,
      italic: style.italic,
      underline: style.underline,
      dim: style.dim,
    }
  }
  const headingRules = headingLevels.map((level) =>
    rule([`markup.heading.${level}`], headingColor(theme, level), headingStyle(level)),
  )

  return SyntaxStyle.fromTheme([
    rule(["default"], text.base),
    rule(["prompt"], theme.accent),
    rule(["comment", "comment.documentation"], syntax.comment, { italic: true }),
    rule(["string", "symbol", "character.special", "character"], syntax.string),
    rule(["number", "boolean", "constant", "float"], syntax.number),
    rule(["keyword.return", "keyword.conditional", "keyword.repeat", "keyword.coroutine"], syntax.keyword, {
      italic: true,
    }),
    rule(["keyword.type"], syntax.type, { bold: true, italic: true }),
    rule(["keyword.function", "function.method"], syntax.function),
    rule(["keyword"], syntax.keyword, { italic: true }),
    rule(["keyword.import", "string.escape", "string.regexp", "tag.attribute", "keyword.export"], syntax.keyword),
    rule(["operator", "keyword.operator", "punctuation.delimiter", "keyword.conditional.ternary"], syntax.operator),
    rule(
      ["variable", "variable.parameter", "function.method.call", "function.call", "property", "parameter", "field"],
      syntax.variable,
    ),
    rule(["variable.member", "function", "constructor"], syntax.function),
    rule(["type", "module", "class", "namespace"], syntax.type),
    rule(["type.definition"], syntax.type, { bold: true }),
    rule(["punctuation", "punctuation.bracket"], syntax.punctuation),
    rule(
      ["variable.builtin", "type.builtin", "function.builtin", "module.builtin", "constant.builtin", "variable.super"],
      feedback.error,
    ),
    rule(["keyword.directive", "keyword.modifier", "keyword.exception"], syntax.keyword, { italic: true }),
    rule(["punctuation.special", "tag.delimiter"], syntax.operator),
    // Every level has its own rule, so the scope the parser reports for a
    // heading decides how it looks. The generic scope is the fallback for a
    // heading whose level the parser did not report.
    rule(["markup.heading"], headingColor(theme, 1), headingStyle(1)),
    ...headingRules,
    rule(["markup.bold", "markup.strong"], markdown.strong, { bold: true }),
    rule(["markup.italic"], markdown.emphasis, { italic: true }),
    // List markers read as body text: a bullet or number should not compete with
    // the prose it introduces, whatever a host theme sets `listItem` to.
    rule(["markup.list"], markdown.text),
    rule(["markup.list.enumeration"], markdown.text),
    rule(["markup.quote"], markdown.blockQuote, { italic: true }),
    rule(["markup.raw", "markup.raw.block"], markdown.code),
    rule(["markup.raw.inline"], markdown.code, { background: theme.background.base }),
    rule(["markup.link", "markup.link.url", "string.special", "string.special.url"], markdown.link, {
      underline: true,
    }),
    rule(["markup.link.label"], markdown.linkText, { underline: true }),
    rule(["label"], markdown.linkText),
    rule(["markup.underline"], text.base, { underline: true }),
    rule(["markup.strikethrough", "markup.list.unchecked", "debug"], text.muted),
    rule(["markup.list.checked"], feedback.success),
    rule(["comment.error"], feedback.error, { italic: true, bold: true }),
    rule(["comment.warning"], feedback.warning, { italic: true, bold: true }),
    rule(["comment.todo", "comment.note"], feedback.info, { italic: true, bold: true }),
    rule(["attribute", "annotation"], feedback.warning),
    rule(["tag"], feedback.error),
    rule(["diff.plus"], theme.diff.text.added, { background: theme.diff.background.added }),
    rule(["diff.minus"], theme.diff.text.removed, { background: theme.diff.background.removed }),
    rule(["diff.delta"], theme.diff.text.context, { background: theme.diff.background.context }),
    rule(["error"], feedback.error, { bold: true }),
    rule(["warning"], feedback.warning, { bold: true }),
    rule(["info"], feedback.info),
  ])
}

function rule(
  scope: string[],
  foreground: RGBA,
  style: Omit<ThemeTokenStyle["style"], "foreground"> = {},
): ThemeTokenStyle {
  return { scope, style: { foreground, ...style } }
}
