import { createMemo, For } from "solid-js"
import stringWidth from "string-width"
import type { Block, Document } from "../core/document"
import type { ResolvedTableOptions } from "../core/tables"
import type { ImagesConfig, MermaidConfig } from "../config/types"
import type { CanvasGraphics } from "../graphics"
import { headingLevels, type HeadingStyles } from "../headings"
import { LocalImage } from "../media"
import type { Theme } from "../theme/types"
import { CodeBlock } from "./code"
import { reconcileSlots, type Slot } from "./document-slots"
import { TableBlock } from "./document-table"
import { InlineFlow } from "./inline-flow"
import { DisplayMath } from "./math"
import { MermaidDiagramView } from "./mermaid"

export type DocumentViewProps = {
  document: Document
  columns: number
  theme: Theme
  headings: HeadingStyles
  graphics: CanvasGraphics
  surface: () => string
  assetBase: () => string | undefined
  imageLimits?: ImagesConfig
  tableOptions: ResolvedTableOptions
  mermaidOptions?: MermaidConfig
  onDiagnostic?: (diagnostic: { level: "warning" | "error"; message: string }) => void
}

export function DocumentView(props: DocumentViewProps) {
  let previous: Slot[] = []
  const slots = createMemo(() => {
    previous = reconcileSlots(previous, [...props.document.blocks])
    return previous
  })

  function BlockView(input: { block: () => Block; columns: number; quote?: boolean }) {
    // A reused Mermaid slot must retain this component's local last-good state
    // while its fenced source changes. The other variants can remount on edit.
    if (input.block().type === "mermaid") {
      return <MermaidDiagramView source={(input.block() as Extract<Block, { type: "mermaid" }>).content}
        theme={props.theme} columns={input.columns} mermaidOptions={props.mermaidOptions}
        headings={props.headings} onDiagnostic={props.onDiagnostic} />
    }
    const view = createMemo(() => {
      const block = input.block()
      const columns = Math.max(1, input.columns)
      const flow = (children: Extract<Block, { type: "paragraph" }>["children"], prefix?: (index: number) => string, prefixColor?: Theme["text"]["base"]) => (
        <InlineFlow inlines={children} columns={columns} theme={props.theme} headings={props.headings}
          graphics={props.graphics} surface={props.surface} quote={input.quote} prefix={prefix} prefixColor={prefixColor} />
      )
      switch (block.type) {
        case "paragraph": return flow(block.children)
        case "heading": {
          const level = headingLevels[block.level - 1]
          const style = props.headings[level]
          const children = style.uppercase ? block.children.map((child) => child.type === "text" ? { ...child, text: child.text.toUpperCase() } : child) : block.children
          return <box width="100%" flexDirection="column" flexShrink={0} marginTop={style.marginTop} marginBottom={style.marginBottom}>
            <InlineFlow inlines={children} columns={columns} theme={props.theme} headings={props.headings}
              graphics={props.graphics} surface={props.surface} heading={{ level }}
              prefix={(index) => index === 0 ? `${"#".repeat(level)} ` : " ".repeat(level + 1)} prefixColor={props.theme.text.muted} />
          </box>
        }
        case "rule": return <box height={1} width="100%" border={["top"]} borderColor={props.theme.markdown.horizontalRule} />
        case "image": return <LocalImage href={block.href} alt={block.alt} base={props.assetBase}
          columns={() => columns} cell={props.graphics.cell} background={props.surface}
          labelColor={() => props.theme.markdown.image} textColor={() => props.theme.markdown.imageText}
          limits={props.imageLimits} />
        case "display-math": return <DisplayMath content={block.content} open={block.open} close={block.close}
          maxWidth={() => columns} theme={() => props.theme} graphics={props.graphics} surface={props.surface} />
        case "quote": return <box border={["left"]} borderColor={props.theme.markdown.blockQuote}
          paddingLeft={columns > 2 ? 1 : 0} width="100%" flexDirection="column">
          <For each={block.blocks}>{(child) => <BlockView block={() => child} columns={Math.max(1, columns - 2)} quote />}</For>
        </box>
        case "list": {
          const marker = (index: number, task: boolean, checked: boolean | null) => block.ordered
            ? `${block.start + index}.` : task ? (checked ? "[x]" : "[ ]") : "-"
          const markerWidth = Math.max(...block.items.map((item, index) => stringWidth(marker(index, item.task, item.checked))), 1)
          const hanging = markerWidth + 1
          return <box flexDirection="column" width="100%" flexShrink={0}>
            <For each={block.items}>{(item, index) => <box flexDirection="column" width="100%" flexShrink={0}
              marginBottom={block.loose && index() < block.items.length - 1 ? 1 : 0}>
              <For each={item.blocks}>{(child, childIndex) => childIndex() === 0 && child.type === "paragraph"
                ? flow(child.children, (row) => row === 0
                    ? `${marker(index(), item.task, item.checked).padStart(markerWidth)} ` : " ".repeat(hanging),
                  block.ordered ? props.theme.markdown.listEnumeration : props.theme.markdown.listItem)
                : childIndex() === 0
                  ? <box flexDirection="row" width="100%" flexShrink={0}>
                      <text width={hanging} flexShrink={0}
                        fg={block.ordered ? props.theme.markdown.listEnumeration : props.theme.markdown.listItem}>
                        {`${marker(index(), item.task, item.checked).padStart(markerWidth)} `}
                      </text>
                      <BlockView block={() => child} columns={Math.max(1, columns - hanging)} quote={input.quote} />
                    </box>
                : <box marginLeft={hanging} width={Math.max(1, columns - hanging)} flexDirection="column">
                    <BlockView block={() => child} columns={Math.max(1, columns - hanging)} quote={input.quote} />
                  </box>}
              </For>
              {item.blocks.length === 0 && <text fg={props.theme.markdown.listItem}>{marker(index(), item.task, item.checked)}</text>}
            </box>}</For>
          </box>
        }
        case "code": return <CodeBlock content={block.content} language={block.language} theme={props.theme} headings={props.headings} />
        case "mermaid": return null // A different block type gets a new slot.
        case "table": return <TableBlock block={block} options={props.tableOptions} theme={props.theme} headings={props.headings} />
        case "literal": return <text fg={props.theme.markdown.text} wrapMode="word" content={block.text} />
      }
    })
    return <box width="100%" flexDirection="column" flexShrink={0}>{view()}</box>
  }

  return <box width="100%" flexDirection="column" flexShrink={0}>
    <For each={slots()}>{(slot) => <BlockView block={slot.block} columns={props.columns} />}</For>
  </box>
}
