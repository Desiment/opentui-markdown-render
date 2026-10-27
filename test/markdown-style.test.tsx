import { describe, expect, test } from "bun:test"
import { testRender, useRenderer } from "@opentui/solid"
import { BoxRenderable } from "@opentui/core"
import { MarkdownRenderer } from "../src/app"
import { defaultTheme, generateSyntax, mergeTheme } from "../src/theme"
import { createMarkdownStyleRenderer } from "../src/view/markdown-style"
import { scanDocument } from "../src/core"

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

describe("semantic Markdown colors", () => {
  test("keeps inline code distinct from fenced code", async () => {
    const syntax = generateSyntax(theme)
    expect(syntax.getStyle("markup.raw.inline")?.fg).toEqual(theme.markdown.code)
    expect(syntax.getStyle("markup.raw.block")?.fg).toEqual(theme.markdown.codeBlock)
    const setup = await render("```\ncode line\n```\n")
    expect(colorOf(setup, "code line")).toEqual(theme.markdown.codeBlock.toInts())
  })

  test("colors unordered and numbered markers independently", async () => {
    const unordered = await render("- item\n")
    const ordered = await render("1. item\n")
    expect(colorOf(unordered, "- ")).toEqual(theme.markdown.listItem.toInts())
    expect(colorOf(ordered, "1. ")).toEqual(theme.markdown.listEnumeration.toInts())
  })

  test("colors markers in the inline-math flow as well", async () => {
    expect(scanDocument("- marker $x$\n")[0]?.type).toBe("flow")
    expect(scanDocument("1. marker $x$\n")[0]?.type).toBe("flow")
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

  test("colors the actual border of a horizontal rule", async () => {
    const document = await render("before\n\n---\n\nafter\n")
    expect(document.captureCharFrame()).toContain("─")
    expect(document.captureCharFrame()).toContain("after")
    const setup = await testRender(() => <box />, { width: 20, height: 4 })
    const rule = new BoxRenderable(setup.renderer, { width: "100%", border: ["top"] })
    const renderer = createMarkdownStyleRenderer(setup.renderer, () => theme)
    const styled = renderer(
      { type: "hr", raw: "---" },
      { defaultRender: () => rule, syntaxStyle: generateSyntax(theme), conceal: true, concealCode: false },
    )
    expect(styled).toBeInstanceOf(BoxRenderable)
    expect(rule.borderColor).toEqual(theme.markdown.horizontalRule)
    styled?.destroyRecursively()
  })

  test("uses image and imageText for distinct fallback parts", async () => {
    const setup = await render("![Diagram](missing.png)\n")
    expect(colorOf(setup, "Could not render image")).toEqual(theme.markdown.image.toInts())
    expect(colorOf(setup, "Diagram")).toEqual(theme.markdown.imageText.toInts())
  })
})
