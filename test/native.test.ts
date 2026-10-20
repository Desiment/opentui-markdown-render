import { existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import { renderMath } from "../src/math/renderer"

const addon = path.join(import.meta.dir, "..", "prebuilds", "linux-x64-gnu", "opentui_markdown_render.node")

describe("embedded MiTeX and Typst renderer", () => {
  test("returns an in-memory PNG when its bundled addon is available", async () => {
    const image = await renderMath({
      latex: String.raw`\int_{-\infty}^{\infty} e^{-a x^2}\,\mathrm{d}x = \sqrt{\frac{\pi}{a}}`,
      foreground: "e6edf3",
      background: "0d1117",
    })

    if (!existsSync(addon)) {
      expect(image).toBeUndefined()
      return
    }
    expect(image?.png.slice(0, 8)).toEqual(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(image?.pixelWidth).toBeGreaterThan(0)
    expect(image?.pixelHeight).toBeGreaterThan(0)
  })

  test("keeps failure as a source fallback hole", async () => {
    const image = await renderMath({ latex: String.raw`\not_a_real_command{`, foreground: "e6edf3", background: "0d1117" })

    expect(image).toBeUndefined()
  })
})
