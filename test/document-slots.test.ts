import { expect, test } from "bun:test"
import { parseDocument } from "../src/core/parse"
import type { Block } from "../src/core/document"
import { reconcileSlots } from "../src/view/document-slots"

function linkHref(block: Block): string | null {
  if (block.type !== "paragraph") return null
  const link = block.children.find((child) => child.type === "link")
  return link?.type === "link" ? link.href : null
}

test("keeps prefix and suffix slots across insertion, edits, and removal", () => {
  const first = reconcileSlots([], [...parseDocument("First\n\nSecond").blocks])
  const appended = reconcileSlots(first, [...parseDocument("First\n\nSecond\n\nThird").blocks])
  expect(appended[0]).toBe(first[0])
  expect(appended[1]).toBe(first[1])
  const inserted = reconcileSlots(appended, [...parseDocument("Before\n\nFirst\n\nSecond\n\nThird").blocks])
  expect(inserted[1]).toBe(appended[0])
  expect(inserted[2]).toBe(appended[1])
  const edited = reconcileSlots(inserted, [...parseDocument("Before\n\nFirst\n\nSecond changed\n\nThird").blocks])
  expect(edited[2]).toBe(inserted[2])
  expect(edited[2]?.block().raw).toBe("Second changed")
  expect(edited[3]).toBe(inserted[3])
})

test("reuses a single edited Mermaid slot, never a slot of another kind", () => {
  const one = reconcileSlots([], [...parseDocument("```mermaid\nflowchart LR\n A-->B\n```").blocks])
  const two = reconcileSlots(one, [...parseDocument("```mermaid\nflowchart LR\n A-->\n```").blocks])
  expect(two[0]).toBe(one[0])
  const code = reconcileSlots(two, [...parseDocument("```ts\nconst n = 1\n```").blocks])
  expect(code[0]).not.toBe(two[0])
})

test("refreshes a prefix slot when only a reference definition changes", () => {
  const first = reconcileSlots([], [...parseDocument("[ref]: https://a.example\n\nSee [site][ref].\n\nTail").blocks])
  const oldBlock = first[0]!.block()
  const oldTail = first[1]!.block()
  const next = reconcileSlots(first, [...parseDocument("[ref]: https://b.example\n\nSee [site][ref].\n\nTail").blocks])
  expect(next[0]).toBe(first[0])
  expect(next[0]!.block()).not.toBe(oldBlock)
  expect(linkHref(next[0]!.block())).toBe("https://b.example")
  expect(next[1]).toBe(first[1])
  expect(next[1]!.block()).toBe(oldTail)
})

test("refreshes a suffix slot when only a reference definition changes", () => {
  const first = reconcileSlots([], [...parseDocument("Head\n\n[ref]: https://a.example\n\nSee [site][ref].").blocks])
  const oldHead = first[0]!.block()
  const oldBlock = first[1]!.block()
  const next = reconcileSlots(first, [...parseDocument("Head\n\n[ref]: https://b.example\n\nSee [site][ref].").blocks])
  expect(next[0]).toBe(first[0])
  expect(next[0]!.block()).toBe(oldHead)
  expect(next[1]).toBe(first[1])
  expect(next[1]!.block()).not.toBe(oldBlock)
  expect(linkHref(next[1]!.block())).toBe("https://b.example")
})

test("source-only shifts update metadata without replacing rendered blocks", () => {
  const source = "| A | B |\n| --- | --- |\n| 1 | 2 |\n\n- first\n- second"
  const first = reconcileSlots([], [...parseDocument(source).blocks])
  const oldTable = first[0]!.block()
  const oldList = first[1]!.block()
  const next = reconcileSlots(first, [...parseDocument(`Before\n\n${source}`).blocks])
  expect(next[1]).toBe(first[0])
  expect(next[2]).toBe(first[1])
  expect(next[1]!.block()).toBe(oldTable)
  expect(next[2]!.block()).toBe(oldList)
  expect(next[1]!.latest().source?.start).toBe(source.indexOf("| A") + 8)
  const list = next[2]!.latest()
  if (list.type !== "list") throw new Error("expected list")
  expect(list.items[0]?.source?.start).toBe(source.indexOf("- first") + 8)
})
