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
  test("multiline display math wins over Setext heading syntax", () => {
    const source = "\\[\nX\n=\nY\n\\]"
    expect(parseDocument(source).blocks).toEqual([{
      type: "display-math",
      content: "\nX\n=\nY\n",
      open: "\\[",
      close: "\\]",
      raw: source,
      source: { start: 0, end: source.length },
    }])

    const dollars = "$$\nX\n=\nY\n$$"
    expect(parseDocument(dollars).blocks).toMatchObject([{
      type: "display-math",
      content: "\nX\n=\nY\n",
      raw: dollars,
    }])
  })
  test("math delimiters inside fenced and inline code remain source", () => {
    const fenced = parseDocument("```latex\n\\[\nX\n=\nY\n\\]\n```")
    expect(fenced.blocks).toMatchObject([{
      type: "code",
      language: "latex",
      content: "\\[\nX\n=\nY\n\\]",
    }])

    const inline = parseDocument("`$$x$$`")
    expect(inline.blocks).toMatchObject([{
      type: "paragraph",
      children: [{ type: "code", text: "$$x$$" }],
    }])
  })
  test("multiline bracket display math remains inside lists and quotes", () => {
    const list = parseDocument("- \\[\n  X\n  =\n  Y\n  \\]").blocks[0]
    expect(list).toMatchObject({
      type: "list",
      items: [{ blocks: [{ type: "display-math", content: "\nX\n=\nY\n" }] }],
    })

    const quote = parseDocument("> \\[\n> X\n> =\n> Y\n> \\]").blocks[0]
    expect(quote).toMatchObject({
      type: "quote",
      blocks: [{ type: "display-math", content: "\nX\n=\nY\n" }],
    })
  })
  test("multiline display math maps its range back to CRLF source", () => {
    const source = "\\[\r\nX\r\n=\r\nY\r\n\\]"
    const block = parseDocument(source).blocks[0]
    expect(block).toMatchObject({ type: "display-math", source: { start: 0, end: source.length } })
    expect(block?.source && source.slice(block.source.start, block.source.end)).toBe(source)
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
