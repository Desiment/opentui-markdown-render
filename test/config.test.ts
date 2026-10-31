import { describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { discoverConfig, loadConfig, parseConfig, resolveConfiguredTheme } from "../src/config"
import { loadRendererConfig } from "../src/app"
import { defaultTheme } from "../src/theme"

describe("config parsing", () => {
  test("validates theme colors and nested keys without rejecting the rest of the theme", () => {
    const messages: string[] = []
    const config = parseConfig(`{
      "theme": {
        "mode": "neon", "accent": "#123456", "categorical": ["#fff", "no-such-color"],
        "markdown": { "heading1": "#abcdef", "heading2": "not-a-color", "headingLevels": ["#123456"] },
        "text": { "feedback": { "error": "red", "succes": "#00ff00" } }
      }
    }`, "theme.jsonc", (message) => messages.push(message))
    expect(config.theme?.mode).toBeUndefined()
    expect(config.theme?.accent).toBe("#123456")
    expect(config.theme?.categorical).toEqual(["#fff"])
    expect(config.theme?.markdown?.heading1).toBe("#abcdef")
    expect(config.theme?.markdown?.heading2).toBeUndefined()
    expect(config.theme?.text?.feedback?.error).toBe("red")
    expect(messages).toHaveLength(5)
    for (const message of messages) expect(message).toContain("theme.jsonc")
  })

  test("a malformed theme color cannot break theme resolution", () => {
    const config = parseConfig(`{ "theme": { "accent": "invalid", "markdown": { "heading3": "#abc" } } }`)
    const theme = resolveConfiguredTheme(config)
    expect(theme.accent).toEqual(defaultTheme("light").accent)
    expect(theme.markdown.headingLevels[2]?.toInts()).toEqual([170, 187, 204, 255])
  })

  test("rejects auto as a theme mode in the config file", () => {
    const messages: string[] = []
    const config = parseConfig(`{ "theme": { "mode": "auto" } }`, "theme.jsonc", (message) => messages.push(message))
    expect(config.theme?.mode).toBeUndefined()
    expect(resolveConfiguredTheme(config).mode).toBe("light")
    expect(messages).toHaveLength(1)
  })

  test("accepts JSONC comments and trailing commas", () => {
    const config = parseConfig(`{
      // a comment
      "theme": { "mode": "light", "markdown": { "text": "#101010", }, },
      "statusline": { "fields": ["title", "mode"], },
    }`)
    expect(config.theme).toEqual({ mode: "light", markdown: { text: "#101010" } })
    expect(config.statusline?.fields).toEqual(["title", "mode"])
  })

  test("keeps every section", () => {
    const config = parseConfig(`{
      "theme": { "accent": "#ff0000" },
      "statusline": { "enabled": false, "separator": " | ", "border": "top" },
      "images": { "maxColumns": 40, "maxRows": 12 },
      "mermaid": { "compact": true, "layoutMaxWidth": 90 }
    }`)
    expect(config.statusline).toEqual({ enabled: false, separator: " | ", border: "top" })
    expect(config.images).toEqual({ maxColumns: 40, maxRows: 12 })
    expect(config.mermaid).toEqual({ compact: true, layoutMaxWidth: 90 })
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
    expect(discoverConfig(root)).toBeUndefined()
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
