import { expect, test } from "bun:test"
import { testRender, useRenderer } from "@opentui/solid"
import { MarkdownRenderer } from "../src/app"
import { defaultTheme } from "../src/theme/defaults"

// These lines were captured from the pre-migration production renderer at
// b745b2f (153 tests passing with the same native prebuild). The changed task
// marker and recursive quote/list layout are tested separately.
const cases = [
  ["link and escape", "[label](https://example.com) \\$5", [
    "label (https://example.com) $5",
  ]],
  ["table and link", "| Label | Value |\n| --- | --- |\n| alpha | [site](https://example.com) |", [
    "┌───────┬────────────────────────────┐",
    "│ Label │ Value                      │",
    "├───────┼────────────────────────────┤",
    "│ alpha │ site (https://example.com) │",
    "└───────┴────────────────────────────┘",
  ]],
  ["Mermaid", "```mermaid\nflowchart LR\n A[Alpha] --> B[Beta]\n```", [
    "╭───────╮    ╭──────╮",
    "│ Alpha ├───▶│ Beta │",
    "╰───────╯    ╰──────╯",
  ]],
] as const

for (const [name, source, expected] of cases) {
  test(`matches historical ${name} visible lines`, async () => {
    const setup = await testRender(() => <MarkdownRenderer content={() => source} renderer={useRenderer()}
      theme={defaultTheme("dark")} discoverConfig={false} />,
    { width: 60, height: 18 })
    await setup.renderOnce()
    const lines = setup.captureCharFrame().split("\n").map((line) => line.trimEnd()).filter(Boolean)
    expect(lines).toEqual([...expected])
  })
}
