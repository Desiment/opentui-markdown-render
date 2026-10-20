import { describe, expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { StatusLine } from "../src/statusline"
import { defaultTheme } from "../src/theme/defaults"

describe("status line rendering", () => {
  test("draws the configured fields in one row", async () => {
    const theme = defaultTheme("dark")
    const setup = await testRender(
      () => (
        <box width="100%" height="100%" flexDirection="column" backgroundColor={theme.background.base}>
          <box flexGrow={1} />
          <StatusLine
            theme={theme}
            state={() => ({
              title: "notes.md",
              mode: "rendered",
              protocol: "kitty",
              cell: "8x17",
              mathScale: 1.2,
              position: "12/48",
              hint: "[q] quit",
            })}
          />
        </box>
      ),
      { width: 80, height: 6 },
    )
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("notes.md · rendered · img:kitty · 8x17 · 1.2x · 12/48 · [q] quit")
  })

  test("keeps the border on its own row", async () => {
    const theme = defaultTheme("dark")
    const setup = await testRender(
      () => (
        <box width="100%" height="100%" flexDirection="column" backgroundColor={theme.background.base}>
          <box flexGrow={1} />
          <StatusLine theme={theme} state={() => ({ title: "notes.md" })} border="top" />
        </box>
      ),
      { width: 40, height: 6 },
    )
    await setup.renderOnce()
    const rows = setup.captureCharFrame().split("\n")
    expect(rows[4]).toMatch(/^─+$/)
    expect(rows[5]).toContain("notes.md")
  })
})
