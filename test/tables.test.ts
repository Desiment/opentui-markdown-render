import { describe, expect, test } from "bun:test"
import { resolveTableOptions } from "../src/core/tables"

describe("table options", () => {
  test("tables are content-sized and scroll by default", () => {
    const options = resolveTableOptions()
    expect(options.widthMode).toBe("content")
    expect(options.overflow).toBe("scroll")
    expect(options.wrapMode).toBe("none")
  })

  test("a wrapping table keeps its cells inside the document", () => {
    expect(resolveTableOptions({ overflow: "wrap" }).wrapMode).toBe("word")
  })

  test("a full-width table wraps instead of scrolling", () => {
    const options = resolveTableOptions({ widthMode: "full" })
    expect(options.widthMode).toBe("full")
    expect(options.wrapMode).toBe("word")
  })

  test("the column fitter and the cell padding are configurable", () => {
    const options = resolveTableOptions({ columnFitter: "proportional", cellPaddingX: 2 })
    expect(options.columnFitter).toBe("proportional")
    expect(options.cellPaddingX).toBe(2)
  })
})
