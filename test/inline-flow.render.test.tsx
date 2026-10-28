import { describe, expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
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
})
