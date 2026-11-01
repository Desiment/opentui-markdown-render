import { describe, expect, test } from "bun:test"
import { RGBA } from "@opentui/core"
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
  test("light headings 4–6 stay distinct from muted body text", () => {
    const theme = defaultTheme("light")
    expect(theme.markdown.headingLevels[3]?.toInts()).toEqual([111, 66, 193, 255])
    expect(theme.markdown.headingLevels[4]?.toInts()).toEqual([61, 68, 77, 255])
    expect(theme.markdown.headingLevels[5]?.toInts()).toEqual([61, 68, 77, 255])
    expect(theme.border.base.toInts()).toEqual([140, 149, 159, 255])
  })

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

describe("solarized presets", () => {
  test("all built-in colours, including status line and diff, belong to the same 16 swatches", () => {
    for (const preset of ["solarized-light", "solarized-dark"] as const) {
      const theme = resolveTheme({ mode: preset })
      const swatches = theme.palette!.map((color) => color.toInts().join(","))
      expect(new Set(swatches).size).toBe(16)
      const check = (value: unknown): void => {
        if (value instanceof RGBA) {
          expect(swatches).toContain(value.toInts().join(","))
        } else if (value && typeof value === "object") {
          for (const child of Object.values(value)) check(child)
        }
      }
      check(theme)
      expect(new Set(theme.markdown.headingLevels.map((color) => color.toInts().join(","))).size).toBe(1)
    }
  })

  test("each preset has its own surface and semantic light/dark mode", () => {
    expect(defaultTheme("solarized-light").mode).toBe("light")
    expect(defaultTheme("solarized-light").background.base.toInts()).toEqual([253, 246, 227, 255])
    expect(defaultTheme("solarized-dark").mode).toBe("dark")
    expect(defaultTheme("solarized-dark").background.base.toInts()).toEqual([0, 43, 54, 255])
    for (const preset of ["solarized-light", "solarized-dark"] as const) {
      const theme = defaultTheme(preset)
      expect(theme.markdown.headingLevels).toHaveLength(6)
      expect(theme.markdown.headingLevels[0]).toEqual(theme.accent)
      expect(generateSyntax(theme).getStyle("markup.heading.4")?.fg).toEqual(theme.markdown.headingLevels[3])
    }
  })

  test("overrides merge over the selected solarized palette", () => {
    const theme = resolveTheme({ mode: "dark", override: { mode: "solarized-light", markdown: { heading4: "#123456" } } })
    expect(theme.mode).toBe("light")
    expect(theme.background.base).toEqual(defaultTheme("solarized-light").background.base)
    expect(theme.markdown.headingLevels[3]?.toInts()).toEqual([18, 52, 86, 255])
    expect(theme.markdown.headingLevels[2]).toEqual(defaultTheme("solarized-light").markdown.headingLevels[2])
  })
})
