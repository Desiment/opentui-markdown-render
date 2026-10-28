import { expect, test } from "bun:test"
import { testRender, useRenderer } from "@opentui/solid"
import { createSignal } from "solid-js"
import { MarkdownRenderer } from "../src/app"
import { defaultTheme } from "../src/theme/defaults"
import { TextRenderable, type Renderable } from "@opentui/core"

test("theme changes re-color a list marker and a link without altering content", async () => {
  const [mode, setMode] = createSignal<"dark" | "light">("dark")
  const setup = await testRender(() => <MarkdownRenderer
    renderer={useRenderer()} content={() => "- [site](https://example.com) $x$"}
    theme={() => defaultTheme(mode())} discoverConfig={false} />,
  { width: 40, height: 10 })
  await setup.renderOnce()
  const marker = () => setup.captureSpans().lines.flatMap((line) => line.spans)
    .find((span) => span.text.includes("- "))?.fg.toInts()
  expect(marker()).toEqual(defaultTheme("dark").markdown.listItem.toInts())
  setMode("light")
  await setup.renderOnce()
  expect(marker()).toEqual(defaultTheme("light").markdown.listItem.toInts())
  expect(setup.captureCharFrame()).toContain("site")
})

test("theme changes recolor a Mermaid diagram without replacing its renderable", async () => {
  const [mode, setMode] = createSignal<"dark" | "light">("dark")
  const setup = await testRender(() => <MarkdownRenderer renderer={useRenderer()}
    content={() => "```mermaid\nflowchart LR\n A[Alpha] --> B[Beta]\n```"}
    theme={() => defaultTheme(mode())} discoverConfig={false} />,
  { width: 60, height: 14 })
  const find = (node: Renderable): TextRenderable | undefined => node instanceof TextRenderable &&
    node.chunks.some((chunk) => chunk.text.includes("Alpha")) ? node : node.getChildren().map(find).find(Boolean)
  await setup.renderOnce()
  const text = find(setup.renderer.root)
  expect(text).toBeDefined()
  const before = text?.chunks.find((chunk) => chunk.text.includes("Alpha"))?.fg?.toInts()
  setMode("light")
  await setup.renderOnce()
  expect(find(setup.renderer.root)).toBe(text)
  expect(text?.chunks.find((chunk) => chunk.text.includes("Alpha"))?.fg?.toInts()).not.toEqual(before)
})
