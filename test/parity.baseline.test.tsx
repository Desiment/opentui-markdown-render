import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { testRender, useRenderer } from "@opentui/solid"
import { MarkdownRenderer } from "../src/app"
import { defaultTheme } from "../src/theme/defaults"

// Exercise the production entry point on representative portions of the
// shipped documents, rather than testing a second, test-only renderer.
const examples = [
  ["plain", "Kestrel", "Install"],
  ["tables", "Telemetry reference", "Channel"],
  ["math", "Orbital mechanics", "launch azimuth"],
  ["mermaid", "Architecture reference", "Raw Markdown"],
  ["images", "Telemetry frames", "Ascent profile"],
] as const

for (const [name, heading, detail] of examples) {
  test(`production renderer shows ${name} example without stringified chunks`, async () => {
    const path = fileURLToPath(new URL(`../examples/${name}.md`, import.meta.url))
    const source = readFileSync(path, "utf8").split("\n").slice(0, name === "mermaid" ? 18 : 16).join("\n")
    const setup = await testRender(() => <MarkdownRenderer content={() => source} renderer={useRenderer()}
      theme={defaultTheme("dark")} assetBase={() => fileURLToPath(new URL("../examples", import.meta.url))}
      discoverConfig={false} />, { width: 80, height: 30 })
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain(heading)
    expect(frame).toContain(detail)
    expect(frame).not.toContain("[object Object]")
  })
}
