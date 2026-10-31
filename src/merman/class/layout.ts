import {
  diagramBoundsFromRect,
  translateDiagramBounds,
  type DiagramBounds,
  type DiagramPoint,
} from "../core/geometry.js"
import { diagramTextWidth, splitDiagramLines } from "../core/text.js"
import type { ClassDefinition, ClassDiagram, ClassDiagramDirection, ClassRelationship } from "./types.js"

export interface ClassBox {
  definition: ClassDefinition
  bounds: DiagramBounds
  titleLines: string[]
  attributeLines: string[]
  methodLines: string[]
  contentWidth: number
}

export interface ClassEdge {
  relationship: ClassRelationship
  fromId: string
  toId: string
  from: DiagramBounds
  to: DiagramBounds
  path: DiagramPoint[]
}

export interface ClassDiagramLayout {
  direction: ClassDiagramDirection
  boxes: ClassBox[]
  edges: ClassEdge[]
  width: number
  height: number
}

/** Left offset of a box's content from the box's left border (1 border + 1 pad). */
export const CLASS_CONTENT_OFFSET_X = 2

const CONTENT_PADDING = 2
const NODE_H_GAP = 6
const NODE_MIN_GAP = 3
const MARGIN_TOP = 2
const MARGIN_RIGHT = 4
const MARGIN_BOTTOM = 2

interface BoxMetrics {
  titleLines: string[]
  attributeLines: string[]
  methodLines: string[]
  contentWidth: number
  width: number
  height: number
}

interface RankBand {
  start: number
  end: number
}

interface EdgeRecord {
  relationship: ClassRelationship
  from: ClassDefinition
  to: ClassDefinition
  fromRank: number
  toRank: number
}

type CorridorSide = "low" | "high"

/** Convert `List~int~` generics into `List<int>` for display only. */
export function displayClassName(id: string): string {
  let open = true
  return id.replace(/~/g, () => {
    const glyph = open ? "<" : ">"
    open = !open
    return glyph
  })
}

export function classBoxSectionLines(
  definition: ClassDefinition,
): Pick<BoxMetrics, "titleLines" | "attributeLines" | "methodLines"> {
  return {
    titleLines: [...(definition.stereotype ? [`«${definition.stereotype}»`] : []),
      displayClassName(definition.label ?? definition.id)],
    attributeLines: [
      ...definition.members.filter((member) => !member.method).map((member) => member.text),
      ...(definition.notes ?? []).map((note) => `ⓘ ${note}`),
    ],
    methodLines: definition.members.filter((member) => member.method).map((member) => member.text),
  }
}

function measureBox(definition: ClassDefinition): BoxMetrics {
  const { titleLines, attributeLines, methodLines } = classBoxSectionLines(definition)
  const contentWidth = Math.max(
    1,
    ...titleLines.map(diagramTextWidth),
    ...attributeLines.map(diagramTextWidth),
    ...methodLines.map(diagramTextWidth),
  )
  let height = 2 + titleLines.length
  if (attributeLines.length) height += 1 + attributeLines.length
  if (methodLines.length) height += 1 + methodLines.length
  return { titleLines, attributeLines, methodLines, contentWidth, width: contentWidth + CONTENT_PADDING * 2, height }
}

