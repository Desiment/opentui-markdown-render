import { testRender, useRenderer } from "@opentui/solid"
import path from "node:path"

const { MarkdownRenderer } = await import("../../dist/index.js") as unknown as typeof import("../../src")

function Document() {
  const renderer = useRenderer()
  return (
    <MarkdownRenderer
      content={() => "![Opaque fixture](assets/opaque.png)"}
      renderer={renderer}
      assetBase={() => path.resolve(import.meta.dir, "../../examples")}
      discoverConfig={false}
    />
  )
}

const setup = await testRender(() => <Document />, { width: 60, height: 20 })
await setup.renderOnce()
await new Promise((resolve) => setTimeout(resolve, 250))
await setup.renderOnce()
if (setup.captureCharFrame().includes("Could not render image")) throw new Error("Compiled package failed to render image")
console.log("compiled package image ok")
process.exit(0)
