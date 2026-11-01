import { describe, expect, test } from "bun:test"
import { resolveConfiguredLayout, resolveConfiguredTheme } from "../src/config"
import { defaultTheme, resolveTheme } from "../src/theme"
import { resolveRendererTheme } from "../src/app"
import type { CliRenderer } from "@opentui/core"

describe("static config and runtime settings", () => {
  test("uses the config mode when the host does not specify one", () => {
    const theme = resolveConfiguredTheme({ theme: { mode: "dark", markdown: { heading1: "#123456" } } })
    expect(theme.mode).toBe("dark")
    expect(theme.markdown.headingLevels[0]?.toInts()).toEqual([18, 52, 86, 255])
  })

  test("an explicit runtime mode chooses both the mode and its default palette", () => {
    const config = { theme: { mode: "light" as const, accent: "#123456" } }
    const theme = resolveConfiguredTheme(config, { themeMode: "dark" })
    expect(theme.mode).toBe("dark")
    expect(theme.markdown.text).toEqual(defaultTheme("dark").markdown.text)
    expect(theme.accent.toInts()).toEqual([18, 52, 86, 255])
    expect(config.theme.mode).toBe("light")
  })

  test("runtime solarized preset wins over the configured palette, keeping color overrides", () => {
    const theme = resolveConfiguredTheme({ theme: { mode: "dark", accent: "#123456" } }, { themeMode: "solarized-light" })
    expect(theme.mode).toBe("light")
    expect(theme.background.base).toEqual(defaultTheme("solarized-light").background.base)
    expect(theme.accent.toInts()).toEqual([18, 52, 86, 255])
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

  test("light is the fallback when the file and host have no mode", () => {
    expect(resolveConfiguredTheme({}).mode).toBe("light")
    expect(resolveConfiguredTheme({ theme: { mode: "dark" } }).mode).toBe("dark")
    expect(resolveTheme({ mode: undefined }).mode).toBe("light")
    const renderer = { themeMode: "dark" } as CliRenderer
    expect(resolveRendererTheme(renderer, { config: {} }).mode).toBe("light")
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

})
