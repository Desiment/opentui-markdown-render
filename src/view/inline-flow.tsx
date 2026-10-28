import { createMemo, For, Show } from "solid-js"
import { StyledText, TextAttributes } from "@opentui/core"
import stringWidth from "string-width"
import { layoutAtoms } from "./inline-layout"
import { flattenInline, type InlineStyleContext } from "./inline-style"
import { mosaicScale } from "../graphics"
import type { Inline } from "../core/document"
import type { Theme } from "../theme/types"
import type { HeadingStyles } from "../headings"

export type InlineFlowProps = {
  inlines: readonly Inline[]
  columns: number
  theme: Theme
  headings: HeadingStyles
  graphics: any
  surface: any
  background?: () => any
  quote?: boolean
  heading?: { level: any }
  prefix?: (index: number) => string
  prefixColor?: any
}

export function InlineFlow(props: InlineFlowProps) {
  const atoms = createMemo(() => {
    const ctx: InlineStyleContext = {
      theme: props.theme,
      headings: props.headings,
      quote: props.quote,
      heading: props.heading as any,
    }
    return flattenInline(props.inlines, ctx)
  })

  const lines = createMemo(() => {
    const cols = Math.max(8, props.columns)
    // simple layout without math images for now
    return layoutAtoms(atoms(), cols, () => undefined, props.graphics?.protocol?.() !== "blocks")
  })

  return (
    <box width="100%" flexDirection="column" flexShrink={0}>
      <For each={lines()}>
        {(line, idx) => (
          <box flexDirection="row" height={line.height} width="100%">
            <Show when={props.prefix}>
              <text content={props.prefix!(idx())} fg={props.prefixColor} />
            </Show>
            <For each={line.atoms}>
              {(atom: any) => {
                if (atom.kind === "text") {
                  const a = atom.atom
                  const st = new StyledText([{ text: atom.text, fg: a.fg, attributes: a.attributes, link: a.href ? { url: a.href } : undefined } as any])
                  return <text ref={(r: any) => { if (r) r.content = st }} width={stringWidth(atom.text)} />
                }
                if (atom.kind === "math") {
                  const a = atom.atom
                  return <text content={a.raw} />
                }
                return null
              }}
            </For>
          </box>
        )}
      </For>
    </box>
  )
}