export function layoutClassDiagram(diagram: ClassDiagram, direction: ClassDiagramDirection): ClassDiagramLayout {
  const vertical = direction === "TB" || direction === "BT"
  const metrics = new Map(diagram.classes.map((definition) => [definition.id, measureBox(definition)]))
  const rank = computeRanks(diagram, direction)
  const byId = new Map(diagram.classes.map((definition) => [definition.id, definition]))
  const groups = new Map<number, ClassDefinition[]>()
  for (const definition of diagram.classes) {
    const key = rank.get(definition.id) ?? 0
    const list = groups.get(key) ?? []
    list.push(definition)
    groups.set(key, list)
  }
  const rankKeys = [...groups.keys()].sort((left, right) => left - right)
  const records: EdgeRecord[] = diagram.relationships.map((relationship) => ({
    relationship,
    from: byId.get(relationship.from)!,
    to: byId.get(relationship.to)!,
    fromRank: rank.get(relationship.from) ?? 0,
    toRank: rank.get(relationship.to) ?? 0,
  }))
  const spacing = computeSpacing(records, vertical)
  const boxes: ClassBox[] = []
  const boxById = new Map<string, ClassBox>()
  const bands = new Map<number, RankBand>()

  let mainExtent = 0
  if (vertical) {
    const laneWidths = rankKeys.map((key) => laneWidth(groups.get(key)!, metrics))
    const totalWidth = Math.max(0, ...laneWidths)
    let y = 0
    rankKeys.forEach((key, index) => {
      const nodes = groups.get(key)!
      const bandHeight = Math.max(0, ...nodes.map((node) => metrics.get(node.id)!.height))
      let x = Math.floor((totalWidth - laneWidths[index]!) / 2)
      for (const definition of nodes) {
        const size = metrics.get(definition.id)!
        const box = makeBox(definition, x, y, size)
        boxes.push(box)
        boxById.set(definition.id, box)
        x += size.width + NODE_H_GAP
      }
      bands.set(key, { start: y, end: y + bandHeight - 1 })
      y += bandHeight + spacing.gapFor(key)
    })
    mainExtent = Math.max(0, ...boxes.map((box) => box.bounds.left + box.bounds.width))
  } else {
    const laneHeights = rankKeys.map((key) => laneHeight(groups.get(key)!, metrics))
    const totalHeight = Math.max(0, ...laneHeights)
    let x = 0
    rankKeys.forEach((key, index) => {
      const nodes = groups.get(key)!
      const bandWidth = Math.max(0, ...nodes.map((node) => metrics.get(node.id)!.width))
      let y = Math.floor((totalHeight - laneHeights[index]!) / 2)
      for (const definition of nodes) {
        const size = metrics.get(definition.id)!
        const box = makeBox(definition, x, y, size)
        boxes.push(box)
        boxById.set(definition.id, box)
        y += size.height + NODE_MIN_GAP
      }
      bands.set(key, { start: x, end: x + bandWidth - 1 })
      x += bandWidth + spacing.gapFor(key)
    })
    mainExtent = Math.max(0, ...boxes.map((box) => box.bounds.top + box.bounds.height))
  }

  const corridors: Record<CorridorSide, number> = { low: 0, high: 0 }
  const takeCorridor = (side: CorridorSide): number => {
    const index = corridors[side]++
    return side === "low" ? -3 - index : mainExtent + 3 + index
  }
  const bandFor = (rank: number): RankBand => bands.get(rank)!
  const edges = records.map((record, edgeIndex) => {
    const from = boxById.get(record.from.id)!
    const to = boxById.get(record.to.id)!
    const lane = (gap: number): number =>
      bands.get(gap)!.end + spacing.laneBase + spacing.laneFor(gap, edgeIndex) * spacing.stride
    const tieBreak: CorridorSide = edgeIndex % 2 === 0 ? "low" : "high"
    const path = vertical
      ? verticalRoute(record, from.bounds, to.bounds, lane, bandFor, mainExtent, tieBreak, takeCorridor)
      : horizontalRoute(record, from.bounds, to.bounds, lane, bandFor, mainExtent, tieBreak, takeCorridor)
    return {
      relationship: record.relationship,
      fromId: record.from.id,
      toId: record.to.id,
      from: from.bounds,
      to: to.bounds,
      path: dedupePath(path),
    }
  })

  return finalize(boxes, edges, direction)
}

function makeBox(definition: ClassDefinition, x: number, y: number, size: BoxMetrics): ClassBox {
  return {
    definition,
    bounds: diagramBoundsFromRect(x, y, size.width, size.height),
    titleLines: size.titleLines,
    attributeLines: size.attributeLines,
    methodLines: size.methodLines,
    contentWidth: size.contentWidth,
  }
}

