import { describe, expect, test } from "bun:test"
import { createTestRenderer } from "@opentui/core/testing"
import { TextRenderable, StyledText } from "@opentui/core"

describe("inline style", () => {
  test("styled text with link ref", async () => {
    const testSetup = await createTestRenderer({ width: 40, height: 10 })
    const renderer = (testSetup as any).renderer
    const text = new TextRenderable(renderer, { id: "t1", content: "hi", width: 20 })
    renderer.root.add(text)
    await testSetup.renderOnce()
    text.content = new StyledText([{ __isChunk: true, text: "click", fg: "#ffffff", attributes: 0, link: { url: "https://example.com" } } as any])
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("click")
    const chunks = (text as any).chunks
    expect(chunks?.[0]?.link?.url || chunks?.[0]?.link?.href).toBeDefined()
    renderer.destroy()
  })
})
