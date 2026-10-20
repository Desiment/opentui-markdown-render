import { BorderChars } from "@opentui/core"
import { DiagramCanvas, type DiagramCanvasCell } from "../core/canvas.js"
import { diagramLineGlyph, drawDiagramFrame, drawOrthogonalPath, mergeDiagramLineGlyph } from "../core/drawing.js"
import { directionBetween, type DiagramDirection, type DiagramPoint } from "../core/geometry.js"
import { diagramTextWidth, splitDiagramLines } from "../core/text.js"
import {
  CLASS_CONTENT_OFFSET_X,
  layoutClassDiagram,
  type ClassBox,
  type ClassDiagramLayout,
  type ClassEdge,
} from "./layout.js"
import type { ClassGrid } from "./render-grid.js"
import type {
  ClassCellStyle,
  ClassDiagram,
  ClassDiagramDirection,
  ClassDiagramRenderOptions,
  ClassRelationshipKind,
} from "./types.js"

type ClassCell = DiagramCanvasCell<ClassCellStyle>

const HOLLOW_TRIANGLE: Record<DiagramDirection, string> = { up: "△", down: "▽", left: "◁", right: "▷" }
const OPEN_ARROW: Record<DiagramDirection, string> = { up: "↑", down: "↓", left: "←", right: "→" }
const FILLED_DIAMOND = "◆"
const HOLLOW_DIAMOND = "◇"

export function drawClassDiagramGrid(diagram: ClassDiagram, options: ClassDiagramRenderOptions = {}): ClassGrid {
  return drawClassDiagramLayout(createClassDiagramLayout(diagram, options))
}

export function createClassDiagramLayout(
  diagram: ClassDiagram,
  options: ClassDiagramRenderOptions = {},
): ClassDiagramLayout {
  const requested = diagram.direction
  const maxWidth =
    options.layoutMaxWidth !== undefined && Number.isFinite(options.layoutMaxWidth)
      ? Math.max(1, Math.trunc(options.layoutMaxWidth))
      : undefined
  if (maxWidth === undefined || (requested !== "LR" && requested !== "RL")) {
    return layoutClassDiagram(diagram, requested)
  }
  const wide = layoutClassDiagram(diagram, requested)
  if (wide.width <= maxWidth) return wide
  const fallbackDirection: ClassDiagramDirection = requested === "RL" ? "BT" : "TB"
  const fallback = layoutClassDiagram(diagram, fallbackDirection)
  return fallback.width < wide.width ? fallback : wide
}

function drawClassDiagramLayout(layout: ClassDiagramLayout): ClassGrid {
  if (layout.boxes.length === 0) return new DiagramCanvas(0, 0)
  const grid = makeGrid(Math.max(1, layout.width), Math.max(1, layout.height))
  for (const box of layout.boxes) drawBox(grid, box)
  for (const edge of layout.edges) drawEdgeLine(grid, edge)
  for (const edge of layout.edges) drawEdgeEndpoints(grid, edge)
  for (const edge of layout.edges) drawEdgeLabels(grid, edge)
  return grid
}

function makeGrid(width: number, height: number): ClassGrid {
  return new DiagramCanvas(width, height, {
    mergeCell: (existing, incoming): ClassCell => ({
      ...incoming,
      char:
        existing.style === "edge" && incoming.style === "edge"
          ? (mergeDiagramLineGlyph(existing.char, incoming.char) ?? incoming.char)
          : incoming.char,
    }),
  })
}

function setCell(grid: ClassGrid, x: number, y: number, char: string, style?: ClassCellStyle): void {
  grid.setCell(x, y, char, style)
}