function laneWidth(nodes: readonly ClassDefinition[], metrics: Map<string, BoxMetrics>): number {
  if (nodes.length === 0) return 0
  return nodes.reduce((sum, node) => sum + metrics.get(node.id)!.width, 0) + (nodes.length - 1) * NODE_H_GAP
}

function laneHeight(nodes: readonly ClassDefinition[], metrics: Map<string, BoxMetrics>): number {
  if (nodes.length === 0) return 0
  return nodes.reduce((sum, node) => sum + metrics.get(node.id)!.height, 0) + (nodes.length - 1) * NODE_MIN_GAP
}

function gapIndices(record: EdgeRecord): number[] {
  const upper = Math.min(record.fromRank, record.toRank)
  const lower = Math.max(record.fromRank, record.toRank)
  // Long relationships use fixed rows next to their boxes and a side corridor.
  // They do not reserve lanes in the rank gaps, so one back edge cannot inflate
  // the spacing of the whole diagram.
  return lower - upper <= 1 ? [upper] : []
}

interface SpacingPlan {
  stride: number
  laneBase: number
  gapFor: (gap: number) => number
  laneFor: (gap: number, edgeIndex: number) => number
}

function computeSpacing(records: readonly EdgeRecord[], vertical: boolean): SpacingPlan {
  const groupsByGap = new Map<number, Map<string, number>>()
  const laneByEdge = new Map<string, number>()
  const labelWidthByGap = new Map<number, number>()
  for (const [edgeIndex, record] of records.entries()) {
    const label = record.relationship.label ?? ""
    for (const gap of new Set(gapIndices(record))) {
      const groups = groupsByGap.get(gap) ?? new Map<string, number>()
      const groupKey = `${record.from.id}\u0000${label}`
      let slot = groups.get(groupKey)
      if (slot === undefined) {
        slot = groups.size
        groups.set(groupKey, slot)
      }
      groupsByGap.set(gap, groups)
      laneByEdge.set(`${edgeIndex}:${gap}`, slot)
      if (label) {
        const labelWidth = Math.max(...splitDiagramLines(label).map(diagramTextWidth))
        labelWidthByGap.set(gap, Math.max(labelWidthByGap.get(gap) ?? 0, labelWidth))
      }
    }
  }

  const stride = vertical
    ? 2
    : Math.max(2, Math.max(0, ...labelWidthByGap.values()) + 2)
  const laneBase = vertical ? 2 : 1
  const gapSizes = new Map<number, number>()
  for (const [gap, groups] of groupsByGap) {
    // Slot lanes occupy band.end + laneBase + slot*stride. Reserve one extra
    // stride so the deepest lane never lands on `child.top - 1`; that would
    // collapse the final vertical drop onto the box border.
    const gapSize = vertical
      ? Math.max(NODE_MIN_GAP, laneBase + groups.size * stride)
      : Math.max(NODE_MIN_GAP, Math.max(0, groups.size - 1) * stride + (labelWidthByGap.get(gap) ?? 0) + 3)
    gapSizes.set(gap, gapSize)
  }

  return {
    stride,
    laneBase,
    gapFor: (gap) => gapSizes.get(gap) ?? NODE_MIN_GAP,
    laneFor: (gap, edgeIndex) => laneByEdge.get(`${edgeIndex}:${gap}`) ?? 0,
  }
}

function chooseCorridorSide(from: number, to: number, extent: number, tieBreak: CorridorSide): CorridorSide {
  const low = -3
  const high = extent + 3
  const lowCost = Math.abs(from - low) + Math.abs(to - low)
  const highCost = Math.abs(from - high) + Math.abs(to - high)
  if (lowCost === highCost) return tieBreak
  return lowCost < highCost ? "low" : "high"
}

function sideInset(size: number): number {
  return Math.max(1, Math.min(2, Math.floor((size - 2) / 2)))
}

function sidePortX(bounds: DiagramBounds, side: CorridorSide): number {
  const inset = sideInset(bounds.width)
  return side === "low" ? bounds.left + inset : bounds.left + bounds.width - 1 - inset
}

