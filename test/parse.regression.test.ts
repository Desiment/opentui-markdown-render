import { describe, expect, test } from "bun:test"
import { parseDocument } from "../src/core/parse"
import type { Block } from "../src/core/document"

function paragraph(block: Block) {
  if (block.type !== "paragraph") throw new Error(`expected paragraph, got ${block.type}`)
  return block
}

describe("AST-lite conversion", () => {
  test("preserves inline tokens inside a tight nested list", () => {
    const [list] = parseDocument("3. one $x$ and **bold**\n   - [x] task\n4. four").blocks
    expect(list?.type).toBe("list")
    if (list?.type !== "list") return
    expect(list.start).toBe(3)
    expect(list.items[0]?.blocks[0]).toMatchObject({
      type: "paragraph", children: [
        { type: "text", text: "one " },
        { type: "math", content: "x", raw: "$x$" },
        { type: "text", text: " and " },
        { type: "strong", children: [{ type: "text", text: "bold" }] },
      ],
    })
    const nested = list.items[0]?.blocks[1]
    expect(nested?.type).toBe("list")
    if (nested?.type !== "list") return
    expect(nested.items[0]?.task).toBe(true)
    expect(nested.items[0]?.checked).toBe(true)
    expect(nested.items[0]?.blocks.map((block) => block.type)).toEqual(["paragraph"])
    expect(paragraph(nested.items[0]!.blocks[0]!).children).toEqual([{ type: "text", text: "task" }])
  })

  test("retains loose task items without a duplicate checkbox", () => {
    const [list] = parseDocument("- [ ] todo\n\n- [x] done").blocks
    if (list?.type !== "list") throw new Error("expected list")
    expect(list.loose).toBe(true)
    expect(list.items.map(({ task, checked }) => ({ task, checked }))).toEqual([
      { task: true, checked: false }, { task: true, checked: true },
    ])
    expect(list.items.map((item) => paragraph(item.blocks[0]!).children)).toEqual([
      [{ type: "text", text: "todo" }], [{ type: "text", text: "done" }],
    ])
  })

  test("keeps display math within its container and assigns only provable ranges", () => {
    const source = "Before $$x$$ after\n\n- before $$y$$ after\n- second\n\n> quote $$z$$ text"
    const doc = parseDocument(source)
    expect(doc.blocks.slice(0, 3).map((block) => block.type)).toEqual(["paragraph", "display-math", "paragraph"])
    for (const block of doc.blocks) {
      if (block.source) expect(source.slice(block.source.start, block.source.end)).toBe(block.raw)
    }
    const list = doc.blocks[3]
    if (list?.type !== "list") throw new Error("expected list")
    expect(list.items).toHaveLength(2)
    expect(list.items[0]?.blocks.map((block) => block.type)).toEqual(["paragraph", "display-math", "paragraph"])
    expect(list.items[0]?.blocks[1]?.source).toBeNull()
    const quote = doc.blocks[4]
    if (quote?.type !== "quote") throw new Error("expected quote")
    expect(quote.blocks.map((block) => block.type)).toEqual(["paragraph", "display-math", "paragraph"])
  })

  test("distinguishes a standalone image from an inline image with whitespace", () => {
    const doc = parseDocument("  ![alt](asset.png)  \n\nA ![icon](icon.png) B")
    expect(doc.blocks[0]).toMatchObject({ type: "image", href: "asset.png", alt: "alt" })
    expect(paragraph(doc.blocks[1]!).children.map((child) => child.type)).toEqual(["text", "inline-image", "text"])
  })

  test("preserves table links, raw math, and alignment metadata", () => {
    const [table] = parseDocument("| C | R |\n| :--: | --: |\n| $x$ | [site](https://example.com) |").blocks
    if (table?.type !== "table") throw new Error("expected table")
    expect(table.align).toEqual(["center", "right"])
    expect(table.rows[0]?.[0]?.children).toEqual([{ type: "math", content: "x", open: "$", close: "$", raw: "$x$" }])
    expect(table.rows[0]?.[1]?.children).toEqual([{ type: "link", href: "https://example.com", title: null, children: [{ type: "text", text: "site" }] }])
  })

  test("does not parse math inside a code span, link URL or fence", () => {
    const doc = parseDocument("`$x$` [site](https://example.com/$x$)\n\n```mermaid\nflowchart LR\n A-->B $y$\n```")
    expect(paragraph(doc.blocks[0]!).children.map((child) => child.type)).toEqual(["code", "text", "link"])
    expect(doc.blocks[1]?.type).toBe("mermaid")
  })

  test("does not close a formula on an escaped dollar delimiter", () => {
    const [block] = parseDocument(String.raw`$a\$b$`).blocks
    expect(paragraph(block!).children).toEqual([
      { type: "math", raw: String.raw`$a\$b$`, content: String.raw`a\$b`, open: "$", close: "$" },
    ])
  })

  test("keeps multiline display math inside a list item", () => {
    const [list] = parseDocument("- $$\na+b\n$$").blocks
    if (list?.type !== "list") throw new Error("expected list")
    expect(list.items[0]?.blocks).toMatchObject([{ type: "display-math", content: "\na+b\n", source: null }])
  })
})
