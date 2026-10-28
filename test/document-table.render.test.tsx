import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
import { TableBlock } from "../src/view/document-table"
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
