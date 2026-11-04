import { describe, expect, test } from "bun:test"
import { imageInfo } from "@opentui/core"
import path from "node:path"
import { parseDocument } from "../src/core"
import { imageBox, loadGif, resolveLocalImage, standaloneImage } from "../src/media"

describe("Markdown document", () => {
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

  test("preserves tables, Mermaid, inline and display math and images as blocks", () => {
    const blocks = parseDocument(source).blocks
    expect(blocks.map((block) => block.type)).toEqual([
      "table",
      "mermaid",
      "paragraph",
      "paragraph",
      "display-math",
      "image",
    ])
    expect(blocks[0]).toMatchObject({ type: "table", header: [{ header: true }, { header: true }] })
    expect(blocks[1]).toMatchObject({ type: "mermaid", content: "flowchart LR\n  A --> B" })
    expect(blocks[4]).toMatchObject({ type: "display-math", content: "\\frac{a}{b}" })
    expect(blocks[5]).toMatchObject({ type: "image", alt: "Chart", href: "assets/chart.png" })
  })

  test("does not treat math inside a code fence as a formula", () => {
    const blocks = parseDocument("```tex\n$x$\n```\n").blocks
    expect(blocks.map((block) => block.type)).toEqual(["code"])
    expect(blocks[0]).toMatchObject({ type: "code", content: "$x$", fenced: true })
  })

  test("uses the same paragraph structure whether math is present or not", () => {
    expect(parseDocument("# Title\n").blocks.map((block) => block.type)).toEqual(["heading"])
    expect(parseDocument("Before $a$ after\n").blocks.map((block) => block.type)).toEqual(["paragraph"])
    expect(parseDocument("No math here.\n").blocks.map((block) => block.type)).toEqual(["paragraph"])
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

    // The assets are rendered wider than the terminal cell grid they are
    // painted into, so they stay sharp when the renderer scales them down.
    expect(imageInfo(opaque)).toMatchObject({ format: "png", hasAlpha: false, width: 1280, height: 720 })
    expect(imageInfo(transparent)).toMatchObject({ format: "png", hasAlpha: true, width: 1024, height: 640 })
    expect(imageInfo(spectrum)).toMatchObject({ format: "png", hasAlpha: false, width: 1280, height: 640 })
    expect(imageInfo(checker)).toMatchObject({ format: "png", hasAlpha: false, width: 1024, height: 1024 })
    expect(imageInfo(gif)).toMatchObject({ format: "gif", width: 640, height: 640 })
    const media = loadGif(gif, { columns: 40, rows: 20 }, { width: 320, height: 320 }, [0, 0, 0])
    expect(media.animation.frames.length).toBeGreaterThan(1)
    expect("patch" in media.animation.frames[0]!).toBe(false)
  })
})
