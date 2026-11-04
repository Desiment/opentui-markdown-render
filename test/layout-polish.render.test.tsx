import { expect, test } from "bun:test"
import { ImageRenderable, type Renderable } from "@opentui/core"
import { testRender } from "@opentui/solid"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { createSignal } from "solid-js"
import { defaultHeadingStyles } from "../src/headings"
import { LocalImage } from "../src/media"
import { parseDocument } from "../src/core/parse"
import { resolveTableOptions } from "../src/core/tables"
import { defaultTheme } from "../src/theme/defaults"
import { DocumentView } from "../src/view/document"

const graphics = { protocol: () => "kitty", cell: () => ({ width: 8, height: 16 }) } as never

function compact(value: string) {
  return value.replace(/[^\p{L}\p{N}]+/gu, "")
}

async function renderDocument(source: string, columns: number, height = 10) {
  const setup = await testRender(() => <DocumentView document={parseDocument(source)} columns={columns}
    theme={defaultTheme("dark")} headings={defaultHeadingStyles} graphics={graphics}
    surface={() => "#0d1117"} assetBase={() => undefined} tableOptions={resolveTableOptions()} />,
  { width: columns, height })
  await setup.renderOnce()
  return setup
}

const readme = readFileSync(fileURLToPath(new URL("../README.md", import.meta.url)), "utf8")
  .split("\n").slice(11, 25).join("\n")

test("README prose and lists reflow intact after the host reports its width", async () => {
  let resize!: (columns: number) => void
  const setup = await testRender(() => {
    const [columns, setColumns] = createSignal(8)
    resize = setColumns
    return <DocumentView document={parseDocument(readme)} columns={columns()}
      theme={defaultTheme("dark")} headings={defaultHeadingStyles} graphics={graphics}
      surface={() => "#0d1117"} assetBase={() => undefined} tableOptions={resolveTableOptions()} />
  }, { width: 80, height: 100 })
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("paragr")
  for (const columns of [24, 32, 48, 80]) {
    resize(columns)
    await setup.renderOnce()
    expect(compact(setup.captureCharFrame())).toBe(compact(readme))
  }
})

test("prefixed headings and nested styled tasks wrap without clipping", async () => {
  const source = "## Layout heading\n\n- **bold words** and *emphasis* wrap cleanly\n  - [x] nested task with [linked text](https://example.com)"
  for (const columns of [24, 40]) {
    const setup = await renderDocument(source, columns, 14)
    const frame = setup.captureCharFrame()
    for (const token of ["Layout", "heading", "bold", "words", "emphasis", "cleanly", "nested", "task", "linked", "text"]) {
      expect(frame).toContain(token)
    }
  }
})

test("standalone images are centered in the document width", async () => {
  const base = fileURLToPath(new URL("../examples", import.meta.url))
  const setup = await testRender(() => <box width={60} height={20} flexDirection="column">
    <LocalImage href="assets/opaque.png" alt="Opaque fixture" base={() => base} columns={() => 60}
      cell={() => ({ width: 8, height: 16 })} background={() => "#0d1117"} limits={{ maxColumns: 20 }} />
  </box>, { width: 60, height: 20 })
  await setup.renderOnce()
  await new Promise((resolve) => setTimeout(resolve, 250))
  await setup.renderOnce()

  const findImage = (node: Renderable): ImageRenderable | undefined => node instanceof ImageRenderable
    ? node
    : node.getChildren().map(findImage).find(Boolean)
  const image = findImage(setup.renderer.root)
  expect(image).toBeDefined()
  expect(image!.width).toBe(20)
  expect(image!.x).toBe(20)
})
