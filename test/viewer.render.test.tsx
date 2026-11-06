import { describe, expect, test } from "bun:test"
import { testRender, useRenderer } from "@opentui/solid"
import { StandaloneViewer } from "../src/viewer/app"

describe("standalone viewer status line", () => {
  for (const [border, expected] of [[undefined, true], ["none", false], ["bottom", false]] as const) {
    test(`top accent line ${border ?? "by default"}`, async () => {
      const setup = await testRender(
        () => <StandaloneViewer
          renderer={useRenderer()}
          content="A short document."
          title="notes.md"
          assetBase={process.cwd()}
          cwd={process.cwd()}
          config={{ statusline: border ? { border } : undefined }}
          onExit={() => {}}
        />,
        { width: 40, height: 8 },
      )
      await setup.renderOnce()
      const rows = setup.captureCharFrame().trimEnd().split("\n")
      expect(rows.at(-2)?.startsWith("─")).toBe(expected)
      expect(rows.some((row) => row.includes("notes.md"))).toBe(true)
      if (border === undefined) {
        const accent = setup.captureSpans().lines[6]?.spans.find((span) => span.text.includes("─"))
        expect(accent?.fg.toInts()).toEqual([9, 105, 218, 255])
      }
    })
  }
})