function sidePortY(bounds: DiagramBounds, side: CorridorSide): number {
  const inset = sideInset(bounds.height)
  return side === "low" ? bounds.top + inset : bounds.top + bounds.height - 1 - inset
}

function verticalRoute(
  record: EdgeRecord,
  from: DiagramBounds,
  to: DiagramBounds,
  laneFor: (gap: number) => number,
  bandFor: (rank: number) => RankBand,
  mainExtent: number,
  tieBreak: CorridorSide,
  takeCorridor: (side: CorridorSide) => number,
): DiagramPoint[] {
  const { fromRank, toRank } = record
  if (fromRank === toRank) {
    const lane = laneFor(fromRank)
    return [
      point(from.centerX, from.top + from.height),
      point(from.centerX, lane),
      point(to.centerX, lane),
      point(to.centerX, to.top + to.height),
    ]
  }
  const upper = Math.min(fromRank, toRank)
  const lower = Math.max(fromRank, toRank)
  if (lower - upper === 1) {
    const lane = laneFor(upper)
    return fromRank < toRank
      ? [
          point(from.centerX, from.top + from.height),
          point(from.centerX, lane),
          point(to.centerX, lane),
          point(to.centerX, to.top - 1),
        ]
      : [
          point(from.centerX, from.top - 1),
          point(from.centerX, lane),
          point(to.centerX, lane),
          point(to.centerX, to.top + to.height),
        ]
  }
  const side = chooseCorridorSide(from.centerX, to.centerX, mainExtent, tieBreak)
  const corridorX = takeCorridor(side)
  const sourceX = sidePortX(from, side)
  const targetX = sidePortX(to, side)
  if (fromRank < toRank) {
    const sourceLane = bandFor(fromRank + 1).start - 1
    const targetLane = to.top - 2
    return [
      point(sourceX, from.top + from.height),
      point(sourceX, sourceLane),
      point(corridorX, sourceLane),
      point(corridorX, targetLane),
      point(targetX, targetLane),
      point(targetX, to.top - 1),
    ]
  }
  const sourceLane = bandFor(fromRank).start - 1
  const targetLane = bandFor(toRank + 1).start - 1
  return [
    point(sourceX, from.top - 1),
    point(sourceX, sourceLane),
    point(corridorX, sourceLane),
    point(corridorX, targetLane),
    point(targetX, targetLane),
    point(targetX, to.top + to.height),
  ]
}

function horizontalRoute(
  record: EdgeRecord,
  from: DiagramBounds,
  to: DiagramBounds,
  laneFor: (gap: number) => number,
  bandFor: (rank: number) => RankBand,
  mainExtent: number,
  tieBreak: CorridorSide,
  takeCorridor: (side: CorridorSide) => number,
): DiagramPoint[] {
  const { fromRank, toRank } = record
  if (fromRank === toRank) {
    const lane = laneFor(fromRank)
    return [
      point(from.left + from.width, from.centerY),
      point(lane, from.centerY),
      point(lane, to.centerY),
      point(to.left + to.width, to.centerY),
    ]
  }
  const upper = Math.min(fromRank, toRank)
  const lower = Math.max(fromRank, toRank)
  if (lower - upper === 1) {
    const lane = laneFor(upper)
    return fromRank < toRank
      ? [
          point(from.left + from.width, from.centerY),
          point(lane, from.centerY),
          point(lane, to.centerY),
          point(to.left - 1, to.centerY),
        ]
      : [
          point(from.left - 1, from.centerY),
          point(lane, from.centerY),
          point(lane, to.centerY),
          point(to.left + to.width, to.centerY),
        ]
  }
  const side = chooseCorridorSide(from.centerY, to.centerY, mainExtent, tieBreak)
  const corridorY = takeCorridor(side)
  const sourceY = sidePortY(from, side)
  const targetY = sidePortY(to, side)
  if (fromRank < toRank) {
    const sourceLane = bandFor(fromRank + 1).start - 1
    const targetLane = to.left - 2
    return [
      point(from.left + from.width, sourceY),
      point(sourceLane, sourceY),
      point(sourceLane, corridorY),
      point(targetLane, corridorY),
      point(targetLane, targetY),
      point(to.left - 1, targetY),
    ]
  }
  const sourceLane = bandFor(fromRank).start - 1
  const targetLane = bandFor(toRank + 1).start - 1
  return [
    point(from.left - 1, sourceY),
    point(sourceLane, sourceY),
    point(sourceLane, corridorY),
    point(targetLane, corridorY),
    point(targetLane, targetY),
    point(to.left + to.width, targetY),
  ]
}

