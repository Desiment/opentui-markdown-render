import { createEffect, createMemo, For, Show } from "solid-js"
import { StyledText, type RGBA, type TextRenderable } from "@opentui/core"
import { mosaicScale, type CanvasGraphics } from "../graphics"
import { mathImageID, rgbaToHex } from "../math"
import { layoutAtoms, type LayoutRun, type MathVariant } from "./inline-layout"
import { flattenInline, type InlineStyleContext } from "./inline-style"
import { useInlineMathImages } from "./inline-math"
import type { Inline } from "../core/document"
import type { Theme, HeadingLevel } from "../theme/types"
import { headingColor, type HeadingStyles } from "../headings"

export type InlineFlowProps = {
  inlines: readonly Inline[]
  columns: number
  theme: Theme
  headings: HeadingStyles
  graphics: CanvasGraphics
  surface: () => string
  quote?: boolean
  heading?: { level: HeadingLevel }
  prefix?: (index: number) => string
  prefixColor?: RGBA
}

function StyledSegment(props: { entry: LayoutRun; textRow: number }) {
  let ref: TextRenderable | undefined
  createEffect(() => {
    const atom = props.entry.atom
    if (ref && atom.type === "text") {
      ref.content = new StyledText([{
        __isChunk: true, text: atom.text, fg: atom.fg, attributes: atom.attributes,
        ...(atom.href ? { link: { url: atom.href } } : {}),
      }])
    }
  })
  return <text ref={ref} width={props.entry.columns} flexShrink={0} wrapMode="none" marginTop={props.textRow} />
}

export function InlineFlow(props: InlineFlowProps) {
  const atoms = createMemo(() => {
    const ctx: InlineStyleContext = { theme: props.theme, headings: props.headings, quote: props.quote, heading: props.heading }
    return flattenInline(props.inlines, ctx)
  })
  const contents = createMemo(() => [...new Set(atoms().flatMap((atom) => atom.type === "math" ? [atom.content] : []))])
  const foreground = () => rgbaToHex(props.heading ? headingColor(props.theme, props.heading.level) : props.theme.text.base)
  const images = useInlineMathImages(contents, foreground, props.surface, props.graphics.cell)
  const scale = createMemo(() => mosaicScale(props.graphics.protocol()))
  const prefixWidth = () => props.prefix?.(0).length ?? 0
  const columns = () => Math.max(1, props.columns - prefixWidth())
  const lines = createMemo(() => layoutAtoms(atoms(), columns(), (content) => {
    const image = images().get(content)
    if (!image) return undefined
    return {
      normal: { columns: Math.max(1, Math.round(image.normal.columns * scale())), rows: Math.max(1, Math.round(image.normal.rows * scale())), baseline: image.normal.baseline * scale() },
      compact: { columns: Math.max(1, Math.round(image.compact.columns * scale())), rows: image.compact.rows === 1 ? 1 : Math.max(1, Math.round(image.compact.rows * scale())), baseline: image.compact.baseline * scale() },
      standard: { columns: Math.max(1, Math.round(image.standard.columns * scale())), rows: Math.max(1, Math.round(image.standard.rows * scale())), baseline: image.standard.baseline * scale() },
    }
  }, props.graphics.protocol() !== "blocks"))

  return (
    <box width="100%" flexDirection="column" flexShrink={0}>
      <For each={lines()}>
        {(line, index) => (
          <box flexDirection="row" alignItems="flex-start" width="100%" height={line.height} flexShrink={0} backgroundColor={props.theme.background.base}>
            <Show when={props.prefix}>
              <text fg={props.prefixColor ?? props.theme.markdown.text} wrapMode="none" width={prefixWidth()} flexShrink={0}>
                {props.prefix?.(index()) ?? ""}
              </text>
            </Show>
            <For each={line.runs}>
              {(entry, position) => {
                const atom = entry.atom
                if (atom.type === "text") {
                  const visible = position() === line.runs.length - 1 ? atom.text.trimEnd() : atom.text
                  return <StyledSegment entry={{ ...entry, atom: { ...atom, text: visible } }} textRow={line.textRow} />
                }
                const variant: MathVariant = entry.variant ?? "normal"
                return (
                  <Show when={images().get(atom.content)?.[variant]} fallback={
                    <text fg={props.theme.text.muted} wrapMode="none" width={entry.columns} flexShrink={0}>{atom.raw}</text>
                  }>
                    {(image) => (
                      <image
                        id={`opentui-markdown-math-${mathImageID(atom.content, false, foreground(), props.graphics.cell(), 1, variant === "compact", variant === "standard")}-${props.surface()}`}
                        source={image().png}
                        fit="fit"
                        protocol="auto"
                        width={entry.columns}
                        height={entry.rows}
                        flexShrink={0}
                      />
                    )}
                  </Show>
                )
              }}
            </For>
          </box>
        )}
      </For>
    </box>
  )
}
