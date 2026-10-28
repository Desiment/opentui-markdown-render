import { describe, expect, test } from "bun:test"
import { defaultTheme } from "../src/theme/defaults"
import { layoutAtoms, type MathMeasure } from "../src/view/inline-layout"
import type { StyledAtom } from "../src/view/inline-style"

const fg = defaultTheme("dark").text.base
const text = (value: string): StyledAtom => ({ type: "text", text: value, fg, attributes: 0 })
const math = (value: string): StyledAtom => ({ type: "math", content: value, raw: `$${value}$`, open: "$", close: "$" })
const normal: MathMeasure = { columns: 4, rows: 2, baseline: 1.5 }
const compact: MathMeasure = { columns: 3, rows: 1, baseline: 1 }
const standard: MathMeasure = { columns: 4, rows: 2, baseline: 1.5 }
const measure = () => ({ normal, compact, standard })

describe("unified inline layout", () => {
  test("keeps words and formula in the same row when they fit", () => {
    const lines = layoutAtoms([text("one "), math("x"), text(" two")], 20, measure, false)
    expect(lines).toHaveLength(1)
    expect(lines[0]?.runs.map(({ atom }) => atom.type)).toEqual(["text", "math", "text"])
    expect(lines[0]?.textRow).toBe(1)
  })

  test("keeps the standard raster when the formula ends a line", () => {
    const lines = layoutAtoms([text("one "), math("x")], 20, measure, false)
    expect(lines[0]?.runs.at(-1)?.variant).toBe("standard")
  })

  test("wraps a long word and never widens beyond the available columns", () => {
    const lines = layoutAtoms([text("abcdefghij")], 3, () => undefined, false)
    expect(lines.map(({ columns }) => columns)).toEqual([3, 3, 3, 1])
  })

  test("preserves consecutive hard breaks and normalizes a soft newline", () => {
    const lines = layoutAtoms([text("one\ntwo"), { type: "break", hard: true }, { type: "break", hard: true }, text("three")], 20, () => undefined, false)
    expect(lines.map((line) => line.runs.map((run) => run.atom.type === "text" ? run.atom.text : "").join(""))).toEqual(["one two", "", "three"])
  })

  test("keeps whitespace-only tokens between styled fragments", () => {
    const lines = layoutAtoms([text("a"), text("  "), math("x"), text(" "), text("b")], 20, measure, false)
    expect(lines[0]?.runs.map((run) => run.atom.type === "text" ? run.atom.text : run.atom.raw).join(""))
      .toBe("a  $x$ b")
  })
})
