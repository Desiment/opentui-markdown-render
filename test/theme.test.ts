import { describe, expect, test } from "bun:test"
import { defaultTheme, generateSyntax, mergeTheme, resolveTheme } from "../src/theme"

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

describe("heading colours", () => {
  test("every level has a colour of its own", () => {
    const theme = defaultTheme("dark")
    expect(theme.markdown.headingLevels).toHaveLength(6)
    expect(theme.markdown.headingLevels[0]).toEqual(theme.accent)
    expect(theme.markdown.headingLevels[1]).toEqual(theme.markdown.heading)
  })

  test("a colour for a single level only changes that level", () => {
    const theme = resolveTheme({ mode: "dark", override: { markdown: { heading3: "#123456" } } })
    expect(theme.markdown.headingLevels[2]?.toInts()).toEqual([18, 52, 86, 255])
    expect(theme.markdown.headingLevels[1]).toEqual(defaultTheme("dark").markdown.headingLevels[1])
  })

  test("the base heading colour applies to every level", () => {
    // A theme that only knows one heading colour keeps working: it is the
    // colour of every level that has no colour of its own.
    const theme = resolveTheme({ mode: "dark", override: { markdown: { heading: "#123456" } } })
    for (const level of theme.markdown.headingLevels) {
      expect(level.toInts()).toEqual([18, 52, 86, 255])
    }
  })

  test("the syntax styles follow the levels", () => {
    const theme = defaultTheme("dark")
    const syntax = generateSyntax(theme)
    expect(syntax.getStyle("markup.heading.1")?.fg).toEqual(theme.markdown.headingLevels[0])
    expect(syntax.getStyle("markup.heading.2")?.fg).toEqual(theme.markdown.headingLevels[1])
    expect(syntax.getStyle("markup.heading.6")?.fg).toEqual(theme.markdown.headingLevels[5])
  })
})
