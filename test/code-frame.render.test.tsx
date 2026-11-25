import { describe, expect, test } from "bun:test"
import { testRender, useRenderer } from "@opentui/solid"
import { MarkdownRenderer } from "../src/app"
import { defaultTheme } from "../src/theme/defaults"

const theme = defaultTheme("dark")

async function render(content: string) {
  function Document() {
    return <MarkdownRenderer content={() => content} renderer={useRenderer()} theme={theme}
      discoverConfig={false} />
  }
  const setup = await testRender(() => <Document />, { width: 60, height: 16 })
  await setup.renderOnce()
  await new Promise((resolve) => setTimeout(resolve, 200))
  await setup.renderOnce()
  return setup
}

describe("fenced code frames", () => {
  test("draws a rounded Unicode frame around fenced code", async () => {
    const source = "```ts\nconst doubled = items.map(n => n * 2);\n```\n"
    const setup = await render(source)
    const frame = setup.captureCharFrame()
    const lines = frame.split("\n")
    expect(lines.some((line) => line.startsWith("╭") && line.endsWith("╮"))).toBe(true)
    expect(lines.some((line) => line.startsWith("│") && line.endsWith("│"))).toBe(true)
    expect(lines.some((line) => line.startsWith("╰") && line.endsWith("╯"))).toBe(true)
    expect(frame).toContain("const doubled = items.map(n => n * 2);")
  })

  test("uses the theme frame colour for the code border", async () => {
    const setup = await render("```\nframed\n```\n")
    const border = setup.captureSpans().lines.flatMap((line) => line.spans)
      .find((span) => span.text.includes("╭"))
    expect(border?.fg.toInts()).toEqual(theme.frame!.border.toInts())
    expect(setup.captureCharFrame()).toContain("framed")
  })

  test("does not frame inline code", async () => {
    const setup = await render("Use `inline code` in a sentence.\n")
    expect(setup.captureCharFrame()).toContain("inline code")
    expect(setup.captureCharFrame()).not.toContain("╭")
  })

  test("keeps LaTeX source inside a fenced code frame", async () => {
    const setup = await render("```latex\n\\[\nX = Y\n\\]\n```\n")
    const frame = setup.captureCharFrame()
    expect(frame).toContain("\\[")
    expect(frame).toContain("X = Y")
    expect(frame).toContain("\\]")
    expect(frame).toContain("╭")
  })

  test("frames unsupported Mermaid source but not rendered diagrams", async () => {
    const fallback = await render("```mermaid\nnot a diagram\n```\n")
    expect(fallback.captureCharFrame()).toContain("not a diagram")
    expect(fallback.captureCharFrame()).toContain("╭")

    const diagram = await render("```mermaid\nflowchart LR\n A[Alpha] --> B[Beta]\n```\n")
    const lines = diagram.captureCharFrame().split("\n")
    expect(diagram.captureCharFrame()).toContain("Alpha")
    // Diagram nodes have their own small rounded boxes; the source-code frame
    // would span the whole 60-column document.
    expect(lines.some((line) => line.startsWith("╭") && line.endsWith("╮") && line.length === 60)).toBe(false)
  })
})
