import { Graph, layout, type EdgeLabel, type GraphLabel, type NodeLabel, type Point } from "@dagrejs/dagre"
import { diagramTextWidth, splitDiagramLines } from "../core/text.js"
import { translateDiagramBounds, type DiagramBounds, type DiagramPoint } from "../core/geometry.js"
import { classLabelAnchor } from "./labels.js"
import {
  finalizeClassDiagramLayout,
  makeClassBox,
  measureClassBox,
  type ClassBox,
  type ClassDiagramLayout,
  type ClassEdge,
} from "./layout.js"
import type { ClassDiagram, ClassDiagramDirection } from "./types.js"

type Side = "top" | "bottom" | "left" | "right"

function attachment(box: DiagramBounds, center: Point, size: { width: number; height: number }, point: Point): DiagramPoint {
  const sides: Array<[Side, number]> = [
    ["top", Math.abs(point.y - (center.y - size.height / 2))],
    ["bottom", Math.abs(point.y - (center.y + size.height / 2))],
    ["left", Math.abs(point.x - (center.x - size.width / 2))],
    ["right", Math.abs(point.x - (center.x + size.width / 2))],
  ]
  const side = sides.reduce((best, entry) => entry[1] < best[1] ? entry : best)[0]
  const x = Math.max(box.left + 1, Math.min(box.left + box.width - 2, Math.round(point.x)))
  const y = Math.max(box.top + 1, Math.min(box.top + box.height - 2, Math.round(point.y)))
  if (side === "top") return { x, y: box.top - 1 }
  if (side === "bottom") return { x, y: box.top + box.height }
  if (side === "left") return { x: box.left - 1, y }
  return { x: box.left + box.width, y }
}

function intersectsBox(from: DiagramPoint, to: DiagramPoint, box: DiagramBounds): boolean {
  const right = box.left + box.width - 1
  const bottom = box.top + box.height - 1
  if (from.y === to.y) return from.y >= box.top && from.y <= bottom &&
    Math.max(from.x, to.x) >= box.left && Math.min(from.x, to.x) <= right
  return from.x >= box.left && from.x <= right &&
    Math.max(from.y, to.y) >= box.top && Math.min(from.y, to.y) <= bottom
}

function orthogonalize(
  points: readonly DiagramPoint[],
  boxes: readonly ClassBox[],
  vertical: boolean,
): DiagramPoint[] {
  const result: DiagramPoint[] = [points[0]!]
  for (const to of points.slice(1)) {
    const from = result[result.length - 1]!
    if (from.x !== to.x && from.y !== to.y) {
      const candidates = vertical
        ? [{ x: from.x, y: to.y }, { x: to.x, y: from.y }]
        : [{ x: to.x, y: from.y }, { x: from.x, y: to.y }]
      const cost = (bend: DiagramPoint): number => boxes.reduce((total, box) =>
        total + Number(intersectsBox(from, bend, box.bounds)) + Number(intersectsBox(bend, to, box.bounds)), 0)
      const bend = cost(candidates[1]!) < cost(candidates[0]!) ? candidates[1]! : candidates[0]!
      if (from.x !== bend.x || from.y !== bend.y) result.push(bend)
    }
    if (result.at(-1)!.x !== to.x || result.at(-1)!.y !== to.y) result.push(to)
  }
  return result
}

function selfLoop(box: DiagramBounds, vertical: boolean, offset: number, labelWidth: number): DiagramPoint[] {
  const left = box.left
  const right = box.left + box.width - 1
  const top = box.top
  const bottom = box.top + box.height - 1
  if (vertical) {
    const portX = right - 1
    const outsideX = right + Math.max(3, labelWidth + 3) + offset * 2
    return [
      { x: portX, y: bottom + 1 },
      { x: portX, y: bottom + 3 + offset },
      { x: outsideX, y: bottom + 3 + offset },
      { x: outsideX, y: top - 3 - offset },
      { x: portX, y: top - 3 - offset },
      { x: portX, y: top - 1 },
    ]
  }
  const portY = bottom - 1
  const outsideY = bottom + 3 + offset * 2
  return [
    { x: right + 1, y: portY },
    { x: right + 3 + offset, y: portY },
    { x: right + 3 + offset, y: outsideY },
    { x: left - 3 - offset, y: outsideY },
    { x: left - 3 - offset, y: portY },
    { x: left - 1, y: portY },
  ]
}

