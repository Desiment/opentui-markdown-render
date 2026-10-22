import { describe, expect, test } from "bun:test"
import { testRender, useRenderer } from "@opentui/solid"
import { CanvasFlow, type FlowBlock, type InlineRun } from "../src/inline"
import { MarkdownRenderer } from "../src/app"
import { defaultTheme } from "../src/theme/defaults"

// The block mosaic needs a larger measured formula, but the layout is the same.
const graphics = { protocol: () => "kitty", cell: () => ({ width: 8, height: 16 }) } as never

async function renderRuns(runs: InlineRun[], columns = 40) {
  const setup = await testRender(
    () => (
      <box width="100%" height="100%" flexDirection="column">
        <CanvasFlow
          block={{ type: "paragraph", runs } as FlowBlock}
          columns={() => columns}
          surface={() => "#0d1117"}
          theme={defaultTheme("dark")}
          graphics={graphics}
        />
      </box>
    ),
    { width: columns, height: 8 },
  )
  await setup.renderOnce()
  // The raster is fetched asynchronously; the frame is drawn once it lands.
  await new Promise((resolve) => setTimeout(resolve, 400))
  await setup.renderOnce()
  return setup.captureCharFrame().split("\n")
}

// A formula is drawn as a block mosaic, so the rows it covers are the rows that
// hold nothing but mosaic characters.
function mosaicRows(lines: string[]) {
  const mosaic = /[▀▄█▌▐░▒▓▖▗▘▝▚▞▛▜▙▟]/
  return lines.filter((line) => mosaic.test(line)).length
}

describe("inline formula layout", () => {
  test("a formula that stands alone keeps the standard text size", async () => {
    const lines = await renderRuns([{ type: "math", content: "x^2", open: "$", close: "$" }])
    // The standard size is not squeezed into a single text row, so the formula
    // covers two of them.
    expect(mosaicRows(lines)).toBe(2)
  })

  test("a formula that shares its line with text is squeezed into the text row", async () => {
    const lines = await renderRuns([
      { type: "text", content: "text ", style: "text" },
      { type: "math", content: "x^2", open: "$", close: "$" },
      { type: "text", content: " more", style: "text" },
    ])
    expect(mosaicRows(lines)).toBe(1)
  })
})

describe("document width", () => {
  test("lays the document out for the width of its area, not for the terminal", async () => {
    const content = "aaa bbb ccc ddd eee fff ggg hhh iii jjj $x$"
    function Document() {
      const renderer = useRenderer()
      return <MarkdownRenderer content={() => content} renderer={renderer} />
    }
    const setup = await testRender(
      () => (
        <box width="100%" height="100%" flexDirection="column">
          <scrollbox
            width="100%"
            flexGrow={1}
            contentOptions={{ paddingLeft: 1, paddingRight: 1, paddingTop: 1, paddingBottom: 1 }}
          >
            <Document />
          </scrollbox>
        </box>
      ),
      { width: 40, height: 8 },
    )
    await setup.renderOnce()
    await new Promise((resolve) => setTimeout(resolve, 400))
    await setup.renderOnce()
    const lines = setup.captureCharFrame().split("\n")
    const first = lines.find((line) => line.trim().length > 0) ?? ""
    // The area is 40 columns wide, but the scroll box insets the document by a
    // column of padding and a scrollbar: the layout gets 38 columns. Nine words
    // of four columns fit; a tenth one would reach past the area and be cut
    // off by the terminal.
    expect(first.trim().split(/\s+/).length).toBe(9)
  })
})
