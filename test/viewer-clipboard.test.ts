import { describe, expect, test } from "bun:test"
import { EventEmitter } from "node:events"
import type { CliRenderer, ClipboardService } from "@opentui/core"
import { enableSelectionCopy } from "../src/viewer/clipboard"

describe("viewer mouse selection copying", () => {
  test("copies a completed selection without requiring a terminal copy shortcut", async () => {
    const renderer = new EventEmitter() as CliRenderer
    const writes: string[] = []
    const reports: (string | undefined)[] = []
    const clipboard = {
      writeText: async (text: string) => {
        writes.push(text)
        return { host: { status: "written" }, terminal: { status: "not-attempted", capability: "unknown" } }
      },
    } as Pick<ClipboardService, "writeText">
    const stop = enableSelectionCopy(renderer, (message) => reports.push(message), clipboard)
    renderer.emit("selection", { getSelectedText: () => "" })
    renderer.emit("selection", { getSelectedText: () => "выделенный текст" })
    await Promise.resolve()
    expect(writes).toEqual(["выделенный текст"])
    expect(reports).toEqual(["Copied selection"])
    stop()
    renderer.emit("selection", { getSelectedText: () => "ignored" })
    expect(writes).toHaveLength(1)
  })

  test("reports unavailable clipboard instead of pretending that a copy succeeded", async () => {
    const renderer = new EventEmitter() as CliRenderer
    const reports: (string | undefined)[] = []
    const clipboard = {
      writeText: async () => ({ host: { status: "unsupported" }, terminal: { status: "not-attempted", capability: "unsupported" } }),
    } as Pick<ClipboardService, "writeText">
    const stop = enableSelectionCopy(renderer, (message) => reports.push(message), clipboard)
    renderer.emit("selection", { getSelectedText: () => "text" })
    await Promise.resolve()
    expect(reports).toEqual(["Clipboard unavailable"])
    stop()
  })
})
