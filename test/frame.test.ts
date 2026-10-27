import { describe, expect, test } from "bun:test"
import { resolveFrame } from "../src/core/frame"

describe("frame geometry", () => {
  test("a frame that is not enabled leaves the whole area to the document", () => {
    const frame = resolveFrame(80)
    expect(frame.enabled).toBe(false)
    expect(frame.width).toBe(80)
    expect(frame.contentWidth).toBe(80)
    expect(frame.offsetX).toBe(0)
    expect(frame.insets).toEqual({ left: 0, right: 0, top: 0, bottom: 0 })
  })

  test("the border and the padding are taken out of the document area", () => {
    const frame = resolveFrame(80, { enabled: true })
    // One column of border and one column of padding on each side.
    expect(frame.width).toBe(80)
    expect(frame.contentWidth).toBe(76)
    expect(frame.insets).toEqual({ left: 2, right: 2, top: 1, bottom: 1 })
    expect(frame.offsetX).toBe(0)
  })

  test("a narrower frame keeps its configured width", () => {
    expect(resolveFrame(100, { enabled: true, width: 80 }).width).toBe(80)
    expect(resolveFrame(100, { enabled: true, width: 80 }).contentWidth).toBe(76)
  })

  test("the frame is aligned inside the area around it", () => {
    const left = resolveFrame(100, { enabled: true, width: 80, align: "left" })
    const center = resolveFrame(100, { enabled: true, width: 80, align: "center" })
    const right = resolveFrame(100, { enabled: true, width: 80, align: "right" })
    expect(left.offsetX).toBe(0)
    expect(center.offsetX).toBe(10)
    expect(right.offsetX).toBe(20)
    // The document area is the same in all three: only the window moved.
    expect(new Set([left.contentWidth, center.contentWidth, right.contentWidth]).size).toBe(1)
  })

  test("an odd remainder is given to the right side", () => {
    expect(resolveFrame(81, { enabled: true, width: 80, align: "center" }).offsetX).toBe(0)
    expect(resolveFrame(83, { enabled: true, width: 80, align: "center" }).offsetX).toBe(1)
  })

  test("a frame wider than the area is clamped", () => {
    expect(resolveFrame(40, { enabled: true, width: 120 }).width).toBe(40)
    expect(resolveFrame(40, { enabled: true, width: 120 }).contentWidth).toBe(36)
  })

  test("a frame narrower than its own border keeps one column of text", () => {
    const frame = resolveFrame(40, { enabled: true, width: 2 })
    expect(frame.width).toBe(5)
    expect(frame.contentWidth).toBe(1)
    expect(frame.offsetX).toBe(0)
  })

  test("padding is configurable and counts as part of the frame", () => {
    const frame = resolveFrame(60, { enabled: true, width: 40, paddingX: 2, paddingY: 1 })
    expect(frame.contentWidth).toBe(34)
    expect(frame.insets).toEqual({ left: 3, right: 3, top: 2, bottom: 2 })
  })

  test("the title is cut to the top border", () => {
    const frame = resolveFrame(40, { enabled: true, width: 20, title: "a title that is far too long" })
    expect(frame.title?.length).toBeLessThanOrEqual(20 - 4)
    expect(resolveFrame(40, { enabled: true, width: 20, title: "" }).title).toBeUndefined()
  })

  test("the alignment of the title is independent of the frame position", () => {
    const frame = resolveFrame(80, { enabled: true, align: "right", title: "notes", titleAlign: "center" })
    expect(frame.align).toBe("right")
    expect(frame.titleAlign).toBe("center")
    expect(frame.title).toBe("notes")
  })
})