function drawBox(grid: ClassGrid, box: ClassBox): void {
  const bounds = box.bounds
  drawDiagramFrame(bounds, BorderChars.single, (x, y, char) => setCell(grid, x, y, char, "border"))

  let y = bounds.top + 1
  box.titleLines.forEach((line, index) => {
    const x = bounds.left + CLASS_CONTENT_OFFSET_X + Math.floor((box.contentWidth - diagramTextWidth(line)) / 2)
    setText(grid, x, y + index, line, box.definition.stereotype && index === 0 ? "stereotype" : "title")
  })
  y += box.titleLines.length

  if (box.attributeLines.length) {
    drawSeparator(grid, bounds, y)
    y += 1
    box.attributeLines.forEach((line, index) => setText(grid, bounds.left + CLASS_CONTENT_OFFSET_X, y + index, line, "member"))
    y += box.attributeLines.length
  }
  if (box.methodLines.length) {
    drawSeparator(grid, bounds, y)
    y += 1
    box.methodLines.forEach((line, index) => setText(grid, bounds.left + CLASS_CONTENT_OFFSET_X, y + index, line, "member"))
  }
}

function drawSeparator(grid: ClassGrid, bounds: ClassBox["bounds"], y: number): void {
  const left = bounds.left
  const right = bounds.left + bounds.width - 1
  setCell(grid, left, y, "├", "border")
  for (let x = left + 1; x < right; x++) setCell(grid, x, y, "─", "border")
  setCell(grid, right, y, "┤", "border")
}

function drawEdgeLine(grid: ClassGrid, edge: ClassEdge): void {
  const { relationship, path } = edge
  if (path.length < 2) return
  drawOrthogonalPath(path, (x, y, char) => setCell(grid, x, y, char, "edge"), {
    cornerStyle: "square",
    lineStyle: relationship.dashed ? "dashed" : "single",
  })
}

function drawEdgeEndpoints(grid: ClassGrid, edge: ClassEdge): void {
  const { relationship, path } = edge
  if (path.length < 2) return
  drawStartCell(grid, path, relationship.headAt === "from" ? relationship.kind : undefined)
  drawEndCell(grid, path, relationship.headAt === "to" ? relationship.kind : undefined)
}

function drawStartCell(grid: ClassGrid, path: DiagramPoint[], markerKind: ClassRelationshipKind | undefined): void {
  const start = path[0]!
  const next = path[1]!
  const direction = directionBetween(start, next) ?? "right"
  const marker = markerKind ? relationshipMarker(markerKind, opposite(direction)) : undefined
  if (marker) setCell(grid, start.x, start.y, marker, "edge")
  else setCell(grid, start.x, start.y, diagramLineGlyph(new Set([direction])), "edge")
}

function drawEndCell(grid: ClassGrid, path: DiagramPoint[], markerKind: ClassRelationshipKind | undefined): void {
  const end = path[path.length - 1]!
  const previous = path[path.length - 2]!
  const direction = directionBetween(previous, end) ?? "right"
  const marker = markerKind ? relationshipMarker(markerKind, direction) : undefined
  if (marker) setCell(grid, end.x, end.y, marker, "edge")
  else setCell(grid, end.x, end.y, diagramLineGlyph(new Set([direction])), "edge")
}

function relationshipMarker(kind: ClassRelationshipKind, direction: DiagramDirection): string | undefined {
  switch (kind) {
    case "inheritance":
    case "realization":
      return HOLLOW_TRIANGLE[direction]
    case "composition":
      return FILLED_DIAMOND
    case "aggregation":
      return HOLLOW_DIAMOND
    case "association":
    case "dependency":
      return OPEN_ARROW[direction]
    case "link":
      return undefined
  }
}

function opposite(direction: DiagramDirection): DiagramDirection {
  switch (direction) {
    case "up":
      return "down"
    case "down":
      return "up"
    case "left":
      return "right"
    case "right":
      return "left"
  }
}

