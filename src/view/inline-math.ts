import { createResource } from "solid-js"
import { mathImageID, renderMathImage, rgbaToHex, type CellSize, type MathImage } from "../math"
import type { CanvasGraphics } from "../graphics"

export function useInlineMathImages(
  contents: () => string[],
  opts: () => { foreground: any; background: any; cell: CellSize; graphics: CanvasGraphics; scale: number },
) {
  const [images] = createResource(contents, async (list) => {
    const map = new Map<string, { normal: MathImage; compact: MathImage; standard: MathImage }>()
    for (const content of list) {
      const o = opts()
      try {
        const bg = rgbaToHex(o.background)
        const keyNormal = mathImageID(content, false, rgbaToHex(o.foreground), o.cell, o.scale, false, false) + "-" + bg
        const keyCompact = mathImageID(content, false, rgbaToHex(o.foreground), o.cell, o.scale, true, false) + "-" + bg
        const keyStandard = mathImageID(content, false, rgbaToHex(o.foreground), o.cell, o.scale, false, true) + "-" + bg
        const [normal, compact, standard] = await Promise.all([
          renderMathImage(content, false, o.foreground, o.background, o.cell, o.scale, false, false),
          renderMathImage(content, false, o.foreground, o.background, o.cell, o.scale, true, false),
          renderMathImage(content, false, o.foreground, o.background, o.cell, o.scale, false, true),
        ])
        if (normal && compact && standard) map.set(content, { normal, compact, standard })
      } catch (e) {
        // leave missing, will fallback to text
      }
    }
    return map
  })
  return images
}
