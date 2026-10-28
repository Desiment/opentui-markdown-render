import { describe, expect, test } from "bun:test"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { createDocumentLayout, resolveFrame, parseDocument } from "../src/core"

describe("document layout", () => {
  test("resolves the frame and the table policy together", () => {
    const layout = createDocumentLayout({
      viewport: 120,
      frame: { enabled: true, width: 96, align: "center" },
      tables: { overflow: "wrap" },
    })
    expect(layout.contentWidth).toBe(92)
    expect(layout.frame.offsetX).toBe(12)
    expect(layout.tables.wrapMode).toBe("word")
  })

  test("without a frame the content uses the whole viewport", () => {
    const layout = createDocumentLayout({ viewport: 80 })
    expect(layout.contentWidth).toBe(80)
    expect(layout.frame.enabled).toBe(false)
    expect(layout.tables.widthMode).toBe("content")
    expect(layout.tables.overflow).toBe("scroll")
  })
})

describe("the core entry point", () => {
  test("exposes scanning and layout without a renderer", () => {
    expect(parseDocument("hello").blocks[0]?.type).toBe("paragraph")
    expect(resolveFrame(40, { enabled: true, width: 20 }).contentWidth).toBe(16)
  })

  test("imports no OpenTUI or Solid module", () => {
    const directory = path.join(import.meta.dir, "../src/core")
    for (const file of readdirSync(directory)) {
      const source = readFileSync(path.join(directory, file), "utf8")
      expect(source).not.toContain("@opentui/")
      expect(source).not.toContain("solid-js")
    }
  })
})
