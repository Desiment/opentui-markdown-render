import { describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { discoverConfig, parseConfig } from "../src/config"

describe("config parsing", () => {
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
      "math": { "scale": 1.5, "displayScale": 2 },
      "images": { "maxColumns": 40, "maxRows": 12 },
      "mermaid": { "compact": true, "layoutMaxWidth": 90 }
    }`)
    expect(config.statusline).toEqual({ enabled: false, separator: " | ", border: "top" })
    expect(config.math).toEqual({ scale: 1.5, displayScale: 2 })
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

  test("drops invalid numbers", () => {
    const config = parseConfig(`{ "images": { "maxColumns": 0, "maxRows": "wide" }, "math": { "scale": -1 } }`)
    expect(config.images).toEqual({})
    expect(config.math).toEqual({})
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
})