export function layoutDagreClassDiagram(diagram: ClassDiagram, direction: ClassDiagramDirection): ClassDiagramLayout {
  if (diagram.classes.length === 0) return { direction, boxes: [], edges: [], width: 0, height: 0 }
  const graph = new Graph<GraphLabel, NodeLabel, EdgeLabel>({ multigraph: true })
  graph.setGraph({ rankdir: direction, nodesep: 8, ranksep: 10, edgesep: 4 })
  graph.setDefaultEdgeLabel(() => ({}))
  const metrics = new Map(diagram.classes.map((definition) => [definition.id, measureClassBox(definition)]))
  for (const definition of diagram.classes) {
    const size = metrics.get(definition.id)!
    graph.setNode(definition.id, { width: size.width, height: size.height })
  }
  diagram.relationships.forEach((edge, index) => {
    const width = edge.label ? Math.max(...splitDiagramLines(edge.label).map(diagramTextWidth)) + 2 : 0
    const height = edge.label ? splitDiagramLines(edge.label).length + 1 : 0
    graph.setEdge(edge.from, edge.to, { width, height, weight: edge.kind === "inheritance" ? 2 : 1 }, String(index))
  })
  layout(graph)

  const boxes = diagram.classes.map((definition) => {
    const node = graph.node(definition.id)
    const size = metrics.get(definition.id)!
    return makeClassBox(definition, Math.round(node.x! - size.width / 2), Math.round(node.y! - size.height / 2), size)
  })
  const boxById = new Map(boxes.map((box) => [box.definition.id, box]))
  const vertical = direction === "TB" || direction === "BT"
  const loopCounts = new Map<string, number>()
  const edges: ClassEdge[] = diagram.relationships.map((relationship, index) => {
    const from = boxById.get(relationship.from)!.bounds
    const to = boxById.get(relationship.to)!.bounds
    if (relationship.from === relationship.to) {
      const offset = loopCounts.get(relationship.from) ?? 0
      loopCounts.set(relationship.from, offset + 1)
      return { relationship, fromId: relationship.from, toId: relationship.to, from, to,
        path: selfLoop(from, vertical, offset,
          relationship.label ? Math.max(...splitDiagramLines(relationship.label).map(diagramTextWidth)) : 0) }
    }
    const waypoints = graph.edge({ v: relationship.from, w: relationship.to, name: String(index) })?.points ?? []
    const source = graph.node(relationship.from)
    const target = graph.node(relationship.to)
    const first = waypoints[0] ?? { x: source.x!, y: source.y! }
    const last = waypoints.at(-1) ?? { x: target.x!, y: target.y! }
    const start = attachment(from, { x: source.x!, y: source.y! }, metrics.get(relationship.from)!, first)
    const end = attachment(to, { x: target.x!, y: target.y! }, metrics.get(relationship.to)!, last)
    const direct = (start.x === end.x || start.y === end.y) &&
      boxes.every((box) => !intersectsBox(start, end, box.bounds))
    const path = direct ? [start, end] : orthogonalize([
      start,
      ...waypoints.slice(1, -1).map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) })),
      end,
    ], boxes, vertical)
    return { relationship, fromId: relationship.from, toId: relationship.to, from, to, path }
  })
  const result = finalizeClassDiagramLayout(boxes, edges, direction)
  let minX = 0
  let minY = 0
  let maxX = result.width
  let maxY = result.height
  for (const edge of result.edges) {
    if (!edge.relationship.label) continue
    const lines = splitDiagramLines(edge.relationship.label)
    const width = Math.max(...lines.map(diagramTextWidth))
    const anchor = classLabelAnchor(edge.path, lines.length, width, vertical)
    minX = Math.min(minX, anchor.x - 1)
    minY = Math.min(minY, anchor.y)
    maxX = Math.max(maxX, anchor.x + width + 2)
    maxY = Math.max(maxY, anchor.y + lines.length + 1)
  }
  const dx = -minX
  const dy = -minY
  if (dx || dy) {
    for (const box of result.boxes) translateDiagramBounds(box.bounds, dx, dy)
    for (const edge of result.edges) for (const point of edge.path) {
      point.x += dx
      point.y += dy
    }
  }
  result.width = maxX + dx
  result.height = maxY + dy
  return result
}
