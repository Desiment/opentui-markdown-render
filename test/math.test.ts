import { existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import { renderMathImage } from "../src/math"
import { isRenderableLatex } from "../src/math/validate"

const addon = path.join(import.meta.dir, "..", "prebuilds", "linux-x64-gnu", "opentui_markdown_render.node")

describe("latex validation", () => {
  test("accepts complete formulas", () => {
    expect(isRenderableLatex(String.raw`\frac{a}{b}`)).toBe(true)
    expect(isRenderableLatex(String.raw`P(A \mid B) = \frac{P(B \mid A) P(A)}{P(B)}`)).toBe(true)
    expect(isRenderableLatex(String.raw`\left( \frac{1}{2} \right]`)).toBe(true)
    // Interval notation is deliberately unbalanced.
    expect(isRenderableLatex(String.raw`[0, 1)`)).toBe(true)
    expect(isRenderableLatex(String.raw`\{ x \}`)).toBe(true)
  })

  test("rejects truncated formulas so they stay source", () => {
    expect(isRenderableLatex(String.raw`\frac{1}{`)).toBe(false)
    expect(isRenderableLatex(String.raw`\frac{1}}`)).toBe(false)
    expect(isRenderableLatex("\\frac{a}{b}\\")).toBe(false)
    expect(isRenderableLatex(String.raw`\left( x`)).toBe(false)
    expect(isRenderableLatex(String.raw`x \right)`)).toBe(false)
  })
})

describe("math image scale", () => {
  test("sizes one em to one cell height", async () => {
    const image = await renderMathImage("x", false, "e6edf3", "0d1117", { width: 8, height: 16 })
    if (!existsSync(addon)) {
      expect(image).toBeUndefined()
      return
    }
    // At one cell (16px) per em, a lone `x` is a single text row.
    expect(image?.rows).toBe(1)
    expect(image?.columns).toBeLessThanOrEqual(2)
    expect(image?.baseline).toBeGreaterThan(0)
    expect(image?.baseline).toBeLessThanOrEqual(1)
  })

  test("falls back to source for a truncated formula", async () => {
    const image = await renderMathImage(String.raw`\frac{1}{`, true, "e6edf3", "0d1117", { width: 8, height: 16 })
    expect(image).toBeUndefined()
  })

  test("normalizes delimiter-adjacent whitespace before rendering", async () => {
    if (!existsSync(addon)) return
    // `$$` display blocks pass the raw inner text through, which keeps the
    // surrounding newlines. They must not change the geometry, or the sentinel
    // slice leaks a phantom glyph beside the formula.
    const raw = String.raw`\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}`
    const padded = `\n${raw}\n`
    const clean = await renderMathImage(raw, true, "e6edf3", "0d1117", { width: 8, height: 16 })
    const withNewlines = await renderMathImage(padded, true, "e6edf3", "0d1117", { width: 8, height: 16 })
    expect(clean).toBeDefined()
    expect(withNewlines?.columns).toBe(clean?.columns)
    expect(withNewlines?.rows).toBe(clean?.rows)
  })
})
