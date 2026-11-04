import { describe, expect, test } from "bun:test"
import { testRender, useRenderer } from "@opentui/solid"
import { createSignal } from "solid-js"
import { MarkdownRenderer } from "../src/app"
import { defaultTheme, mergeTheme } from "../src/theme"
import { parseDocument } from "../src/core"
import { resolveCodeFiletype } from "../src/view/code"

const theme = mergeTheme(defaultTheme("dark"), {
  markdown: {
    listItem: "#112233",
    listEnumeration: "#445566",
    code: "#abcdef",
    codeBlock: "#778899",
    horizontalRule: "#aa0000",
    image: "#00aa00",
    imageText: "#aa00aa",
  },
})

async function render(content: string) {
  function Document() {
    const renderer = useRenderer()
    return <MarkdownRenderer content={() => content} renderer={renderer} theme={theme} discoverConfig={false} />
  }
  const setup = await testRender(() => <Document />, { width: 40, height: 12 })
  await setup.renderOnce()
  await new Promise((resolve) => setTimeout(resolve, 200))
  await setup.renderOnce()
  return setup
}

function colorOf(setup: Awaited<ReturnType<typeof render>>, text: string) {
  const span = setup.captureSpans().lines.flatMap((line) => line.spans).find((entry) => entry.text.includes(text))
  return span?.fg.toInts()
}

function colorsOnLine(setup: Awaited<ReturnType<typeof render>>, text: string) {
  const line = setup.captureSpans().lines.find((entry) => entry.spans.map((span) => span.text).join("").includes(text))
  return new Set(line?.spans.filter((span) => span.text.trim()).map((span) => span.fg.toInts().join(",")) ?? [])
}

describe("semantic Markdown colors", () => {
  test("renders ordinary inline-flow text", async () => {
    const setup = await render("Plain paragraph text.\n\n## Visible heading\n\n- visible item\n")
    const frame = setup.captureCharFrame()
    expect(frame).toContain("Plain paragraph text.")
    expect(frame).toContain("Visible heading")
    expect(frame).toContain("visible item")
  })

  test("keeps inline code distinct from fenced code", async () => {
    const inline = await render("`inline code`\n")
    const fenced = await render("```\ncode line\n```\n")
    expect(colorOf(inline, "inline code")).toEqual(theme.markdown.code.toInts())
    expect(colorOf(fenced, "code line")).toEqual(theme.markdown.codeBlock.toInts())
  })

  test("colors unordered and numbered markers independently", async () => {
    const unordered = await render("- item\n")
    const ordered = await render("1. item\n")
    expect(colorOf(unordered, "- ")).toEqual(theme.markdown.listItem.toInts())
    expect(colorOf(ordered, "1. ")).toEqual(theme.markdown.listEnumeration.toInts())
  })

  test("colors markers in the inline-math flow as well", async () => {
    expect(parseDocument("- marker $x$\n").blocks[0]?.type).toBe("list")
    expect(parseDocument("1. marker $x$\n").blocks[0]?.type).toBe("list")
    const unordered = await render("- marker $x$\n")
    const ordered = await render("1. marker $x$\n")
    expect(colorOf(unordered, "- ")).toEqual(theme.markdown.listItem.toInts())
    expect(colorOf(ordered, "1. ")).toEqual(theme.markdown.listEnumeration.toInts())
  })

  test("colors nested numbered markers independently of their parent", async () => {
    const setup = await render("- parent\n  1. nested\n")
    expect(colorOf(setup, "- ")).toEqual(theme.markdown.listItem.toInts())
    expect(colorOf(setup, "1. ")).toEqual(theme.markdown.listEnumeration.toInts())
  })

  test("keeps code and marker colors after content changes", async () => {
    const [content, setContent] = createSignal("1. first\n\n```\nold\n```\n")
    function Document() {
      return <MarkdownRenderer content={content} renderer={useRenderer()} theme={theme} discoverConfig={false} />
    }
    const setup = await testRender(() => <Document />, { width: 40, height: 10 })
    await setup.renderOnce()
    await new Promise((resolve) => setTimeout(resolve, 200))
    await setup.renderOnce()
    setContent("1. second\n\n```\nnew code\n```\n")
    await setup.renderOnce()
    await new Promise((resolve) => setTimeout(resolve, 200))
    await setup.renderOnce()
    expect(colorOf(setup, "1. ")).toEqual(theme.markdown.listEnumeration.toInts())
    expect(colorOf(setup, "new code")).toEqual(theme.markdown.codeBlock.toInts())
  })

  test("highlights jsonc, TypeScript, and TSX fences", async () => {
    expect(resolveCodeFiletype("jsonc")).toBe("json")
    const results: Array<{ language: string; colors: number }> = []
    for (const [language, source, line] of [
      ["ts", "type ThemeConfig = { name?: string }", "ThemeConfig"],
      ["tsx", "const view = <MarkdownRenderer content={content} />", "MarkdownRenderer"],
    ] as const) {
      const setup = await render(`\`\`\`${language}\n${source}\n\`\`\`\n`)
      results.push({ language, colors: colorsOnLine(setup, line).size })
    }
    for (const result of results) expect(result.colors).toBeGreaterThan(1)
  })

  test("colors the actual border of a horizontal rule", async () => {
    const document = await render("before\n\n---\n\nafter\n")
    expect(document.captureCharFrame()).toContain("─")
    expect(document.captureCharFrame()).toContain("after")
    expect(document.captureSpans().lines.flatMap((line) => line.spans).some((span) =>
      span.text.includes("─") && span.fg.toInts().join() === theme.markdown.horizontalRule.toInts().join())).toBe(true)
  })

  test("uses image and imageText for distinct fallback parts", async () => {
    const setup = await render("![Diagram](missing.png)\n")
    expect(colorOf(setup, "Could not render image")).toEqual(theme.markdown.image.toInts())
    expect(colorOf(setup, "Diagram")).toEqual(theme.markdown.imageText.toInts())
  })
})
