import { createEffect, createMemo, Show, type Accessor } from "solid-js"
import { type MouseEvent, type TextRenderable } from "@opentui/core"
import { measureMermaidDiagram, type PreparedDiagram } from "../merman/markdown"
import { detectMermaidDiagram } from "../merman/detect"
import { MermaidSyntaxError } from "../merman/diagnostics"
import { DiagramCanvasSizeError } from "../merman/core/canvas"
import { resolveOpenCodeDiagramPalette } from "../merman/palette"
import type { Theme } from "../theme/types"
import type { MermaidConfig } from "../config/types"
import { defaultHeadingStyles, type HeadingStyles } from "../headings"
import { CodeBlock } from "./code"

export type MermaidDiagramViewProps = {
  source: string
  theme: Theme
  columns: number
  mermaidOptions?: MermaidConfig
  headings?: HeadingStyles
  onDiagnostic?: (diagnostic: { level: "error"; message: string }) => void
}

function DiagramText(props: { prepared: Accessor<PreparedDiagram> }) {
  let ref: TextRenderable | undefined
  let dragX: number | undefined
  createEffect(() => {
    if (!ref) return
    const prepared = props.prepared()
    ref.content = prepared.text
    ref.height = prepared.height
    ref.width = "100%"
    ref.wrapMode = "none"
    ref.selectable = false
    ref.marginTop = 1
  })
  return <text ref={(renderable) => {
    ref = renderable
    if (!ref) return
    ref.onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return
      ref?.ctx.clearSelection()
      dragX = event.x
      event.preventDefault()
      event.stopPropagation()
    }
    ref.onMouseDrag = (event: MouseEvent) => {
      if (dragX === undefined) return
      const dx = event.x - dragX
      dragX = event.x
      if (ref && dx) ref.scrollX -= dx
      event.preventDefault()
      event.stopPropagation()
    }
    ref.onMouseDragEnd = () => { dragX = undefined }
    ref.onMouseUp = () => { dragX = undefined }
    ref.onMouseScroll = (event: MouseEvent) => {
      const direction = event.scroll?.direction
      if (direction !== "left" && direction !== "right") return
      event.preventDefault()
      event.stopPropagation()
    }
  }} />
}

export function MermaidDiagramView(props: MermaidDiagramViewProps) {
  let lastGood: PreparedDiagram | undefined
  const prepared = createMemo(() => {
    const source = props.source
    const kind = detectMermaidDiagram(source)
    const options = {
      compact: props.mermaidOptions?.compact,
      layoutMaxWidth: Math.min(props.mermaidOptions?.layoutMaxWidth ?? 120, Math.max(1, props.columns)),
      colors: resolveOpenCodeDiagramPalette(props.theme),
    }
    try {
      const result = measureMermaidDiagram(source, options)
      if (result && result.height > 0) {
        lastGood = result
        return result
      }
      if (lastGood && (!kind || lastGood.kind === kind)) {
        return measureMermaidDiagram(lastGood.source, options) ?? lastGood
      }
    } catch (error) {
      if (error instanceof MermaidSyntaxError && lastGood && lastGood.kind === kind) {
        return measureMermaidDiagram(lastGood.source, options) ?? lastGood
      }
      if (!(error instanceof MermaidSyntaxError || error instanceof DiagramCanvasSizeError)) {
        props.onDiagnostic?.({ level: "error", message: error instanceof Error ? error.message : String(error) })
      }
    }
    return undefined
  })
  return <box width="100%" flexDirection="column" flexShrink={0}>
    <Show when={prepared()} fallback={<CodeBlock content={props.source} language="mermaid"
      theme={props.theme} headings={props.headings ?? defaultHeadingStyles} />}>
      {(value) => <DiagramText prepared={value} />}
    </Show>
  </box>
}
