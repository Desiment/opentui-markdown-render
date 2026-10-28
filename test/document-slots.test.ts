import { expect, test } from "bun:test"
import { parseDocument } from "../src/core/parse"
import { reconcileSlots } from "../src/view/document-slots"

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
