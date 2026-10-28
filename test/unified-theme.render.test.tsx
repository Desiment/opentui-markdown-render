import { expect, test } from "bun:test"
import { testRender, useRenderer } from "@opentui/solid"
import { createSignal } from "solid-js"
import { MarkdownRenderer } from "../src/app"
import { defaultTheme } from "../src/theme/defaults"

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
