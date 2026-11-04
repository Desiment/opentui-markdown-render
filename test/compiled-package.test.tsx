import { expect, test } from "bun:test"
import { testRender, useRenderer } from "@opentui/solid"
import path from "node:path"

test("compiled package defers image dimensions until media is ready", async () => {
  const { MarkdownRenderer } = await import("../dist/index.js") as unknown as typeof import("../src")

  function Document() {
    const renderer = useRenderer()
    return (
      <MarkdownRenderer
        content={() => "![Opaque fixture](assets/opaque.png)"}
        renderer={renderer}
        assetBase={() => path.resolve(import.meta.dir, "../examples")}
        discoverConfig={false}
      />
    )
  }

  const setup = await testRender(() => <Document />, { width: 60, height: 20 })
  await setup.renderOnce()
  await new Promise((resolve) => setTimeout(resolve, 250))
  await setup.renderOnce()
  expect(setup.captureCharFrame()).not.toContain("Could not render image")
})
