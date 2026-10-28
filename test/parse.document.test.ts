import { describe, expect, test } from "bun:test"
import { parseDocument } from "../src/core/parse"

describe("parse document", () => {
  test("headings", () => {
    const doc = parseDocument("# Title\n\n## Sub")
    expect(doc.blocks[0].type).toBe("heading")
    expect((doc.blocks[0] as any).level).toBe(1)
    expect(doc.blocks[1].type).toBe("heading")
    expect((doc.blocks[1] as any).level).toBe(2)
  })
  test("link", () => {
    const doc = parseDocument("[here](https://example.com \"Title\")")
    const p = doc.blocks[0] as any
    const link = p.children.find((c: any) => c.type === "link")
    expect(link.href).toBe("https://example.com")
    expect(link.title).toBe("Title")
  })
  test("images", () => {
    const doc = parseDocument("![alt](asset.png)")
    expect(doc.blocks[0].type).toBe("image")
  })
  test("inline image in text", () => {
    const doc = parseDocument("text ![alt](asset.png) more")
    const p = doc.blocks[0] as any
    expect(p.children.some((c: any) => c.type === "inline-image")).toBe(true)
  })
  test("list ordered and task", () => {
    const doc = parseDocument("3. one\n   - two\n   - [x] task\n4. four")
    const list = doc.blocks[0] as any
    expect(list.ordered).toBe(true)
    expect(list.start).toBe(3)
    const nested = list.items[0].blocks.find((b: any) => b.type === "list")
    expect(nested.items[1].task).toBe(true)
    expect(nested.items[1].checked).toBe(true)
  })
  test("blockquote", () => {
    const doc = parseDocument("> hello\n> world")
    expect(doc.blocks[0].type).toBe("quote")
  })
  test("table", () => {
    const doc = parseDocument("| L | R |\n| :-- | --: |\n| a | b |")
    expect(doc.blocks[0].type).toBe("table")
    const t = doc.blocks[0] as any
    expect(t.header.length).toBe(2)
    expect(t.rows.length).toBe(1)
  })
  test("code block", () => {
    const doc = parseDocument("```ts\nconst x = 1\n```")
    expect(doc.blocks[0].type).toBe("code")
    expect((doc.blocks[0] as any).language).toBe("ts")
  })
  test("mermaid block", () => {
    const doc = parseDocument("```mermaid\nflowchart LR\nA-->B\n```")
    expect(doc.blocks[0].type).toBe("mermaid")
  })
  test("hr", () => {
    const doc = parseDocument("---")
    expect(doc.blocks[0].type).toBe("rule")
  })
})
