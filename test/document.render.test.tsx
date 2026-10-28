import { expect, test } from "bun:test"
import { testRender, useRenderer } from "@opentui/solid"
import { createSignal } from "solid-js"
import { parseDocument } from "../src/core/parse"
import { resolveTableOptions } from "../src/core/tables"
import { defaultHeadingStyles } from "../src/headings"
import { defaultTheme } from "../src/theme/defaults"
import { DocumentView } from "../src/view/document"
import { MarkdownFrame } from "../src/view/frame"
import { resolveFrame } from "../src/core/frame"
import { useCanvasGraphics } from "../src/graphics"

const graphics = { protocol: () => "kitty", cell: () => ({ width: 8, height: 16 }) } as never

test("unified document keeps headings, nested tasks, tables and paragraphs visible", async () => {
  const source = "# Heading\n\n- one\n  - [x] nested\n\n| Name | Value |\n| --- | --- |\n| a | b |\n\nEnd"
  const setup = await testRender(() => <DocumentView document={parseDocument(source)} columns={60}
    theme={defaultTheme("dark")} headings={defaultHeadingStyles} graphics={graphics}
    surface={() => "#0d1117"} assetBase={() => undefined} tableOptions={resolveTableOptions()} />,
  { width: 60, height: 24 })
  await setup.renderOnce()
  const frame = setup.captureCharFrame()
  expect(frame).toContain("Heading")
  expect(frame).toContain("nested")
  expect(frame).toContain("Name")
  expect(frame).toContain("End")
  expect(frame).not.toContain("[table]")
})

test("streaming changes the final block without losing the preceding block", async () => {
  let update!: (value: string) => void
  const setup = await testRender(() => {
    const [source, setSource] = createSignal("First\n\nSecond")
    update = setSource
    return <DocumentView document={parseDocument(source())} columns={40}
      theme={defaultTheme("dark")} headings={defaultHeadingStyles} graphics={graphics}
      surface={() => "#0d1117"} assetBase={() => undefined} tableOptions={resolveTableOptions()} />
  }, { width: 40, height: 10 })
  await setup.renderOnce()
  update("First\n\nSecond extended")
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("First")
  expect(setup.captureCharFrame()).toContain("Second extended")
})

test("wide document table can pan without invalid frame buffer dimensions", async () => {
  const header = Array.from({ length: 12 }, (_, index) => `column ${index}`).join(" | ")
  const divider = Array.from({ length: 12 }, () => "---").join(" | ")
  const source = `| ${header} |\n| ${divider} |\n| ${header} |`
  const setup = await testRender(() => <DocumentView document={parseDocument(source)} columns={40}
    theme={defaultTheme("dark")} headings={defaultHeadingStyles} graphics={graphics}
    surface={() => "#0d1117"} assetBase={() => undefined} tableOptions={resolveTableOptions()} />,
  { width: 40, height: 12 })
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("column 0")
  await setup.mockMouse.scroll(5, 1, "right")
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("column 1")
})

test("wide table inside a frame can pan", async () => {
  const header = Array.from({ length: 12 }, (_, index) => `column ${index}`).join(" | ")
  const divider = Array.from({ length: 12 }, () => "---").join(" | ")
  const source = `| ${header} |\n| ${divider} |\n| ${header} |`
  const theme = defaultTheme("dark")
  const setup = await testRender(() => <box width="100%" height="100%" flexDirection="column">
    <MarkdownFrame frame={resolveFrame(40, { enabled: false })} theme={theme}>
      <DocumentView document={parseDocument(source)} columns={40}
        theme={theme} headings={defaultHeadingStyles} graphics={graphics}
        surface={() => "#0d1117"} assetBase={() => undefined} tableOptions={resolveTableOptions()} />
    </MarkdownFrame>
  </box>, { width: 40, height: 12 })
  await setup.renderOnce()
  await setup.mockMouse.scroll(5, 1, "right")
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("column 1")
})

test("wide table with live renderer graphics remains finite", async () => {
  const header = Array.from({ length: 12 }, (_, index) => `column ${index}`).join(" | ")
  const divider = Array.from({ length: 12 }, () => "---").join(" | ")
  function View() {
    const renderer = useRenderer()
    return <DocumentView document={parseDocument(`| ${header} |\n| ${divider} |\n| ${header} |`)} columns={40}
      theme={defaultTheme("dark")} headings={defaultHeadingStyles} graphics={useCanvasGraphics(renderer)}
      surface={() => "#0d1117"} assetBase={() => undefined} tableOptions={resolveTableOptions()} />
  }
  const setup = await testRender(() => <box width="100%" height="100%"><View /></box>, { width: 40, height: 12 })
  await setup.renderOnce()
  await setup.mockMouse.scroll(5, 1, "right")
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("column 1")
})

test("wide table with a measured root can pan", async () => {
  const header = Array.from({ length: 12 }, (_, index) => `column ${index}`).join(" | ")
  const divider = Array.from({ length: 12 }, () => "---").join(" | ")
  function View() {
    const renderer = useRenderer()
    const [measured, setMeasured] = createSignal(0)
    const columns = () => measured() || renderer.terminalWidth
    const theme = defaultTheme("dark")
    return <box width="100%" flexDirection="column" flexShrink={0} onSizeChange={function () {
      const width = this.width
      if (width !== columns()) queueMicrotask(() => setMeasured(width))
    }}>
      <MarkdownFrame frame={resolveFrame(columns(), { enabled: false })} theme={theme}>
        <DocumentView document={parseDocument(`| ${header} |\n| ${divider} |\n| ${header} |`)} columns={columns()}
          theme={theme} headings={defaultHeadingStyles} graphics={useCanvasGraphics(renderer)}
          surface={() => "#0d1117"} assetBase={() => undefined} tableOptions={resolveTableOptions()} />
      </MarkdownFrame>
    </box>
  }
  const setup = await testRender(() => <box width="100%" height="100%"><View /></box>, { width: 40, height: 12 })
  await setup.renderOnce()
  await setup.mockMouse.scroll(5, 1, "right")
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("column 1")
})
