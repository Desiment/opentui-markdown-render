import { For, Show } from "solid-js"
import { InlineFlow } from "./inline-flow"
import { LocalImage } from "../media"
import { DisplayMath } from "./math"
import type { Block, Document } from "../core/document"
import type { Theme } from "../theme/types"
import type { HeadingStyles } from "../headings"

export type DocumentViewProps = {
  document: Document
  columns: number
  theme: Theme
  headings: HeadingStyles
  graphics: any
  surface: any
  assetBase: string
  imageLimits: any
  tableOptions: any
  mermaidOptions: any
  renderer: any
}

export function DocumentView(props: DocumentViewProps) {
  const BlockView = (p: { block: Block }) => {
    const b = p.block
    if (b.type === "paragraph") {
      return <InlineFlow inlines={b.children} columns={props.columns} theme={props.theme} headings={props.headings} graphics={props.graphics} surface={props.surface} />
    }
    if (b.type === "heading") {
      return (
        <box width="100%" flexDirection="column" flexShrink={0}>
          <InlineFlow inlines={b.children} columns={props.columns} theme={props.theme} headings={props.headings} graphics={props.graphics} surface={props.surface} heading={{ level: b.level }} />
        </box>
      )
    }
    if (b.type === "rule") {
      return <box height={1} width="100%" border={["top"]} borderColor={props.theme.markdown.horizontalRule} />
    }
    if (b.type === "image") {
      return <LocalImage href={b.href} alt={b.alt} base={() => props.assetBase} columns={() => props.columns} cell={() => props.graphics?.cell?.() || null} background={() => props.surface.backgroundColor?.() || "#000000"} labelColor={() => props.theme.markdown.image} textColor={() => props.theme.markdown.imageText} limits={props.imageLimits} />
    }
    if (b.type === "display-math") {
      return <DisplayMath content={b.content} open={b.open} close={b.close} maxWidth={() => props.columns} theme={() => props.theme} graphics={props.graphics} surface={() => props.surface.backgroundColor?.() || "#000000"} />
    }
    if (b.type === "quote") {
      return (
        <box border={["left"]} borderColor={props.theme.markdown.blockQuote} paddingLeft={1} flexDirection="column">
          <For each={b.blocks}>
            {(child) => <BlockView block={child} />}
          </For>
        </box>
      )
    }
    if (b.type === "list") {
      return (
        <box flexDirection="column">
          <For each={b.items}>
            {(item, idx) => (
              <box flexDirection="column">
                <For each={item.blocks}>
                  {(child, cidx) => {
                    if (child.type === "paragraph" && cidx() === 0) {
                      const marker = b.ordered ? `${(b.start || 1) + idx()}.` : item.task ? (item.checked ? "[x]" : "[ ]") : "-"
                      return <InlineFlow inlines={child.children} columns={Math.max(8, props.columns - marker.length - 1)} theme={props.theme} headings={props.headings} graphics={props.graphics} surface={props.surface} prefix={(i) => (i === 0 ? marker + " " : " ".repeat(marker.length + 1))} prefixColor={b.ordered ? props.theme.markdown.listEnumeration : props.theme.markdown.listItem} />
                    }
                    return <BlockView block={child} />
                  }}
                </For>
              </box>
            )}
          </For>
        </box>
      )
    }
    if (b.type === "code") {
      return <box width="100%"><text content={b.content} fg={props.theme.markdown.codeBlock} /></box>
    }
    if (b.type === "mermaid") {
      return <box width="100%"><text content={b.content} fg={props.theme.markdown.codeBlock} /></box>
    }
    if (b.type === "table") {
      return <box width="100%"><text content={"[table]"} fg={props.theme.markdown.text} /></box>
    }
    if (b.type === "literal") {
      return <text content={b.text} fg={props.theme.markdown.text} />
    }
    return null
  }

  return (
    <box width="100%" flexDirection="column">
      <For each={props.document.blocks}>
        {(block) => <BlockView block={block} />}
      </For>
    </box>
  )
}
