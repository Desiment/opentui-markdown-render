import { expect, test } from "bun:test"
import { drawOrthogonalPath } from "../src/merman/core/drawing"

test("dashed paths balance two-column horizontal dashes with one-row vertical dashes", () => {
  const horizontal: number[] = []
  drawOrthogonalPath([{ x: 0, y: 0 }, { x: 12, y: 0 }], (x) => horizontal.push(x), { lineStyle: "dashed" })
  expect(horizontal).toEqual([0, 1, 4, 5, 8, 9])

  const vertical: number[] = []
  drawOrthogonalPath([{ x: 0, y: 0 }, { x: 0, y: 12 }], (_x, y) => vertical.push(y), { lineStyle: "dashed" })
  expect(vertical).toEqual([0, 2, 4, 6, 8, 10])
})
