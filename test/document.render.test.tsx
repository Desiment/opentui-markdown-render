import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
import { parseDocument } from "../src/core/parse"
import { resolveTableOptions } from "../src/core/tables"
import { defaultHeadingStyles } from "../src/headings"
import { defaultTheme } from "../src/theme/defaults"
import { DocumentView } from "../src/view/document"

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
