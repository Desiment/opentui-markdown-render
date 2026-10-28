import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
import { TableBlock } from "../src/view/document-table"
import { MarkdownTableRenderable } from "../src/view/document-table"
import { TextTableRenderable, type Renderable } from "@opentui/core"
import { parseDocument } from "../src/core/parse"
import { resolveTableOptions } from "../src/core/tables"
import { defaultTheme } from "../src/theme/defaults"
import { defaultHeadingStyles } from "../src/headings"

test("renders a Markdown table through the public Solid extension and updates its cells", async () => {
  const source = "| Name | Value |\n| --- | --- |\n| one | [site](https://example.com) |"
  const initial = parseDocument(source).blocks[0]
  if (initial?.type !== "table") throw new Error("expected table")
  let update!: (value: string) => void
  const setup = await testRender(() => {
    const [value, setValue] = createSignal("one")
    update = setValue
    return (
      <box width="100%" height="100%" flexDirection="column">
        <TableBlock block={{ ...initial, rows: initial.rows.map((row) => row.map((cell) => ({
          ...cell, children: cell.children.map((child) => child.type === "text" && child.text === "one"
            ? { ...child, text: value() } : child),
        }))) }} options={resolveTableOptions()} theme={defaultTheme("dark")} headings={defaultHeadingStyles} />
      </box>
    )
  }, { width: 40, height: 10 })
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("one")
  expect(setup.captureCharFrame()).toContain("site")
  update("two")
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("two")
})

test("wide content mode table remains finite inside a narrow viewport", async () => {
  const header = Array.from({ length: 12 }, (_, index) => `column ${index}`).join(" | ")
  const divider = Array.from({ length: 12 }, () => "---").join(" | ")
  const table = parseDocument(`| ${header} |\n| ${divider} |\n| ${header} |`).blocks[0]
  if (table?.type !== "table") throw new Error("expected table")
  const setup = await testRender(() => <box width="100%" height="100%" flexDirection="column">
    <TableBlock block={table} options={resolveTableOptions()} theme={defaultTheme("dark")} headings={defaultHeadingStyles} />
  </box>, { width: 40, height: 12 })
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("column 0")
  const findTable = (node: Renderable): MarkdownTableRenderable | undefined => node instanceof MarkdownTableRenderable
    ? node : node.getChildren().map(findTable).find((child) => child !== undefined)
  const wrapper = findTable(setup.renderer.root)
  expect(wrapper).toBeDefined()
  expect(wrapper?.getChildren()[0]).toBeInstanceOf(TextTableRenderable)
  expect((wrapper?.getChildren()[0] as TextTableRenderable).selectable).toBe(false)
  await setup.mockMouse.scroll(5, 1, "right")
  await setup.renderOnce()
  await setup.mockMouse.drag(15, 1, 5, 1)
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("column 1")
})

test("selection follows table overflow when the viewport is resized", async () => {
  const table = parseDocument("| Short | Long value here |\n| --- | --- |\n| 1 | 2 |").blocks[0]
  if (table?.type !== "table") throw new Error("expected table")
  const setup = await testRender(() => <box width="100%" height="100%">
    <TableBlock block={table} options={resolveTableOptions()} theme={defaultTheme("dark")} headings={defaultHeadingStyles} />
  </box>, { width: 50, height: 8 })
  const findTable = (node: Renderable): TextTableRenderable | undefined => node instanceof TextTableRenderable
    ? node : node.getChildren().map(findTable).find((child) => child !== undefined)
  await setup.renderOnce()
  const textTable = findTable(setup.renderer.root)
  expect(textTable?.selectable).toBe(true)
  setup.resize(18, 8)
  await setup.renderOnce()
  expect(textTable?.selectable).toBe(false)
  setup.resize(50, 8)
  await setup.renderOnce()
  expect(textTable?.selectable).toBe(true)
})
