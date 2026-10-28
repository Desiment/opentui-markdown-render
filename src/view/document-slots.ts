import { createSignal } from "solid-js"
import type { Block } from "../core/document"

export type Slot = {
  kind: Block["type"]
  block: () => Block
  update: (b: Block) => void
}

function sameKind(old: Block, next: Block): boolean {
  if (old.type !== next.type) return false
  return old.type !== "mermaid" || (next.type === "mermaid" && old.language === next.language)
}

export function reconcileSlots(prev: Slot[], next: Block[]): Slot[] {
  if (prev.length === 0) {
    return next.map((b) => {
      const [get, set] = createSignal(b)
      return { kind: b.type, block: get, update: set }
    })
  }
  // prefix
  let prefix = 0
  while (prefix < prev.length && prefix < next.length && sameKind(prev[prefix].block(), next[prefix]) && prev[prefix].block().raw === next[prefix].raw) {
    prefix++
  }
  // suffix
  let suffix = 0
  while (
    suffix < prev.length - prefix &&
    suffix < next.length - prefix &&
    sameKind(prev[prev.length - 1 - suffix].block(), next[next.length - 1 - suffix]) &&
    prev[prev.length - 1 - suffix].block().raw === next[next.length - 1 - suffix].raw
  ) {
    suffix++
  }
  const result: Slot[] = []
  // prefix
  for (let i = 0; i < prefix; i++) result.push(prev[i])
  // middle
  if (prev.length - prefix - suffix === 1 && next.length - prefix - suffix === 1) {
    // reuse slot
    const slot = prev[prefix]
    if (sameKind(slot.block(), next[prefix])) {
      slot.update(next[prefix])
      result.push(slot)
    } else {
      const [get, set] = createSignal(next[prefix])
      result.push({ kind: next[prefix].type, block: get, update: set })
    }
  } else {
    for (let i = prefix; i < next.length - suffix; i++) {
      const b = next[i]
      const [get, set] = createSignal(b)
      result.push({ kind: b.type, block: get, update: set })
    }
  }
  // suffix
  for (let i = prev.length - suffix; i < prev.length; i++) result.push(prev[i])
  return result
}
