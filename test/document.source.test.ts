import { describe, expect, test } from "bun:test"
import { parseDocument } from "../src/core/parse"
import type { Block, ListItem } from "../src/core/document"

function listFrom(source: string): Extract<Block, { type: "list" }> {
  const block = parseDocument(source).blocks[0]
  if (block?.type !== "list") throw new Error("expected a top-level list")
  return block
}

function slice(source: string, item: ListItem): string | null {
  if (!item.source) return null
  return source.slice(item.source.start, item.source.end)
}

describe("list item source ranges", () => {
  test("identical items keep separate exact ranges", () => {
    const source = "- one\n- one\n"
    const list = listFrom(source)
    expect(list.items).toHaveLength(2)
    expect(list.items.map((item) => slice(source, item))).toEqual(["- one\n", "- one"])
    expect(list.items[1]?.source?.end).toBe(source.length - 1)
  })

  test("ordered and task items keep their markers", () => {
    const source = "3. [x] first\n4. [ ] second\n"
    const list = listFrom(source)
    expect(list.items.map((item) => slice(source, item))).toEqual(["3. [x] first\n", "4. [ ] second"])
    expect(list.items.map((item) => [item.task, item.checked])).toEqual([[true, true], [true, false]])
  })

  test("a blank line between items belongs to the first item only", () => {
    const source = "- one\n\n- two\n"
    const list = listFrom(source)
    expect(list.items.map((item) => slice(source, item))).toEqual(["- one\n\n", "- two"])
  })

  test("an item range covers its nested table and formula", () => {
    const source = [
      "- first",
      "  ",
      "  | A | B |",
      "  | --- | --- |",
      "  | 1 | 2 |",
      "  ",
      "  $$",
      "  x+y",
      "  $$",
      "- second",
      "",
    ].join("\n")
    const list = listFrom(source)
    const first = slice(source, list.items[0]!)
    const second = slice(source, list.items[1]!)
    expect(first).toContain("| A | B |")
    expect(first).toContain("x+y")
    expect(second).toBe("- second")
    expect(list.items[1]?.source?.end).toBe(source.length - 1)
  })

  test("a list inside a quote has no proven item ranges", () => {
    const quote = parseDocument("> - one\n> - two\n").blocks[0]
    if (quote?.type !== "quote") throw new Error("expected a quote")
    const list = quote.blocks[0]
    if (list?.type !== "list") throw new Error("expected a nested list")
    expect(list.source).toBeNull()
    expect(list.items.every((item) => item.source === null)).toBe(true)
  })

  test("CRLF list items retain offsets into the original text", () => {
    const source = "Intro\r\n\r\n- one\r\n\r\n- two\r\n"
    const list = parseDocument(source).blocks[1]
    if (list?.type !== "list") throw new Error("expected list")
    expect(list.items.map((item) => slice(source, item))).toEqual(["- one\r\n\r\n", "- two"])
    expect(list.items[0]?.source?.start).toBe(source.indexOf("- one"))
    expect(list.items[1]?.source?.start).toBe(source.indexOf("- two"))
  })
})
