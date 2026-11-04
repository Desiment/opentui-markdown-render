import { createMemo, For, type Accessor, type JSX } from "solid-js"
import stringWidth from "string-width"
import { type TextChunk } from "@opentui/core"
import { assertNever, type Block, type Document, type ListItem, type UnitInfo } from "../core/document"
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

type ListBlock = Extract<Block, { type: "list" }>

export type RenderUnit = (info: Accessor<UnitInfo>, content: JSX.Element) => JSX.Element

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
  mathScale?: number
  onDiagnostic?: (diagnostic: { level: "warning" | "error"; message: string }) => void
  renderUnit?: RenderUnit
}

function listMarker(list: ListBlock, index: number, item: ListItem): string {
  const bullet = list.ordered ? `${list.start + index}.` : "-"
  return item.task ? `${bullet} ${item.checked ? "[x]" : "[ ]"}` : bullet
}

export function DocumentView(props: DocumentViewProps) {
  let previous: Slot[] = []
  const slots = createMemo(() => {
    previous = reconcileSlots(previous, [...props.document.blocks])
    return previous
  })

  function flow(
    children: Extract<Block, { type: "paragraph" }>["children"],
    columns: number,
    quote: boolean | undefined,
    prefix?: (index: number) => string,
    prefixColor?: () => Theme["text"]["base"],
    prefixChunks?: (index: number) => TextChunk[],
  ) {
    return <InlineFlow inlines={children} columns={columns} theme={props.theme} headings={props.headings}
      graphics={props.graphics} surface={props.surface} quote={quote} prefix={prefix}
      prefixColor={prefixColor} prefixChunks={prefixChunks} />
  }

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
      switch (block.type) {
        case "paragraph": return flow(block.children, columns, input.quote)
        case "heading": {
          const level = headingLevels[block.level - 1]
          const style = props.headings[level]
          const children = style.uppercase ? block.children.map((child) => child.type === "text" ? { ...child, text: child.text.toUpperCase() } : child) : block.children
          return <box width="100%" flexDirection="column" flexShrink={0} marginTop={style.marginTop} marginBottom={style.marginBottom}>
            <InlineFlow inlines={children} columns={columns} theme={props.theme} headings={props.headings}
              graphics={props.graphics} surface={props.surface} heading={{ level }}
              prefix={(index) => index === 0 ? `${"#".repeat(level)} ` : " ".repeat(level + 1)} prefixColor={() => props.theme.text.muted} />
          </box>
        }
        case "rule": return <box height={1} width="100%" border={["top"]} borderColor={props.theme.markdown.horizontalRule} />
        case "image": return <LocalImage href={block.href} alt={block.alt} base={props.assetBase}
          columns={() => columns} cell={props.graphics.cell} background={props.surface}
          labelColor={() => props.theme.markdown.image} textColor={() => props.theme.markdown.imageText}
          limits={props.imageLimits} />
        case "display-math": return <DisplayMath content={block.content} open={block.open} close={block.close}
          maxWidth={() => columns} theme={() => props.theme} graphics={props.graphics} surface={props.surface}
          scale={() => props.mathScale ?? 1} />
        case "quote": return <box border={columns > 2 ? ["left"] : []} borderColor={props.theme.markdown.blockQuote}
          paddingLeft={columns > 2 ? 1 : 0} width="100%" flexDirection="column">
          <For each={block.blocks}>{(child) => <BlockView block={() => child}
            columns={columns > 2 ? columns - 2 : columns} quote />}</For>
        </box>
        case "list": return <ListBlockView block={() => block} columns={columns} quote={input.quote} wrapItems={false} />
        case "code": return <CodeBlock content={block.content} language={block.language} theme={props.theme} headings={props.headings} />
        case "mermaid": return <MermaidDiagramView source={block.content} theme={props.theme} columns={columns}
          mermaidOptions={props.mermaidOptions} headings={props.headings} onDiagnostic={props.onDiagnostic} />
        case "table": return <TableBlock block={block} options={props.tableOptions} theme={props.theme} headings={props.headings}
          hyperlinks={props.graphics.hyperlinks?.() ?? true} />
        case "literal": return <text fg={props.theme.markdown.text} wrapMode="word" content={block.text} />
        default: return assertNever(block)
      }
    })
    return <box width="100%" flexDirection="column" flexShrink={0}>{view()}</box>
  }

  function ListItemView(input: {
    block: () => ListBlock
    latest: () => ListBlock
    item: () => ListItem
    index: Accessor<number>
    markerWidth: Accessor<number>
    columns: number
    quote?: boolean
    wrapUnit: boolean
  }) {
    const list = input.block
    const item = input.item
    const markerWidth = input.markerWidth
    const hanging = () => markerWidth() + 1
    const marker = () => listMarker(list(), input.index(), item())

    const content = <box flexDirection="column" width="100%" flexShrink={0}
      marginBottom={list().loose && input.index() < list().items.length - 1 ? 1 : 0}>
      <For each={item().blocks}>{(child, childIndex) => childIndex() === 0 && child.type === "paragraph"
        ? flow(child.children, input.columns, input.quote, (row) => row === 0
            ? `${marker().padEnd(markerWidth())} ` : " ".repeat(hanging()),
          () => list().ordered ? props.theme.markdown.listEnumeration : props.theme.markdown.listItem,
          item().task ? (row) => row === 0
            ? [
                { __isChunk: true, text: `${list().ordered ? `${list().start + input.index()}.` : "-"} `,
                  fg: list().ordered ? props.theme.markdown.listEnumeration : props.theme.markdown.listItem },
                { __isChunk: true, text: `${item().checked ? "[x]" : "[ ]"}${" ".repeat(markerWidth() - stringWidth(marker()) + 1)}`,
                  fg: item().checked ? props.theme.text.feedback.success : props.theme.text.muted },
              ] : [{ __isChunk: true, text: " ".repeat(hanging()), fg: props.theme.text.muted }]
            : undefined)
        : childIndex() === 0
          ? <box flexDirection="row" width="100%" flexShrink={0}>
              <text width={hanging()} flexShrink={0}
                fg={list().ordered ? props.theme.markdown.listEnumeration : props.theme.markdown.listItem}>
                {`${marker().padEnd(markerWidth())} `}
              </text>
              <BlockView block={() => child} columns={Math.max(1, input.columns - hanging())} quote={input.quote} />
            </box>
        : <box marginLeft={hanging()} width={Math.max(1, input.columns - hanging())} flexDirection="column">
            <BlockView block={() => child} columns={Math.max(1, input.columns - hanging())} quote={input.quote} />
          </box>}
      </For>
      {item().blocks.length === 0 && <text fg={props.theme.markdown.listItem}>{marker()}</text>}
    </box>

    const info = () => {
      const current = item()
      const source = input.latest().items[input.index()]?.source ?? null
      return { kind: "list-item" as const, item: current.source === source ? current : { ...current, source }, source }
    }
    return <>{input.wrapUnit && props.renderUnit ? props.renderUnit(info, content) : content}</>
  }

  function ListBlockView(input: { block: () => ListBlock; latest?: () => ListBlock; columns: number; quote?: boolean; wrapItems: boolean }) {
    const markerWidth = createMemo(() => {
      const list = input.block()
      return Math.max(1, ...list.items.map((entry, index) => stringWidth(listMarker(list, index, entry))))
    })
    return <box flexDirection="column" width="100%" flexShrink={0}>
      <For each={input.block().items}>{(item, index) => <ListItemView block={input.block}
        latest={input.latest ?? input.block} markerWidth={markerWidth}
        item={() => input.block().items[index()] ?? item} index={index} columns={input.columns}
        quote={input.quote} wrapUnit={input.wrapItems} />}</For>
    </box>
  }

  function TopLevelSlot(input: { slot: Slot; columns: number }) {
    const block = input.slot.block
    if (block().type === "list") {
      return <ListBlockView block={() => block() as ListBlock} latest={() => input.slot.latest() as ListBlock}
        columns={input.columns} wrapItems />
    }
    const info = () => {
      const current = block()
      if (current.type === "list") throw new Error("A top-level list is rendered as list items, not as a block unit")
      const source = input.slot.latest().source ?? null
      return { kind: "block" as const, block: current.source === source ? current : { ...current, source }, source }
    }
    const content = <BlockView block={block} columns={input.columns} />
    return <>{props.renderUnit ? props.renderUnit(info, content) : content}</>
  }

  return <box width="100%" flexDirection="column" flexShrink={0}>
    <For each={slots()}>{(slot) => <TopLevelSlot slot={slot} columns={props.columns} />}</For>
  </box>
}
