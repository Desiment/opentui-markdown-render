import { describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { discoverConfig, loadConfig, parseConfig, resolveConfiguredTheme } from "../src/config"
import { loadRendererConfig } from "../src/app"
import { defaultTheme } from "../src/theme"

describe("config parsing", () => {
  test("accepts a named theme and rejects inline color overrides", () => {
    const messages: string[] = []
    const config = parseConfig(`{
      "theme": {
        "name": "gruvbox-dark", "accent": "#123456"
      }
    }`, "theme.jsonc", (message) => messages.push(message))
    expect(config.theme).toEqual({ name: "gruvbox-dark" })
    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain("theme.accent")
    for (const message of messages) expect(message).toContain("theme.jsonc")
  })

  test("a missing theme falls back to light", () => {
    const config = parseConfig(`{ "theme": { "name": "does-not-exist" } }`)
    const theme = resolveConfiguredTheme(config)
    expect(theme.accent).toEqual(defaultTheme("light").accent)
    expect(theme.mode).toBe("light")
  })

  test("rejects an invalid theme name", () => {
    const messages: string[] = []
    const config = parseConfig(`{ "theme": { "name": "../secret" } }`, "theme.jsonc", (message) => messages.push(message))
    expect(config.theme).toEqual({})
    expect(resolveConfiguredTheme(config).mode).toBe("light")
    expect(messages).toHaveLength(1)
  })

  test("accepts both solarized presets in the config file", () => {
    for (const name of ["solarized-light", "solarized-dark"] as const) {
      const config = parseConfig(`{ "theme": { "name": "${name}" } }`)
      expect(config.theme?.name).toBe(name)
      expect(resolveConfiguredTheme(config).background.base).toEqual(defaultTheme(name).background.base)
    }
  })

  test("accepts JSONC comments and trailing commas", () => {
    const config = parseConfig(`{
      // a comment
      "theme": { "name": "dark", },
      "statusline": { "fields": ["title", "mode"], },
    }`)
    expect(config.theme).toEqual({ name: "dark" })
    expect(config.statusline?.fields).toEqual(["title", "mode"])
  })

  test("keeps every section", () => {
    const config = parseConfig(`{
      "theme": { "name": "light" },
      "statusline": { "enabled": false, "separator": " | ", "border": "top" },
      "images": { "maxColumns": 40, "maxRows": 12 },
      "mermaid": { "compact": true, "layoutMaxWidth": 90, "classLayout": "dagre" }
    }`)
    expect(config.statusline).toEqual({ enabled: false, separator: " | ", border: "top" })
    expect(config.images).toEqual({ maxColumns: 40, maxRows: 12 })
    expect(config.mermaid).toEqual({ compact: true, layoutMaxWidth: 90, classLayout: "dagre" })
  })

  test("accepts only builtin and dagre as Mermaid class layout engines", () => {
    expect(parseConfig('{ "mermaid": { "classLayout": "builtin" } }').mermaid?.classLayout).toBe("builtin")
    const warnings: string[] = []
    const config = parseConfig('{ "mermaid": { "classLayout": "custom" } }', "config", (message) => warnings.push(message))
    expect(config.mermaid?.classLayout).toBeUndefined()
    expect(warnings[0]).toContain("Unknown Mermaid class layout")
  })

  test("reports invalid config with the file name", () => {
    expect(() => parseConfig("{ not json }", "opentui-markdown-render.jsonc")).toThrow(
      /opentui-markdown-render\.jsonc/,
    )
  })

  test("rejects a config that is not an object", () => {
    expect(() => parseConfig("[1, 2, 3]")).toThrow(/expected a JSON object/)
  })

  test("drops unknown status line fields", () => {
    const config = parseConfig(`{ "statusline": { "fields": ["title", "nonsense"] } }`)
    expect(config.statusline?.fields).toEqual(["title"])
  })

  test("keeps the status line style and highlight", () => {
    const config = parseConfig(`{ "statusline": { "style": "bar", "highlight": "mode" } }`)
    expect(config.statusline?.style).toBe("bar")
    expect(config.statusline?.highlight).toBe("mode")
  })

  test("drops an unknown status line style", () => {
    const config = parseConfig(`{ "statusline": { "style": "neon", "highlight": "nonsense" } }`)
    expect(config.statusline?.style).toBeUndefined()
    expect(config.statusline?.highlight).toBeUndefined()
  })

  test("drops invalid image limits", () => {
    const config = parseConfig(`{ "images": { "maxColumns": 0, "maxRows": "wide" } }`)
    expect(config.images).toEqual({})
  })

  test("reports legacy math settings as an unknown section", () => {
    const messages: string[] = []
    const config = parseConfig(`{ "math": { "scale": 2 } }`, "legacy.jsonc", (message) => messages.push(message))
    expect(config).not.toHaveProperty("math")
    expect(messages).toEqual(['Unknown config section "math" in legacy.jsonc'])
  })
})

describe("heading configuration", () => {
  test("keeps the style of every level", () => {
    const config = parseConfig(`{
      "headings": { "levels": { "1": { "bold": true, "underline": true, "marginTop": 2 }, "3": { "dim": true } } }
    }`)
    expect(config.headings).toEqual({
      levels: { "1": { bold: true, underline: true, marginTop: 2 }, "3": { dim: true } },
    })
  })

  test("drops an unknown level", () => {
    const config = parseConfig(`{ "headings": { "levels": { "7": { "bold": true } } } }`)
    expect(config.headings).toBeUndefined()
  })

  test("drops an unknown option", () => {
    const config = parseConfig(`{ "headings": { "levels": { "1": { "blinking": true, "bold": true } } } }`)
    expect(config.headings).toEqual({ levels: { "1": { bold: true } } })
  })

  test("drops invalid option values", () => {
    const config = parseConfig(`{ "headings": { "levels": { "1": { "bold": "yes", "marginTop": -1 } } } }`)
    expect(config.headings).toEqual({ levels: { "1": {} } })
  })
})

describe("frame and table configuration", () => {
  test("keeps the frame window", () => {
    const config = parseConfig(`{
      "frame": {
        "enabled": true,
        "width": 80,
        "align": "center",
        "style": "rounded",
        "paddingX": 2,
        "paddingY": 1,
        "title": "notes.md",
        "titleAlign": "right"
      }
    }`)
    expect(config.frame).toEqual({
      enabled: true,
      width: 80,
      align: "center",
      style: "rounded",
      paddingX: 2,
      paddingY: 1,
      title: "notes.md",
      titleAlign: "right",
    })
  })

  test("keeps the table policy", () => {
    const config = parseConfig(`{ "tables": { "widthMode": "content", "overflow": "scroll", "columnFitter": "balanced", "cellPaddingX": 2 } }`)
    expect(config.tables).toEqual({
      widthMode: "content",
      overflow: "scroll",
      columnFitter: "balanced",
      cellPaddingX: 2,
    })
  })

  test("reports and drops invalid frame options", () => {
    const messages: string[] = []
    const config = parseConfig(
      `{ "frame": { "enabled": "yes", "width": 0, "align": "middle", "style": "neon", "paddingX": -1, "title": 4 } }`,
      "config.jsonc",
      (message) => messages.push(message),
    )
    expect(config.frame?.enabled).toBeUndefined()
    expect(config.frame?.width).toBeUndefined()
    expect(config.frame?.align).toBeUndefined()
    expect(config.frame?.style).toBeUndefined()
    expect(config.frame?.paddingX).toBeUndefined()
    expect(config.frame?.title).toBeUndefined()
    expect(messages).toHaveLength(6)
  })

  test("reports and drops invalid table options", () => {
    const messages: string[] = []
    const config = parseConfig(
      `{ "tables": { "widthMode": "stretch", "overflow": "clip", "columnFitter": "even", "cellPaddingX": -1 } }`,
      "config.jsonc",
      (message) => messages.push(message),
    )
    expect(config.tables).toEqual({})
    expect(messages).toHaveLength(4)
  })
})

describe("config discovery", () => {
  test("walks up from the starting directory", () => {
    const root = mkdtempSync(path.join(tmpdir(), "opentui-config-"))
    const nested = path.join(root, "a", "b")
    mkdirSync(nested, { recursive: true })
    writeFileSync(path.join(root, "opentui-markdown-render.jsonc"), "{}")
    expect(discoverConfig(nested)).toBe(path.join(root, "opentui-markdown-render.jsonc"))
  })

  test("prefers the jsonc file over the json file", () => {
    const root = mkdtempSync(path.join(tmpdir(), "opentui-config-"))
    writeFileSync(path.join(root, "opentui-markdown-render.json"), "{}")
    writeFileSync(path.join(root, "opentui-markdown-render.jsonc"), "{}")
    expect(discoverConfig(root)).toBe(path.join(root, "opentui-markdown-render.jsonc"))
  })

  test("returns nothing when no config exists", () => {
    const root = mkdtempSync(path.join(tmpdir(), "opentui-config-"))
    const xdg = mkdtempSync(path.join(tmpdir(), "opentui-xdg-"))
    expect(discoverConfig(root, { XDG_CONFIG_HOME: xdg, HOME: xdg })).toBeUndefined()
  })

  test("falls back to the XDG otmd config directory", () => {
    const root = mkdtempSync(path.join(tmpdir(), "opentui-config-"))
    const xdg = mkdtempSync(path.join(tmpdir(), "opentui-xdg-"))
    const directory = path.join(xdg, "otmd")
    mkdirSync(directory)
    writeFileSync(path.join(directory, "config.jsonc"), "{}")
    expect(discoverConfig(root, { XDG_CONFIG_HOME: xdg, HOME: xdg })).toBe(path.join(directory, "config.jsonc"))
  })

  test("prefers a project config over XDG config", () => {
    const root = mkdtempSync(path.join(tmpdir(), "opentui-config-"))
    const xdg = mkdtempSync(path.join(tmpdir(), "opentui-xdg-"))
    const directory = path.join(xdg, "otmd")
    mkdirSync(directory)
    writeFileSync(path.join(directory, "config.jsonc"), "{}")
    const project = path.join(root, "opentui-markdown-render.json")
    writeFileSync(project, "{}")
    expect(discoverConfig(root, { XDG_CONFIG_HOME: xdg, HOME: xdg })).toBe(project)
  })

  test("reports config warnings through the reporter", () => {
    const root = mkdtempSync(path.join(tmpdir(), "opentui-config-"))
    writeFileSync(path.join(root, "opentui-markdown-render.jsonc"), `{ "frame": { "style": "neon" } }`)
    const messages: string[] = []
    loadConfig(undefined, root, (message) => messages.push(message))
    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain("frame option \"style\"")
  })

  test("an embedded host can switch discovery off", () => {
    const root = mkdtempSync(path.join(tmpdir(), "opentui-config-"))
    writeFileSync(path.join(root, "opentui-markdown-render.jsonc"), `{ "frame": { "enabled": true } }`)
    expect(loadRendererConfig(undefined, root, { discover: false })).toEqual({})
    expect(loadRendererConfig(undefined, root).frame?.enabled).toBe(true)
  })
})
