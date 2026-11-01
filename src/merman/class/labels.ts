import type { DiagramPoint } from "../core/geometry.js"

export function classLabelAnchor(path: readonly DiagramPoint[], lineCount: number, width: number, vertical: boolean): DiagramPoint {
  let bestFrom = path[0]!
  let bestTo = path[path.length - 1]!
  let bestLength = -1
  const preferredLength = (from: DiagramPoint, to: DiagramPoint): number => {
    const horizontal = from.y === to.y
    return horizontal === vertical ? Math.abs(from.x - to.x) + Math.abs(from.y - to.y) : -1
  }
  for (let index = 1; index < path.length; index++) {
    const from = path[index - 1]!
    const to = path[index]!
    const length = preferredLength(from, to)
    if (length > bestLength) {
      bestLength = length
      bestFrom = from
      bestTo = to
    }
  }
  if (bestLength < 0) {
    for (let index = 1; index < path.length; index++) {
      const from = path[index - 1]!
      const to = path[index]!
      const length = Math.abs(from.x - to.x) + Math.abs(from.y - to.y)
      if (length > bestLength) {
        bestLength = length
        bestFrom = from
        bestTo = to
      }
    }
  }
  const midX = Math.floor((bestFrom.x + bestTo.x) / 2)
  const midY = Math.floor((bestFrom.y + bestTo.y) / 2)
  if (bestFrom.y === bestTo.y) return { x: midX - Math.floor(width / 2), y: bestFrom.y - lineCount }
  if (bestFrom.x === bestTo.x) return { x: bestFrom.x + 2, y: midY - Math.floor(lineCount / 2) }
  return { x: midX, y: midY }
}
