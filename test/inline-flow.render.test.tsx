import { describe, expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
import { ImageRenderable, TextRenderable, parseColor, type Renderable } from "@opentui/core"
import { InlineFlow } from "../src/view/inline-flow"
import { defaultTheme } from "../src/theme/defaults"
import { defaultHeadingStyles } from "../src/headings"
import { parseDocument } from "../src/core/parse"

const graphics = { protocol: () => "kitty", cell: () => ({ width: 8, height: 16 }) } as never

async function render(source: string) {
  const block = parseDocument(source).blocks[0]
  if (block?.type !== "paragraph") throw new Error("expected paragraph")
  const setup = await testRender(() => (
    <box width="100%" height="100%" flexDirection="column">
      <InlineFlow inlines={block.children} columns={40} theme={defaultTheme("dark")}
        headings={defaultHeadingStyles} graphics={graphics} surface={() => "#0d1117"} />
    </box>
  ), { width: 40, height: 8 })
  await setup.renderOnce()
  await new Promise((resolve) => setTimeout(resolve, 400))
  await setup.renderOnce()
  return setup.captureCharFrame()
}

describe("unified inline flow", () => {
  test("shows normal text and math in one flow", async () => {
    const frame = await render("text $x^2$ more")
    expect(frame).toContain("text")
    expect(frame).toContain("more")
    expect(frame).not.toContain("[object Object]")
  })

  test("preserves link label next to math", async () => {
    const frame = await render("[site](https://example.com) $x$ text")
    expect(frame).toContain("site")
    expect(frame).toContain("text")
  })

  test("a formula at line end remains a two-row raster", async () => {
    const frame = await render("text $x^2$")
    expect(frame.split("\n").filter((line) => /[▀▄█▌▐░▒▓▖▗▘▝▚▞▛▜▙▟]/.test(line))).toHaveLength(2)
  })

  test("a formula sharing a line with text uses a compact text-row raster", async () => {
    const frame = await render("text $x^2$ more")
    expect(frame.split("\n").filter((line) => /[▀▄█▌▐░▒▓▖▗▘▝▚▞▛▜▙▟]/.test(line))).toHaveLength(1)
  })

  test("retains the URL in rendered text chunks, not just the label", async () => {
    const block = parseDocument("[site](https://example.com) $x$").blocks[0]
    if (block?.type !== "paragraph") throw new Error("expected paragraph")
    const setup = await testRender(() => <InlineFlow inlines={block.children} columns={40}
      theme={defaultTheme("dark")} headings={defaultHeadingStyles}
      graphics={graphics} surface={() => "#0d1117"} />, { width: 40, height: 8 })
    await setup.renderOnce()
    const visit = (node: Renderable): TextRenderable[] => [
      ...(node instanceof TextRenderable ? [node] : []),
      ...node.getChildren().flatMap(visit),
    ]
    const links = visit(setup.renderer.root).flatMap((node) => node.chunks.flatMap((chunk) => chunk.link?.url ? [chunk.link.url] : []))
    expect(links).toContain("https://example.com")
  })

  test("shows the target only when hyperlinks are unavailable", async () => {
    const block = parseDocument("[site](https://example.com) text").blocks[0]
    if (block?.type !== "paragraph") throw new Error("expected paragraph")
    let toggle!: (value: boolean) => void
    const setup = await testRender(() => {
      const [enabled, setEnabled] = createSignal(true)
      toggle = setEnabled
      return <InlineFlow inlines={block.children} columns={60} theme={defaultTheme("dark")}
        headings={defaultHeadingStyles}
        graphics={{ protocol: () => "kitty", cell: () => ({ width: 8, height: 16 }), hyperlinks: enabled } as never}
        surface={() => "#0d1117"} />
    }, { width: 60, height: 8 })
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain("(https://example.com)")
    toggle(false)
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("site (https://example.com) text")
    toggle(true)
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain("(https://example.com)")
  })

  test("a background-only theme change invalidates the inline raster identity", async () => {
    const block = parseDocument("$x^2$").blocks[0]
    if (block?.type !== "paragraph") throw new Error("expected paragraph")
    let update!: (value: boolean) => void
    const base = defaultTheme("dark")
    const setup = await testRender(() => {
      const [light, setLight] = createSignal(false)
      update = setLight
      return <InlineFlow inlines={block.children} columns={40} headings={defaultHeadingStyles}
        theme={{ ...base, background: { base: parseColor(light() ? "#ffffff" : "#000000") } }}
        graphics={graphics} surface={() => light() ? "#ffffff" : "#000000"} />
    }, { width: 40, height: 8 })
    const find = (node: Renderable): ImageRenderable | undefined => node instanceof ImageRenderable
      ? node : node.getChildren().map(find).find(Boolean)
    await setup.renderOnce()
    await new Promise((resolve) => setTimeout(resolve, 400))
    await setup.renderOnce()
    const first = find(setup.renderer.root)?.id
    expect(first).toBeDefined()
    update(true)
    await setup.renderOnce()
    await new Promise((resolve) => setTimeout(resolve, 400))
    await setup.renderOnce()
    expect(find(setup.renderer.root)?.id).not.toBe(first)
  })
})