function drawEdgeLabels(grid: ClassGrid, edge: ClassEdge): void {
  const { relationship, path } = edge
  let labelWidth = 0
  let labelHeight = 0
  let labelX = 0
  let labelY = 0
  if (relationship.label) {
    const lines = splitDiagramLines(relationship.label)
    labelWidth = Math.max(...lines.map(diagramTextWidth))
    labelHeight = lines.length
    const anchor = labelAnchor(path, lines.length, labelWidth)
    labelX = anchor.x
    labelY = anchor.y
    drawTextTag(grid, anchor.x, anchor.y, lines)
  }
  if (relationship.fromCardinality) {
    const width = diagramTextWidth(relationship.fromCardinality)
    const anchor = cardinalityAnchor(path, width, true, labelX, labelY, labelWidth, labelHeight)
    drawTextTag(grid, anchor.x, anchor.y, [relationship.fromCardinality])
  }
  if (relationship.toCardinality) {
    const width = diagramTextWidth(relationship.toCardinality)
    const anchor = cardinalityAnchor(path, width, false, labelX, labelY, labelWidth, labelHeight)
    drawTextTag(grid, anchor.x, anchor.y, [relationship.toCardinality])
  }
}

function labelAnchor(path: DiagramPoint[], lineCount: number, width: number): DiagramPoint {
  let bestFrom = path[0]!
  let bestTo = path[path.length - 1]!
  let bestLength = -1
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
  const midX = Math.floor((bestFrom.x + bestTo.x) / 2)
  const midY = Math.floor((bestFrom.y + bestTo.y) / 2)
  if (bestFrom.y === bestTo.y) return { x: midX - Math.floor(width / 2), y: bestFrom.y - lineCount }
  if (bestFrom.x === bestTo.x) return { x: bestFrom.x + 2, y: midY - Math.floor(lineCount / 2) }
  return { x: midX, y: midY }
}

function cardinalityAnchor(
  path: DiagramPoint[],
  width: number,
  atStart: boolean,
  labelX: number,
  labelY: number,
  labelWidth: number,
  labelHeight: number,
): DiagramPoint {
  const point = atStart ? path[0]! : path[path.length - 1]!
  const neighbor = atStart ? path[1]! : path[path.length - 2]!
  // Direction points from the endpoint into the line, so one step lands just inside it.
  const direction = directionBetween(point, neighbor) ?? "right"
  const horizontal = direction === "left" || direction === "right"
  const baseX = point.x + (horizontal ? (direction === "right" ? 1 : -1) : 0)
  const baseY = point.y + (horizontal ? 0 : direction === "down" ? 1 : -1)
  const candidates: DiagramPoint[] = horizontal
    ? [
        { x: baseX, y: baseY - 1 },
        { x: baseX, y: baseY + 1 },
        { x: baseX, y: baseY - 2 },
        { x: baseX, y: baseY + 2 },
      ]
    : [
        { x: baseX + 1, y: baseY },
        { x: baseX - 1, y: baseY },
        { x: baseX + 1, y: baseY - 1 },
        { x: baseX + 1, y: baseY + 1 },
        { x: baseX - 1, y: baseY - 1 },
        { x: baseX - 1, y: baseY + 1 },
      ]
  for (const candidate of candidates) {
    if (!touchesLabel(candidate.x, width, candidate.y, 1, labelX, labelY, labelWidth, labelHeight)) return candidate
  }
  return candidates[0]!
}

function touchesLabel(
  x: number,
  width: number,
  y: number,
  height: number,
  labelX: number,
  labelY: number,
  labelWidth: number,
  labelHeight: number,
): boolean {
  if (labelWidth <= 0 || labelHeight <= 0) return false
  const rowOverlap = y <= labelY + labelHeight - 1 && y + height - 1 >= labelY
  if (!rowOverlap) return false
  // On a shared row keep at least one blank column so the two tags stay legible.
  const clearX = x + width < labelX || x > labelX + labelWidth
  return !clearX
}

function drawTextTag(grid: ClassGrid, x: number, y: number, lines: string[]): void {
  lines.forEach((line, index) => {
    const row = y + index
    if (grid.getCell(x - 1, row)?.char === " ") setCell(grid, x - 1, row, " ", "label")
    setText(grid, x, row, line, "label")
    const rightX = x + diagramTextWidth(line)
    if (grid.getCell(rightX, row)?.char === " ") setCell(grid, rightX, row, " ", "label")
  })
}

function setText(grid: ClassGrid, x: number, y: number, text: string, style?: ClassCellStyle): void {
  grid.setText(x, y, text, style)
}
