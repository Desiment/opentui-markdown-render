import { describe, expect, test } from "bun:test"
import { imageInfo } from "@opentui/core"
import { decompressFrames, parseGIF } from "gifuct-js"
import path from "node:path"
import { scanDocument } from "../src/inline"
import { imageBox, resolveLocalImage, standaloneImage } from "../src/media"

describe("raw Markdown block scanner", () => {
  const source = [
    "| A | B |",
    "| - | - |",
    "| 1 | 2 |",
    "",
    "```mermaid",
    "flowchart LR",
    "  A --> B",
    "```",
    "",
    "Plain paragraph.",
    "",
    "Formula $x^2$.",
    "",
    "$$\\frac{a}{b}$$",
    "",
    "![Chart](assets/chart.png)",
  ].join("\n")

  test("isolates display math and images while keeping tables and Mermaid in Markdown", () => {
    const blocks = scanDocument(source)
    expect(blocks.map((block) => block.type)).toEqual([
      "markdown",
      "markdown",
      "markdown",
      "flow",
      "display-math",
      "image",
    ])
    expect(blocks[0]).toMatchObject({ type: "markdown", content: "| A | B |\n| - | - |\n| 1 | 2 |" })
    expect(blocks[1]).toMatchObject({ type: "markdown", source: { atom: "mermaid" } })
    expect(blocks[4]).toMatchObject({ type: "display-math", content: "\\frac{a}{b}" })
    expect(blocks[5]).toMatchObject({ type: "image", alt: "Chart", href: "assets/chart.png" })
  })

  test("does not treat math inside a code fence as a formula", () => {
    const blocks = scanDocument("```tex\n$x$\n```\n")
    expect(blocks.map((block) => block.type)).toEqual(["markdown"])
    expect(blocks[0]).toMatchObject({ type: "markdown", content: "```tex\n$x$\n```" })
  })

  test("routes headings and inline-math paragraphs through the inline flow", () => {
    expect(scanDocument("# Title\n").map((block) => block.type)).toEqual(["flow"])
    expect(scanDocument("Before $a$ after\n").map((block) => block.type)).toEqual(["flow"])
    expect(scanDocument("No math here.\n").map((block) => block.type)).toEqual(["markdown"])
  })
})

describe("local media boundaries", () => {
  test("recognizes standalone images and confines them to the configured root", () => {
    expect(standaloneImage("![Transparent](<assets/transparent image.png>)")).toEqual({ alt: "Transparent", href: "assets/transparent image.png" })
    expect(resolveLocalImage("/work/docs", "assets/chart.png")).toEqual({ path: "/work/docs/assets/chart.png" })
    expect(resolveLocalImage("/work/docs", "../secret.png")).toEqual({ error: "Image path escapes the asset root" })
    expect(resolveLocalImage("/work/docs", "https://example.com/chart.png")).toEqual({ error: "Only local image paths are supported" })
  })

  test("fits images inside the terminal row budget", () => {
    // Capped-and-aspect-correct: wide images are limited to maxColumns
    expect(imageBox(1600, 900, 80, 2)).toEqual({ columns: 80, rows: 23 })
    expect(imageBox(100, 800, 80, 2)).toEqual({ columns: 8, rows: 32 })
  })

  test("ships opaque, transparent, spectrum, checker, and animated fixture assets", async () => {
    const assets = path.join(import.meta.dir, "..", "examples", "assets")
    const opaque = new Uint8Array(await Bun.file(path.join(assets, "opaque.png")).arrayBuffer())
    const transparent = new Uint8Array(await Bun.file(path.join(assets, "transparent.png")).arrayBuffer())
    const spectrum = new Uint8Array(await Bun.file(path.join(assets, "spectrum.png")).arrayBuffer())
    const checker = new Uint8Array(await Bun.file(path.join(assets, "checker.png")).arrayBuffer())
    const gif = new Uint8Array(await Bun.file(path.join(assets, "pulse.gif")).arrayBuffer())

    expect(imageInfo(opaque)).toMatchObject({ format: "png", hasAlpha: false, width: 320 })
    expect(imageInfo(transparent)).toMatchObject({ format: "png", hasAlpha: true, width: 256 })
    expect(imageInfo(spectrum)).toMatchObject({ format: "png", hasAlpha: false, width: 320 })
    expect(imageInfo(checker)).toMatchObject({ format: "png", hasAlpha: false, width: 192 })
    expect(imageInfo(gif)).toMatchObject({ format: "gif" })
    expect(decompressFrames(parseGIF(gif.slice().buffer as ArrayBuffer), true).length).toBeGreaterThan(1)
  })
})
