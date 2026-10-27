import type { ThemeOverride } from "../theme/types"
import type { ConfigReporter } from "./load"

// A JSON file only carries strings, not RGBA instances. OpenTUI accepts these
// colour names and hex forms; rejecting anything else here avoids its silent
// magenta fallback for misspelled colours.
const colorNames = new Set([
  "transparent", "black", "white", "red", "green", "blue", "yellow", "cyan", "magenta",
  "silver", "gray", "grey", "maroon", "olive", "lime", "aqua", "teal", "navy",
  "fuchsia", "purple", "orange", "brightblack", "brightred", "brightgreen",
  "brightblue", "brightyellow", "brightcyan", "brightmagenta", "brightwhite",
])

type Field = "color" | "mode" | "colors" | { readonly [key: string]: Field }
const colors = <K extends string>(keys: readonly K[]): Record<K, Field> =>
  Object.fromEntries(keys.map((key) => [key, "color"])) as Record<K, Field>

// The allowlist follows ThemeOverride, not the resolved Theme: headingLevels
// is an internal six-colour array, while heading1..heading6 are file options.
const themeFields: Record<string, Field> = {
  mode: "mode",
  accent: "color",
  categorical: "colors",
  text: {
    base: "color",
    muted: "color",
    feedback: colors(["error", "warning", "success", "info"]),
    action: { primary: { focused: "color" } },
  },
  background: { base: "color" },
  border: { base: "color" },
  frame: colors(["border", "title"]),
  statusline: colors(["background", "foreground", "title", "muted", "border"]),
  markdown: colors([
    "text", "heading", "heading1", "heading2", "heading3", "heading4", "heading5", "heading6",
    "link", "linkText", "code", "blockQuote", "emphasis", "strong", "horizontalRule",
    "listItem", "listEnumeration", "image", "imageText", "codeBlock",
  ]),
  syntax: colors(["comment", "keyword", "function", "variable", "string", "number", "type", "operator", "punctuation"]),
  diff: {
    text: colors(["added", "removed", "context"]),
    background: colors(["added", "removed", "context"]),
  },
}

function isColor(value: unknown): value is string {
  return typeof value === "string" && (
    /^#?(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ||
    colorNames.has(value.toLowerCase())
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function validateTheme(value: Record<string, unknown>, file: string, report?: ConfigReporter): ThemeOverride {
  const warn = (message: string) => {
    if (report) report(message)
    else console.warn(`[opentui-markdown-render] ${message}`)
  }
  const validate = (source: Record<string, unknown>, fields: Record<string, Field>, prefix: string): Record<string, unknown> => {
    const result: Record<string, unknown> = Object.create(null)
    for (const [key, entry] of Object.entries(source)) {
      const field = Object.hasOwn(fields, key) ? fields[key] : undefined
      const location = `${prefix}.${key}`
      if (field === undefined) {
        warn(`Unknown theme option "${location}" in ${file}`)
        continue
      }
      if (field === "color" && isColor(entry)) result[key] = entry
      else if (field === "mode" && (entry === "light" || entry === "dark")) result[key] = entry
      else if (field === "colors" && Array.isArray(entry)) {
        result[key] = entry.filter((color, index) => {
          if (isColor(color)) return true
          warn(`Invalid theme option "${location}[${index}]" in ${file}`)
          return false
        })
      } else if (typeof field === "object" && isRecord(entry)) {
        result[key] = validate(entry, field, location)
      } else {
        warn(`Invalid theme option "${location}" in ${file}`)
      }
    }
    return result
  }
  return validate(value, themeFields, "theme") as ThemeOverride
}
