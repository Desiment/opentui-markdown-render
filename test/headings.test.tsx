import { describe, expect, test } from "bun:test"
import { testRender, useRenderer } from "@opentui/solid"
import { TextAttributes } from "@opentui/core"
import { MarkdownRenderer } from "../src/app"
import type { MarkdownConfig } from "../src/config"
import { defaultTheme } from "../src/theme/defaults"

const theme = defaultTheme("dark")

async function renderDocument(content: string, config?: MarkdownConfig) {
  function Document() {
    const renderer = useRenderer()
    return <MarkdownRenderer content={() => content} renderer={renderer} theme={theme} config={config} />
  }
  const setup = await testRender(
    () => (
      <box width="100%" height="100%" flexDirection="column">
        <Document />
      </box>
    ),
    { width: 30, height: 12 },
  )
  await setup.renderOnce()
  await new Promise((resolve) => setTimeout(resolve, 300))
  await setup.renderOnce()
  return setup
}

function spansOf(setup: Awaited<ReturnType<typeof renderDocument>>) {
  return setup.captureSpans().lines.flatMap((line) => line.spans)
}

function spanWithText(setup: Awaited<ReturnType<typeof renderDocument>>, text: string) {
  return spansOf(setup).find((span) => span.text.trim() === text)
}

describe("heading levels", () => {
  test("the marker is muted and the text takes the colour of its level", async () => {
    const setup = await renderDocument("# Title\n")
    const marker = spanWithText(setup, "#")
    const title = spanWithText(setup, "Title")
    expect(marker?.fg.toInts()).toEqual(theme.text.muted.toInts())
    expect(title?.fg.toInts()).toEqual(theme.markdown.headingLevels[0].toInts())
  })

  test("every level has its own colour", async () => {
    const setup = await renderDocument("# One\n\n## Two\n\n### Three\n")
    expect(spanWithText(setup, "One")?.fg.toInts()).toEqual(theme.markdown.headingLevels[0].toInts())
    expect(spanWithText(setup, "Two")?.fg.toInts()).toEqual(theme.markdown.headingLevels[1].toInts())
    expect(spanWithText(setup, "Three")?.fg.toInts()).toEqual(theme.markdown.headingLevels[2].toInts())
  })

  test("the levels differ in their attributes", async () => {
    const setup = await renderDocument("# One\n\n## Two\n\n### Three\n\n#### Four\n\n###### Six\n")
    expect(spanWithText(setup, "One")?.attributes).toBe(TextAttributes.BOLD | TextAttributes.UNDERLINE)
    expect(spanWithText(setup, "Two")?.attributes).toBe(TextAttributes.BOLD)
    expect(spanWithText(setup, "Three")?.attributes).toBe(TextAttributes.BOLD | TextAttributes.DIM)
    expect(spanWithText(setup, "Four")?.attributes).toBe(TextAttributes.ITALIC)
    expect(spanWithText(setup, "Six")?.attributes).toBe(TextAttributes.DIM)
  })

  test("the top level gets more room above it", async () => {
    const emptyRowsAbove = async (content: string) => {
      const setup = await renderDocument(content)
      const lines = setup.captureCharFrame().split("\n")
      const index = lines.findIndex((line) => line.includes("Title"))
      let rows = 0
      for (let row = index - 1; row >= 0 && !lines[row]!.trim(); row--) rows++
      return rows
    }
    expect(await emptyRowsAbove("# Title\n")).toBe(2)
    expect(await emptyRowsAbove("### Title\n")).toBe(1)
  })
})

describe("heading configuration", () => {
  test("the config file decides the attributes of a level", async () => {
    const setup = await renderDocument("# One\n", { headings: { levels: { "1": { bold: false, underline: false } } } })
    expect(spanWithText(setup, "One")?.attributes).toBe(TextAttributes.NONE)
  })

  test("the config file can put a heading in upper case", async () => {
    const setup = await renderDocument("# Mixed case\n", { headings: { levels: { "1": { uppercase: true } } } })
    expect(spanWithText(setup, "MIXED CASE")).toBeDefined()
    expect(spanWithText(setup, "Mixed case")).toBeUndefined()
  })

  test("the marker keeps its own case", async () => {
    const setup = await renderDocument("# Mixed\n", { headings: { levels: { "1": { uppercase: true } } } })
    expect(spanWithText(setup, "#")).toBeDefined()
  })

  test("a level that the config file does not mention keeps the bundled look", async () => {
    const setup = await renderDocument("## Two\n", { headings: { levels: { "1": { underline: false } } } })
    expect(spanWithText(setup, "Two")?.attributes).toBe(TextAttributes.BOLD)
  })
})
