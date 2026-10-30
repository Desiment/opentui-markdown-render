import { createSignal } from "solid-js"
import type { Block, SourceRange } from "../core/document"

export type Slot = {
  kind: Block["type"]
  // Rendering observes block; unit metadata observes latest. Moving a source
  // range must not recreate a stateful rendered block.
  block: () => Block
  update: (b: Block) => void
  latest: () => Block
  updateLatest: (b: Block) => void
}

function sameKind(old: Block, next: Block): boolean {
  if (old.type !== next.type) return false
  return old.type !== "mermaid" || (next.type === "mermaid" && old.language === next.language)
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) {
    const other = b as unknown[]
    return a.length === other.length && a.every((value, index) => sameValue(value, other[index]))
  }
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = Object.keys(left)
  const otherKeys = Object.keys(right)
  return keys.filter((key) => key !== "source").length === otherKeys.filter((key) => key !== "source").length &&
    keys.every((key) => key === "source" || (Object.prototype.hasOwnProperty.call(right, key) && sameValue(left[key], right[key])))
}

function sameBlock(old: Block, next: Block): boolean {
  return sameValue(old, next)
}

function sameRange(old: SourceRange | null | undefined, next: SourceRange | null | undefined): boolean {
  return old?.start === next?.start && old?.end === next?.end
}

function sameUnitRanges(old: Block, next: Block): boolean {
  if (!sameRange(old.source, next.source)) return false
  if (old.type !== "list" || next.type !== "list") return true
  return old.items.length === next.items.length &&
    old.items.every((item, index) => sameRange(item.source, next.items[index]?.source))
}

function refresh(slot: Slot, next: Block): void {
  const changed = !sameBlock(slot.block(), next)
  if (changed) slot.update(next)
  // Even when the render tree is identical, the host needs current offsets.
  if (changed || !sameUnitRanges(slot.latest(), next)) slot.updateLatest(next)
}

function createSlot(block: Block): Slot {
  const [get, set] = createSignal(block)
  const [latest, updateLatest] = createSignal(block)
  return { kind: block.type, block: get, update: set, latest, updateLatest }
}

export function reconcileSlots(prev: Slot[], next: Block[]): Slot[] {
  if (prev.length === 0) {
    return next.map(createSlot)
  }
  // prefix
  let prefix = 0
  while (prefix < prev.length && prefix < next.length) {
    const old = prev[prefix].block()
    const incoming = next[prefix]
    if (!sameKind(old, incoming) || old.raw !== incoming.raw) break
    refresh(prev[prefix], incoming)
    prefix++
  }
  // suffix
  let suffix = 0
  while (
    suffix < prev.length - prefix &&
    suffix < next.length - prefix
  ) {
    const old = prev[prev.length - 1 - suffix].block()
    const incoming = next[next.length - 1 - suffix]
    if (!sameKind(old, incoming) || old.raw !== incoming.raw) break
    refresh(prev[prev.length - 1 - suffix], incoming)
    suffix++
  }
  const result: Slot[] = []
  // prefix
  for (let i = 0; i < prefix; i++) result.push(prev[i])
  // middle
  if (prev.length - prefix - suffix === 1 && next.length - prefix - suffix === 1) {
    // reuse slot
    const slot = prev[prefix]
    const incoming = next[prefix]
    if (sameKind(slot.block(), incoming)) {
      refresh(slot, incoming)
      result.push(slot)
    } else {
      result.push(createSlot(incoming))
    }
  } else {
    for (let i = prefix; i < next.length - suffix; i++) {
      const b = next[i]
      result.push(createSlot(b))
    }
  }
  // suffix
  for (let i = prev.length - suffix; i < prev.length; i++) result.push(prev[i])
  return result
}
