import { describe, expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import type { CapturedSpan } from "@opentui/core"
import { StatusLine } from "../src/statusline"
import { defaultTheme } from "../src/theme/defaults"
import { deriveStatusLineTheme, resolveTheme } from "../src/theme/resolve"

function spanWith(spans: CapturedSpan[], needle: string) {
  return spans.find((span) => span.text.includes(needle))
}

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

  test("paints the bar background and the accent title", async () => {
    const theme = defaultTheme("dark")
    const setup = await testRender(
      () => (
        <box width="100%" height="100%" flexDirection="column" backgroundColor={theme.background.base}>
          <box flexGrow={1} />
          <StatusLine theme={theme} state={() => ({ title: "notes.md", mode: "rendered" })} style="bar" />
        </box>
      ),
      { width: 40, height: 4 },
    )
    await setup.renderOnce()
    const line = setup.captureSpans().lines[3]
    const background = deriveStatusLineTheme(theme).background
    const title = spanWith(line.spans, "notes.md")
    const value = spanWith(line.spans, "rendered")
    expect(title?.fg.toInts()).toEqual(theme.accent.toInts())
    expect(title?.bg.toInts()).toEqual(background.toInts())
    expect(value?.fg.toInts()).toEqual(theme.text.base.toInts())
  })

  test("keeps the plain style in the page colours", async () => {
    const theme = defaultTheme("dark")
    const setup = await testRender(
      () => (
        <box width="100%" height="100%" flexDirection="column" backgroundColor={theme.background.base}>
          <box flexGrow={1} />
          <StatusLine theme={theme} state={() => ({ title: "notes.md", mode: "rendered" })} style="plain" />
        </box>
      ),
      { width: 40, height: 4 },
    )
    await setup.renderOnce()
    const line = setup.captureSpans().lines[3]
    const title = spanWith(line.spans, "notes.md")
    const value = spanWith(line.spans, "rendered")
    expect(title?.bg.toInts()).toEqual(theme.background.base.toInts())
    expect(title?.fg.toInts()).toEqual(theme.text.base.toInts())
    expect(value?.fg.toInts()).toEqual(theme.text.muted.toInts())
  })

  test("follows the theme status line colours", async () => {
    const theme = resolveTheme({ mode: "dark", override: { statusline: { background: "#101010", title: "#ff0000" } } })
    const setup = await testRender(
      () => (
        <box width="100%" height="100%" flexDirection="column" backgroundColor={theme.background.base}>
          <box flexGrow={1} />
          <StatusLine theme={theme} state={() => ({ title: "notes.md" })} style="bar" />
        </box>
      ),
      { width: 40, height: 4 },
    )
    await setup.renderOnce()
    const line = setup.captureSpans().lines[3]
    const title = spanWith(line.spans, "notes.md")
    expect(title?.bg.toInts()).toEqual([16, 16, 16, 255])
    expect(title?.fg.toInts()).toEqual([255, 0, 0, 255])
  })
})
