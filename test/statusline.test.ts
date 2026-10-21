import { describe, expect, test } from "bun:test"
import { formatStatusLine, statusLineSegments } from "../src/statusline"

describe("status line", () => {
  test("renders the configured fields in order", () => {
    const state = {
      title: "notes.md",
      mode: "rendered",
      protocol: "kitty",
      cell: "8x17",
      mathScale: 1.2,
      position: "12/48",
      hint: "[q] quit",
    }
    expect(formatStatusLine(state)).toBe(
      "notes.md · rendered · img:kitty · 8x17 · 1.2x · 12/48 · [q] quit",
    )
  })

  test("skips fields without a value", () => {
    expect(formatStatusLine({ title: "notes.md", mode: "rendered" })).toBe("notes.md · rendered")
  })

  test("honours a custom field order and separator", () => {
    const state = { title: "notes.md", mode: "rendered", hint: "[q] quit" }
    expect(formatStatusLine(state, ["hint", "title"], " | ")).toBe("[q] quit | notes.md")
  })

  test("marks the title as the strong segment", () => {
    const segments = statusLineSegments({ title: "notes.md", mode: "rendered" })
    expect(segments).toEqual([
      { text: "notes.md", emphasis: "strong" },
      { text: "rendered", emphasis: "muted" },
    ])
  })

  test("moves the strong segment to the highlighted field", () => {
    const segments = statusLineSegments({ title: "notes.md", mode: "rendered" }, undefined, "mode")
    expect(segments).toEqual([
      { text: "notes.md", emphasis: "muted" },
      { text: "rendered", emphasis: "strong" },
    ])
  })

  test("keeps the list field out of the highlight", () => {
    const segments = statusLineSegments({ text: ["one", "two"] }, ["text"], "text")
    expect(segments).toEqual([
      { text: "one", emphasis: "muted" },
      { text: "two", emphasis: "muted" },
    ])
  })

  test("expands the text field into its own segments", () => {
    const segments = statusLineSegments({ text: ["one", "", "two"] }, ["text"])
    expect(segments).toEqual([
      { text: "one", emphasis: "muted" },
      { text: "two", emphasis: "muted" },
    ])
  })

  test("renders nothing without a state", () => {
    expect(formatStatusLine({})).toBe("")
  })
})
