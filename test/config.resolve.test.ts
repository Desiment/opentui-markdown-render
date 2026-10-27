import { describe, expect, test } from "bun:test"
import { resolveConfiguredLayout, resolveConfiguredMath, resolveConfiguredTheme } from "../src/config"
import { defaultTheme } from "../src/theme"
import { resolveRendererTheme } from "../src/app"
import type { CliRenderer } from "@opentui/core"

describe("static config and runtime settings", () => {
  test("uses the config mode in auto mode, ahead of the terminal mode", () => {
    const theme = resolveConfiguredTheme({ theme: { mode: "light", markdown: { heading1: "#123456" } } }, {
      themeMode: "auto",
      terminalThemeMode: "dark",
    })
    expect(theme.mode).toBe("light")
    expect(theme.markdown.headingLevels[0]?.toInts()).toEqual([18, 52, 86, 255])
  })

  test("an explicit runtime mode chooses both the mode and its default palette", () => {
    const config = { theme: { mode: "light" as const, accent: "#123456" } }
    const theme = resolveConfiguredTheme(config, { themeMode: "dark", terminalThemeMode: "light" })
    expect(theme.mode).toBe("dark")
    expect(theme.markdown.text).toEqual(defaultTheme("dark").markdown.text)
    expect(theme.accent.toInts()).toEqual([18, 52, 86, 255])
    expect(config.theme.mode).toBe("light")
  })

  test("the public renderer helper shares the same mode precedence", () => {
    const renderer = { themeMode: "light" } as CliRenderer
    const theme = resolveRendererTheme(renderer, { config: { theme: { mode: "light" } }, themeMode: "dark" })
    expect(theme.mode).toBe("dark")
    expect(theme.markdown.text).toEqual(defaultTheme("dark").markdown.text)
  })

  test("a host-provided theme replaces the config theme", () => {
    const host = defaultTheme("dark")
    expect(resolveConfiguredTheme({ theme: { mode: "light" } }, { theme: host })).toBe(host)
  })

  test("the terminal mode and dark fallback apply when the file has no mode", () => {
    expect(resolveConfiguredTheme({}, { terminalThemeMode: "light" }).mode).toBe("light")
    expect(resolveConfiguredTheme({}).mode).toBe("dark")
  })

  test("runtime frame and table settings override file settings without mutating them", () => {
    const config = {
      frame: { enabled: true, width: 60, paddingX: 2 },
      tables: { overflow: "scroll" as const },
    }
    const layout = resolveConfiguredLayout(config, {
      viewport: 100,
      frame: { enabled: true, width: 40, paddingX: 1 },
      tables: { overflow: "wrap" },
    })
    expect(layout.frame.width).toBe(40)
    expect(layout.contentWidth).toBe(36)
    expect(layout.tables.overflow).toBe("wrap")
    expect(config.frame.width).toBe(60)
    expect(resolveConfiguredLayout(config, { viewport: 100 }).frame.width).toBe(60)
  })

  test("runtime math scale overrides only the base scale", () => {
    const config = { math: { scale: 1.5, displayScale: 1.2 } }
    expect(resolveConfiguredMath(config).scale).toBe(1.5)
    expect(resolveConfiguredMath(config).displayScale).toBeCloseTo(1.8)
    expect(resolveConfiguredMath(config, { mathScale: 2 }).scale).toBe(2)
    expect(resolveConfiguredMath(config, { mathScale: 2 }).displayScale).toBeCloseTo(2.4)
  })
})
