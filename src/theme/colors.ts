import { RGBA } from "@opentui/core"

// Mixes `over` into `base` with the given weight. The result is opaque, so a
// tint computed this way can be used as a solid background.
export function mixColors(over: RGBA, base: RGBA, ratio: number): RGBA {
  const weight = Math.min(Math.max(ratio, 0), 1)
  const [overR, overG, overB] = over.toInts()
  const [baseR, baseG, baseB] = base.toInts()
  const channel = (from: number, to: number) => Math.round(to + (from - to) * weight)
  return RGBA.fromInts(channel(overR, baseR), channel(overG, baseG), channel(overB, baseB), 255)
}
