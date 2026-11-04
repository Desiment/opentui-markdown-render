import { loadNativeMath, NativeMathUnavailableError } from "./native"

export type RenderedMath = {
  readonly png: Uint8Array
  readonly pixelWidth: number
  readonly pixelHeight: number
  readonly baseline: number
  // Whether the raster was scaled below the standard text size to fit a single
  // text row. A formula that was not scaled can keep that size.
  readonly clamped: boolean
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
  // Keep the standard text size instead of scaling the formula down to the
  // single text row it shares with the prose around it.
  readonly standard?: boolean
}

const limit = 128
const cache = new Map<string, Promise<RenderedMath | undefined>>()

// Invalid formulae are intentionally holes so callers retain the exact LaTeX
// source. A missing addon remains an error because it is an installation fault,
// not an unsupported formula.
export function renderMath(request: MathRenderRequest) {
  if (request.enabled === false) return Promise.resolve(undefined)
  const scale = request.scale ?? 2
  const display = request.display ?? false
  const cellWidth = request.cellWidth ?? 8
  const cellHeight = request.cellHeight ?? 16
  const compact = request.compact ?? false
  const standard = request.standard ?? false
  const key = JSON.stringify({
    latex: request.latex,
    scale,
    foreground: request.foreground,
    background: request.background,
    display,
    cellWidth,
    cellHeight,
    compact,
    standard,
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
        standard,
      })
      return {
        png: image.png,
        pixelWidth: image.pixelWidth,
        pixelHeight: image.pixelHeight,
        baseline: image.baseline,
        clamped: image.clamped,
      }
    })
    .catch((error) => {
      if (error instanceof NativeMathUnavailableError) throw error
      return undefined
    })
  cache.set(key, result)
  if (cache.size > limit) cache.delete(cache.keys().next().value!)
  return result
}

export function clearMathCache() {
  cache.clear()
}
