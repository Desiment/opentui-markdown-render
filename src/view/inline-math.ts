import { createMemo, createResource, type Accessor } from "solid-js"
import { renderMathImage, type MathImage } from "../math"
import type { CellSize } from "../graphics"

export type InlineMathImages = Map<string, { normal: MathImage; compact: MathImage; standard: MathImage }>

export function useInlineMathImages(
  contents: Accessor<readonly string[]>,
  foreground: Accessor<string>,
  background: Accessor<string>,
  cell: Accessor<CellSize | null>,
): Accessor<InlineMathImages> {
  const [rendered] = createResource(
    () => JSON.stringify({ contents: contents(), color: foreground(), surface: background(), cell: cell() }),
    async (key) => {
      const input = JSON.parse(key) as { contents: string[]; color: string; surface: string; cell: CellSize | null }
      return Promise.all(input.contents.map(async (content) => {
        try {
          const normal = await renderMathImage(content, false, input.color, input.surface, input.cell)
          if (!normal) return undefined
          const compact = normal.rows > 1
            ? await renderMathImage(content, false, input.color, input.surface, input.cell, 1, true)
            : normal
          const standard = normal.clamped
            ? await renderMathImage(content, false, input.color, input.surface, input.cell, 1, false, true)
            : normal
          return { normal, compact: compact ?? normal, standard: standard ?? normal }
        } catch {
          return undefined
        }
      }))
    },
  )
  return createMemo(() => {
    const values = rendered()
    if (!values) return new Map()
    return new Map(contents().flatMap((content, index) => {
      const image = values[index]
      return image ? [[content, image] as const] : []
    }))
  })
}
