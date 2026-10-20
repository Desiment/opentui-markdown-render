import { describe, expect, test } from "bun:test"
import { defaultTheme, generateSyntax, mergeTheme, parseThemeConfig, resolveTheme } from "../src/theme"

describe("theme resolution", () => {
  test("merges a partial override over the bundled default for the mode", () => {
    const theme = resolveTheme({ mode: "light", override: { markdown: { heading: "#123456" } } })
    expect(theme.mode).toBe("light")
    expect(theme.markdown.heading.toInts()).toEqual([18, 52, 86, 255])
    expect(theme.markdown.text).toEqual(defaultTheme("light").markdown.text)
  })

  test("uses the override mode when the setting is auto", () => {
    const theme = mergeTheme(defaultTheme("dark"), { mode: "light" })
    expect(theme.mode).toBe("light")
  })

  test("colours list markers as body text", () => {
    for (const mode of ["light", "dark"] as const) {
      const syntax = generateSyntax(defaultTheme(mode))
      const text = syntax.getStyle("default")?.fg
      expect(syntax.getStyle("markup.list")?.fg).toEqual(text)
      expect(syntax.getStyle("markup.list.enumeration")?.fg).toEqual(text)
    }
  })
})

describe("theme config parsing", () => {
  test("accepts JSONC comments and trailing commas", () => {
    const override = parseThemeConfig(`{
      // a comment
      "mode": "light",
      "markdown": { "text": "#101010", },
    }`)
    expect(override).toEqual({ mode: "light", markdown: { text: "#101010" } })
  })

  test("reports invalid config with the file name", () => {
    expect(() => parseThemeConfig("{ not json }", "opentui-markdown-render.jsonc")).toThrow(
      /opentui-markdown-render\.jsonc/,
    )
  })
})
