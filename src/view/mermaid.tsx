import { createSignal } from "solid-js"
import { StyledText } from "@opentui/core"
import { measureMermaidDiagram, type PreparedDiagram } from "../merman/markdown"
import { resolveOpenCodeDiagramPalette } from "../merman/palette"
import type { Theme } from "../theme/types"

export type MermaidDiagramViewProps = {
  source: string
  theme: Theme
  columns: number
  mermaidOptions: any
}

export function MermaidDiagramView(props: MermaidDiagramViewProps) {
  const [lastGood, setLastGood] = createSignal<PreparedDiagram | undefined>(undefined)

  const prepared = () => {
    try {
      const palette = resolveOpenCodeDiagramPalette(props.theme as any)
      const config = {
        palette,
        layoutMaxWidth: props.mermaidOptions?.layoutMaxWidth ?? Math.min(120, props.columns),
        padding: props.mermaidOptions?.padding ?? 2,
        compact: props.mermaidOptions?.compact ?? false,
      }
      const p = measureMermaidDiagram(props.source, config as any)
      setLastGood(p)
      return p
    } catch (e) {
      const lg = lastGood()
      if (lg) return lg
      return undefined
    }
  }

  return (
    <box width="100%" flexDirection="column" flexShrink={0}>
      {(() => {
        const p = prepared()
        if (!p) {
          return <text content={props.source} fg={props.theme.markdown.codeBlock} />
        }
        return (
          <text
            ref={(r: any) => {
              if (r && p) {
                r.content = p.text
                r.width = "100%"
                r.height = p.height
                r.wrapMode = "none"
                r.selectable = false
                r.marginTop = 1
              }
            }}
          />
        )
      })()}
    </box>
  )
}