function point(x: number, y: number): DiagramPoint {
  return { x, y }
}

function dedupePath(points: readonly DiagramPoint[]): DiagramPoint[] {
  const result: DiagramPoint[] = []
  for (const point of points) {
    const last = result[result.length - 1]
    if (!last || last.x !== point.x || last.y !== point.y) result.push(point)
  }
  return result
}

function computeRanks(diagram: ClassDiagram, direction: ClassDiagramDirection): Map<string, number> {
  const ids = diagram.classes.map((definition) => definition.id)
  const adjacency = new Map<string, Array<{ to: string; key: string }>>(ids.map((id) => [id, []]))
  const edges: Array<{ from: string; to: string; key: string }> = []
  for (const relationship of diagram.relationships) {
    const key = `${relationship.from}\u0000${relationship.to}\u0000${edges.length}`
    edges.push({ from: relationship.from, to: relationship.to, key })
    adjacency.get(relationship.from)?.push({ to: relationship.to, key })
  }

  const state = new Map<string, 0 | 1 | 2>()
  const back = new Set<string>()
  const visit = (id: string): void => {
    state.set(id, 1)
    for (const { to, key } of adjacency.get(id) ?? []) {
      const seen = state.get(to) ?? 0
      if (seen === 1) back.add(key)
      else if (seen === 0) visit(to)
    }
    state.set(id, 2)
  }
  for (const id of ids) if ((state.get(id) ?? 0) === 0) visit(id)

  const rank = new Map(ids.map((id) => [id, 0]))
  let changed = true
  let guard = ids.length + 1
  while (changed && guard-- > 0) {
    changed = false
    for (const edge of edges) {
      if (back.has(edge.key)) continue
      const next = (rank.get(edge.from) ?? 0) + 1
      if (next > (rank.get(edge.to) ?? 0)) {
        rank.set(edge.to, next)
        changed = true
      }
    }
  }

  if (direction === "BT" || direction === "RL") {
    const maxRank = Math.max(0, ...rank.values())
    for (const [id, value] of rank) rank.set(id, maxRank - value)
  }
  return rank
}

function finalize(boxes: ClassBox[], edges: ClassEdge[], direction: ClassDiagramDirection): ClassDiagramLayout {
  const points: DiagramPoint[] = [
    ...boxes.flatMap((box) => [
      { x: box.bounds.left, y: box.bounds.top },
      { x: box.bounds.left + box.bounds.width, y: box.bounds.top + box.bounds.height },
    ]),
    ...edges.flatMap((edge) => edge.path),
  ]
  const minX = Math.min(0, ...points.map((p) => p.x))
  const minY = Math.min(0, ...points.map((p) => p.y))
  const dx = -minX
  const dy = -minY + MARGIN_TOP
  if (dx !== 0 || dy !== 0) {
    for (const box of boxes) translateDiagramBounds(box.bounds, dx, dy)
    for (const edge of edges) {
      for (const p of edge.path) {
        p.x += dx
        p.y += dy
      }
    }
  }

  const maxX = Math.max(
    0,
    ...boxes.map((box) => box.bounds.left + box.bounds.width),
    ...edges.flatMap((edge) => edge.path.map((p) => p.x + 1)),
  )
  const maxY = Math.max(
    0,
    ...boxes.map((box) => box.bounds.top + box.bounds.height),
    ...edges.flatMap((edge) => edge.path.map((p) => p.y + 1)),
  )
  return { direction, boxes, edges, width: maxX + MARGIN_RIGHT, height: maxY + MARGIN_BOTTOM }
}
