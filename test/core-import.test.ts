import { describe, expect, test } from "bun:test"
import { parseDocument } from "../src/core"

describe("core import", () => {
  test("core is importable without UI", () => {
    const doc = parseDocument("Hi")
    expect(doc.blocks.length).toBe(1)
  })
})
