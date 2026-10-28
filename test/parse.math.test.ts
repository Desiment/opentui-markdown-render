import { describe, expect, test } from "bun:test"
import { parseDocument } from "../src/core/parse"

describe("parse math", () => {
  test("inline math $x$", () => {
    const doc = parseDocument("A $x$ B")
    expect(doc.blocks[0].type).toBe("paragraph")
    const p = doc.blocks[0] as any
    expect(p.children.some((c: any) => c.type === "math")).toBe(true)
  })
  test("inline math \\(x\\)", () => {
    const doc = parseDocument("A \\(x\\) B")
    expect(doc.blocks[0].type).toBe("paragraph")
    const p = doc.blocks[0] as any
    expect(p.children.some((c: any) => c.type === "math")).toBe(true)
  })
  test("escaped dollar", () => {
    const doc = parseDocument("A \\$x$ B")
    const p = doc.blocks[0] as any
    // should not be treated as math start in normal form
    expect(p.children.some((c: any) => c.type === "math" && c.raw === "$x$")).toBe(false)
  })
  test("code span with dollar", () => {
    const doc = parseDocument("`$x$`")
    const p = doc.blocks[0] as any
    expect(p.children[0].type).toBe("code")
  })
  test("display math $$a$$", () => {
    const doc = parseDocument("$$a$$")
    expect(doc.blocks[0].type).toBe("display-math")
  })
  test("display math \\[a\\]", () => {
    const doc = parseDocument("\\[a\\]")
    expect(doc.blocks[0].type).toBe("display-math")
  })
  test("math in strong", () => {
    const doc = parseDocument("**a $x$**")
    const p = doc.blocks[0] as any
    expect(p.children[0].type).toBe("strong")
  })
  test("math in list", () => {
    const doc = parseDocument("- before $$x$$ after\n- second")
    expect(doc.blocks[0].type).toBe("list")
    const list = doc.blocks[0] as any
    expect(list.items[0].blocks.length).toBeGreaterThan(0)
  })
  test("math in blockquote", () => {
    const doc = parseDocument("> one $$x$$ two\n> three")
    expect(doc.blocks[0].type).toBe("quote")
  })
})
