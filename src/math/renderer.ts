import { loadNativeMath } from "./native"

export type RenderedMath = {
  readonly png: Uint8Array
  readonly pixelWidth: number
  readonly pixelHeight: number
  readonly baseline: number
}

export type MathRenderRequest = {
  readonly latex: string
  readonly scale?: number
  readonly enabled?: boolean
  readonly foreground?: string
  readonly background?: string
  readonly display?: boolean
  readonly cellWidth?: number
  readonly cellHeight?: number
  readonly compact?: boolean
}

const limit = 128
const cache = new Map<string, Promise<RenderedMath | undefined>>()

// A rejected render is intentionally a hole: callers keep the exact LaTeX
// source in the layout instead of replacing it with an approximation.
export function renderMath(request: MathRenderRequest) {
  if (request.enabled === false) return Promise.resolve(undefined)
  const scale = request.scale ?? 2
  const display = request.display ?? false
  const cellWidth = request.cellWidth ?? 8
  const cellHeight = request.cellHeight ?? 16
  const compact = request.compact ?? false
  const key = JSON.stringify({
    latex: request.latex,
    scale,
    foreground: request.foreground,
    background: request.background,
    display,
    cellWidth,
    cellHeight,
    compact,
  })
  const cached = cache.get(key)
  if (cached) return cached
  const result = loadNativeMath()
    .then(async (native) => {
      if (!native) return undefined
      const image = await native.renderLatex({
        latex: request.latex,
        scale,
        foreground: request.foreground,
        background: request.background,
        display,
        cellWidth,
        cellHeight,
        compact,
      })
      return { png: image.png, pixelWidth: image.pixelWidth, pixelHeight: image.pixelHeight, baseline: image.baseline }
    })
    .catch(() => undefined)
  cache.set(key, result)
  if (cache.size > limit) cache.delete(cache.keys().next().value!)
  return result
}

export function clearMathCache() {
  cache.clear()
}
