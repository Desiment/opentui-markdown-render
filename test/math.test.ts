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

  test("typesets display math in the display style", async () => {
    if (!existsSync(addon)) return
    // In display style a large operator carries its limits above and below, so
    // the formula needs more rows than the same formula in text style.
    const formula = String.raw`\sum_{i=1}^{n} i^2`
    const inline = await renderMathImage(formula, false, "e6edf3", "0d1117", { width: 8, height: 16 })
    const display = await renderMathImage(formula, true, "e6edf3", "0d1117", { width: 8, height: 16 })
    expect(inline).toBeDefined()
    expect(display).toBeDefined()
    expect(display!.rows).toBeGreaterThan(inline!.rows)
  })

  test("keeps the standard text size for a formula that stands alone", async () => {
    if (!existsSync(addon)) return
    // A formula that shares its row with prose is scaled down to fit that row.
    // One that stands alone keeps the text size, so it covers two rows.
    const shared = await renderMathImage("x^2", false, "e6edf3", "0d1117", { width: 8, height: 16 })
    const standard = await renderMathImage("x^2", false, "e6edf3", "0d1117", { width: 8, height: 16 }, 1, false, true)
    expect(shared?.clamped).toBe(true)
    expect(standard?.clamped).toBe(false)
    expect(standard?.rows).toBeGreaterThan(shared?.rows ?? 0)
  })

  test("renders the LaTeX commands the converter emits", async () => {
    if (!existsSync(addon)) return
    // Every command MiTeX converts has to reach Typst as a formula. A command
    // without a handler in the scope fails to compile and falls back to source.
    const commands = [
      String.raw`\sqrt[3]{x}`,
      String.raw`\dfrac{a}{b}`,
      String.raw`\tfrac{a}{b}`,
      String.raw`\text{hello}`,
      String.raw`\operatorname{sgn}(x)`,
      String.raw`\begin{pmatrix} a & b \end{pmatrix}`,
      String.raw`\begin{bmatrix} a \end{bmatrix}`,
      String.raw`\begin{matrix} a \end{matrix}`,
      String.raw`\begin{cases} a \end{cases}`,
      String.raw`\begin{aligned} a &= b \end{aligned}`,
      String.raw`\begin{array}{cc} a & b \end{array}`,
      String.raw`\boxed{a}`,
      String.raw`\xrightarrow{A}`,
      String.raw`\middle|`,
      String.raw`\big|`,
      String.raw`\substack{a \\ b}`,
      String.raw`\displaystyle\frac{1}{2}`,
    ]
    for (const command of commands) {
      const image = await renderMathImage(command, false, "e6edf3", "0d1117", { width: 8, height: 16 })
      expect(image, command).toBeDefined()
    }
  })
})
