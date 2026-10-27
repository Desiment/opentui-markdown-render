import { describe, expect, test } from "bun:test"
import { testRender, useRenderer } from "@opentui/solid"
import { MarkdownRenderer, type MarkdownRendererProps } from "../src/app"
import { defaultTheme } from "../src/theme/defaults"

const theme = defaultTheme("dark")

async function renderDocument(content: string, props: Partial<MarkdownRendererProps> = {}, width = 40, height = 12) {
  function Document() {
    const renderer = useRenderer()
    return <MarkdownRenderer content={() => content} renderer={renderer} theme={theme} {...props} />
  }
  const setup = await testRender(
    () => (
      <box width="100%" height="100%" flexDirection="column">
        <Document />
      </box>
    ),
    { width, height },
  )
  await setup.renderOnce()
  await new Promise((resolve) => setTimeout(resolve, 200))
  await setup.renderOnce()
  return setup
}

describe("frame rendering", () => {
  test("draws the window and centers it in the area", async () => {
    const setup = await renderDocument("hello\n", { frame: { enabled: true, width: 20, align: "center" } })
    const lines = setup.captureCharFrame().split("\n")
    const top = lines.findIndex((line) => line.includes("┌"))
    expect(top).toBeGreaterThanOrEqual(0)
    expect(lines[top].indexOf("┌")).toBe(10)
    expect(lines[top].indexOf("┐")).toBe(29)
    expect(lines[top + 1]).toContain("│ hello")
  })

  test("moves the window to the right edge", async () => {
    const setup = await renderDocument("hello\n", { frame: { enabled: true, width: 20, align: "right" } })
    const lines = setup.captureCharFrame().split("\n")
    const top = lines.findIndex((line) => line.includes("┌"))
    expect(lines[top].indexOf("┌")).toBe(20)
  })

  test("draws no border when the frame is off", async () => {
    const setup = await renderDocument("hello\n", { frame: { enabled: false } })
    expect(setup.captureCharFrame()).not.toContain("┌")
  })

  test("carves the title into the top border", async () => {
    const setup = await renderDocument("hello\n", {
      frame: { enabled: true, width: 30, title: "notes", titleAlign: "center" },
    })
    const lines = setup.captureCharFrame().split("\n")
    const top = lines.find((line) => line.includes("notes"))?.trimEnd()
    expect(top).toBeDefined()
    expect(top?.startsWith("┌")).toBe(true)
    expect(top?.endsWith("┐")).toBe(true)
  })

  test("keeps the document on the left of the window", async () => {
    const setup = await renderDocument("hello\n", { frame: { enabled: true, width: 30, align: "center", paddingX: 2 } })
    const line = setup.captureCharFrame().split("\n").find((entry) => entry.includes("hello"))
    // Frame offset 5, border 1 and padding 2, so the text starts at column 8.
    expect(line?.indexOf("hello")).toBe(8)
  })
})

describe("table rendering", () => {
  test("does not stretch a narrow table over the document", async () => {
    const content = "| a | b |\n| --- | --- |\n| 1 | 2 |\n"
    const setup = await renderDocument(content, { tables: { widthMode: "content" } })
    const lines = setup.captureCharFrame().split("\n")
    const top = lines.find((line) => line.includes("┌"))
    expect(top).toBeDefined()
    const right = top?.indexOf("┐") ?? -1
    expect(right).toBeGreaterThan(0)
    expect(right).toBeLessThan(30)
  })

  test("keeps a table inside the frame", async () => {
    const content = "| a | b |\n| --- | --- |\n| 1 | 2 |\n"
    const setup = await renderDocument(content, {
      frame: { enabled: true, width: 24, align: "center" },
      tables: { widthMode: "content" },
    })
    const lines = setup.captureCharFrame().split("\n")
    const top = lines.find((line) => line.includes("┬"))
    expect(top).toBeDefined()
    // The frame starts at column 8; the table follows the border and padding.
    expect(top?.indexOf("┌")).toBe(10)
    // The table ends before the right border of the frame.
    expect(top?.indexOf("┐")).toBeLessThan((top?.trimEnd().length ?? 0) - 1)
  })

  test("clips a wide table at the document edge", async () => {
    const header = Array.from({ length: 12 }, (_, index) => `column ${index}`).join(" | ")
    const divider = Array.from({ length: 12 }, () => "---").join(" | ")
    const content = `| ${header} |\n| ${divider} |\n| ${header} |\n`
    const setup = await renderDocument(content, { tables: { overflow: "scroll" } })
    const lines = setup.captureCharFrame().split("\n")
    expect(lines.every((line) => line.length <= 40)).toBe(true)
    const top = lines.find((line) => line.includes("┌"))
    expect(top).toBeDefined()
    // The right edge of the table is beyond the document, so it is cut off.
    expect(top?.trimEnd().endsWith("┐")).toBe(false)
  })

  test("wraps a wide table instead of scrolling", async () => {
    const content =
      "| alpha beta gamma delta | epsilon zeta eta theta | iota kappa lambda mu |\n| --- | --- | --- |\n| one two three four | five six seven eight | nine ten eleven twelve |\n"
    const setup = await renderDocument(content, { tables: { overflow: "wrap" } })
    const top = setup
      .captureCharFrame()
      .split("\n")
      .find((line) => line.includes("┌"))
    expect(top?.trimEnd().endsWith("┐")).toBe(true)
  })

  test("stretches a narrow table with the full width mode", async () => {
    const content = "| a | b |\n| --- | --- |\n| 1 | 2 |\n"
    const setup = await renderDocument(content, { tables: { widthMode: "full" } })
    const top = setup
      .captureCharFrame()
      .split("\n")
      .find((line) => line.includes("┌"))
    expect(top?.trimEnd().endsWith("┐")).toBe(true)
    expect((top?.trimEnd().length ?? 0) - 1).toBeGreaterThan(30)
  })

  test("pans a wide table with a horizontal wheel", async () => {
    const header = Array.from({ length: 12 }, (_, index) => `column ${index}`).join(" | ")
    const divider = Array.from({ length: 12 }, () => "---").join(" | ")
    const content = `| ${header} |\n| ${divider} |\n| ${header} |\n`
    const setup = await renderDocument(content, { tables: { overflow: "scroll" } })
    const before = setup.captureCharFrame().split("\n")[1]
    expect(before).toContain("column 0")
    await setup.mockMouse.scroll(5, 1, "right")
    await setup.renderOnce()
    const after = setup.captureCharFrame().split("\n")[1]
    // Two columns of the table moved under the left edge.
    expect(after.startsWith("column 0")).toBe(true)
    expect(after).not.toBe(before)
  })

  test("pans a wide table with a drag", async () => {
    const header = Array.from({ length: 12 }, (_, index) => `column ${index}`).join(" | ")
    const divider = Array.from({ length: 12 }, () => "---").join(" | ")
    const content = `| ${header} |\n| ${divider} |\n| ${header} |\n`
    const setup = await renderDocument(content, { tables: { overflow: "scroll" } })
    const before = setup.captureCharFrame().split("\n")[1]
    expect(before).toContain("column 0")
    // Grab the table and pull it to the left.
    await setup.mockMouse.drag(15, 1, 5, 1)
    await setup.renderOnce()
    const after = setup.captureCharFrame().split("\n")[1]
    expect(after).not.toContain("column 0")
    expect(after).toContain("column 1")
  })
})
