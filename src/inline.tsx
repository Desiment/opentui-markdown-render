import { TextAttributes, type RGBA } from "@opentui/core"
import { createMemo, createResource, For, Show } from "solid-js"
import stringWidth from "string-width"
import { mosaicScale, type CanvasGraphics } from "./graphics"
import { defaultHeadingStyles, headingAttributes, headingColor, headingLevel, type HeadingStyles } from "./headings"
import { mathImageID, renderMathImage, rgbaToHex, type CellSize, type MathImage } from "./math"
import { type CanvasBlock, type FlowBlock, type InlineMathRun, type InlineRun, type InlineStyle } from "./core/blocks"
import type { Theme } from "./theme/types"

export { scanDocument, parseInlineRuns } from "./core/blocks"
export type { CanvasBlock, CanvasSource, FlowBlock, FlowItem, InlineRun, InlineStyle } from "./core/blocks"

type MathMeasure = { columns: number; rows: number; baseline: number }
// A formula is drawn in one of three rasters: the shared one, scaled into the
// text row it sits in; the compact one, squeezed into a single row where a
// mosaic would cover the text next to it; and the standard one, which keeps the
// text size for a formula that stands alone.
type MathVariant = "normal" | "compact" | "standard"
type LayoutRun = { run: InlineRun; columns: number; rows: number; variant?: MathVariant }
type LayoutLine = { runs: LayoutRun[]; columns: number; height: number; textRow: number }

function hardChunks(content: string, columns: number) {
  const chunks: string[] = []
  let current = ""
  for (const character of content) {
    if (current && stringWidth(current + character) > columns) {
      chunks.push(current)
      current = character
      continue
    }
    current += character
  }
  if (current) chunks.push(current)
  return chunks
}

function layout(
  runs: InlineRun[],
  columns: number,
  measureOf: (content: string) => { normal: MathMeasure; compact: MathMeasure; standard: MathMeasure } | undefined,
  compactOverflow: boolean,
): LayoutLine[] {
  const lines: LayoutLine[] = []
  let current: LayoutLine = { runs: [], columns: 0, height: 1, textRow: 0 }
  const flush = () => {
    if (!current.runs.length) return
    lines.push(current)
    current = { runs: [], columns: 0, height: 1, textRow: 0 }
  }
  const place = (run: LayoutRun, textRow = 0) => {
    const add = (entry: LayoutRun) => {
      current.runs.push(entry)
      current.columns += entry.columns
      current.height = Math.max(current.height, entry.rows, textRow + 1)
      current.textRow = Math.max(current.textRow, textRow)
    }
    if (current.columns + run.columns <= columns || !current.runs.length) {
      add(run)
      return
    }
    if (run.run.type === "text") {
      const content = run.run.content.trimStart()
      const trimmed = { ...run, run: { ...run.run, content }, columns: stringWidth(content) }
      // A separator belongs between two words, never at the start of a wrapped row.
      if (current.columns + trimmed.columns <= columns) {
        add(trimmed)
        return
      }
      flush()
      add(trimmed)
      return
    }
    flush()
    add(run)
  }
  for (const run of runs) {
    if (run.type === "math") {
      const measured = measureOf(run.content)
      const natural = measured?.normal
      // Before the raster lands the TeX source stands in for it, which keeps
      // the flow readable while the formula renders.
      const squeezed = natural ? natural.columns > columns : false
      const entry = natural
        ? {
            run,
            columns: squeezed ? columns : natural.columns,
            rows: Math.max(1, Math.round(squeezed ? (natural.rows * columns) / natural.columns : natural.rows)),
          }
        : { run, columns: Math.min(columns, Math.max(3, run.content.length + 2)), rows: 1 }
      // Text shares the raster baseline, which sits inside the formula's own box.
      // A baseline exactly on a row edge belongs to the row above it.
      const textRow = natural ? Math.max(0, Math.ceil(natural.baseline) - 1) : 0
      place(entry, textRow)
      continue
    }
    for (const word of run.content.match(/\s*\S+\s*/g) ?? []) {
      // The width has to include separator spaces too: a fixed-width text node
      // otherwise clips its trailing space directly before an inline image and
      // makes the words appear to run into the formula after a resize.
      const size = stringWidth(word)
      if (size > columns) {
        for (const chunk of hardChunks(word.trimEnd(), columns)) {
          place({ run: { ...run, content: chunk }, columns: stringWidth(chunk), rows: 1 })
        }
        continue
      }
      place({ run: { ...run, content: word }, columns: size, rows: 1 })
    }
  }
  flush()
  if (compactOverflow) {
    let changed = true
    while (changed) {
      changed = false
      const occupied = lines.flatMap((line, row) => {
        let column = 0
        return line.runs.map((entry) => {
          const area = {
            entry,
            column,
            row: row + (entry.run.type === "text" ? line.textRow : 0),
            rows: entry.run.type === "math" ? entry.rows : 1,
          }
          column += entry.columns
          return area
        })
      })
      for (const area of occupied) {
        if (area.entry.run.type !== "math" || area.entry.variant === "compact" || area.rows <= 1) continue
        const collision = occupied.some(
          (other) =>
            other.entry !== area.entry &&
            other.column < area.column + area.entry.columns &&
            area.column < other.column + other.entry.columns &&
            other.row < area.row + area.rows &&
            area.row + 1 < other.row + other.rows,
        )
        if (!collision) continue
        const compact = measureOf(area.entry.run.content)?.compact
        if (!compact) continue
        area.entry.variant = "compact"
        area.entry.columns = compact.columns
        area.entry.rows = compact.rows
        changed = true
      }
    }
  }
  // A formula that ends its line has nothing after it on that line: it keeps
  // the text size instead of being scaled down into the row it would otherwise
  // have to fit into.
  for (const line of lines) {
    const entry = line.runs[line.runs.length - 1]
    if (!entry || entry.run.type !== "math") continue
    if (entry.variant === "compact") continue
    const standard = measureOf(entry.run.content)?.standard
    if (!standard) continue
    // The line has to keep fitting the area it is laid out in.
    if (line.columns - entry.columns + standard.columns > columns) continue
    entry.variant = "standard"
    entry.columns = standard.columns
    entry.rows = standard.rows
  }
  for (const line of lines) {
    line.columns = line.runs.reduce((total, entry) => total + entry.columns, 0)
    line.textRow = Math.max(
      0,
      ...line.runs.flatMap((entry) => {
        if (entry.run.type !== "math") return []
        const measured = measureOf(entry.run.content)
        if (!measured) return []
        return [Math.max(0, Math.ceil(measured[entry.variant ?? "normal"].baseline) - 1)]
      }),
    )
    line.height = Math.max(1, line.textRow + 1, ...line.runs.map((entry) => entry.rows))
  }
  return lines
}

// The look of a heading level: its colour and the attributes that come with
// it. Everything inside the heading inherits them, so a bold word in a
// heading is still the colour of that level.
type HeadingContext = { readonly color: RGBA; readonly attributes: number }

function styleOf(theme: Theme, style: InlineStyle, heading?: HeadingContext) {
  const base = heading?.attributes ?? TextAttributes.NONE
  switch (style) {
    case "strong":
      return { fg: heading?.color ?? theme.markdown.strong, attributes: base | TextAttributes.BOLD }
    case "emphasis":
      return { fg: heading?.color ?? theme.markdown.emphasis, attributes: base | TextAttributes.ITALIC }
    case "code":
      return { fg: theme.markdown.code, attributes: TextAttributes.NONE }
    case "linkText":
      return { fg: theme.markdown.linkText, attributes: base | TextAttributes.UNDERLINE }
    case "heading":
      return { fg: heading?.color ?? theme.markdown.heading, attributes: base }
    case "headingMarker":
      // The marker is a sign of the level, not part of the heading itself.
      return { fg: theme.text.muted, attributes: TextAttributes.NONE }
    default:
      return { fg: theme.markdown.text, attributes: TextAttributes.NONE }
  }
}

// Terminal cells are about twice as tall as they are wide, which is also
// OpenTUI's own assumption when the terminal reports no pixel resolution.
type FlowLayout = {
  measureOf: (content: string) => { normal: MathMeasure; compact: MathMeasure; standard: MathMeasure } | undefined
  imageOf: (content: string, variant: MathVariant) => MathImage | undefined
  compactOverflow: boolean
  color: () => string
  surface: () => string
  background?: () => RGBA | undefined
  theme: Theme
  // The raster is generated at this cell pixel size, so it is part of the image
  // identity OpenTUI caches by.
  cell: () => CellSize | null
}

function FlowLine(props: { line: LayoutLine; prefix: string; prefixColor: RGBA; layout: FlowLayout; heading?: HeadingContext }) {
  const theme = props.layout.theme
  return (
    // The raster pads itself so its baseline lands 0.75 em below its top edge,
    // which is where the text baseline sits, so the image is top-aligned here.
    <box flexDirection="row" alignItems="flex-start" width="100%" height={props.line.height} flexShrink={0} backgroundColor={props.layout.background?.()}>

      <Show when={props.prefix}>
        <text fg={props.prefixColor} wrapMode="none">
          {props.prefix}
        </text>
      </Show>
      <For each={props.line.runs}>
        {(entry, index) => {
          const run = entry.run
          if (run.type === "math") {
            const variant = entry.variant ?? "normal"
            return (
              <Show
                when={props.layout.imageOf(run.content, variant)}
                fallback={
                  <text fg={theme.text.muted} wrapMode="none" width={entry.columns} flexShrink={0}>
                    {`${run.open}${run.content}${run.close}`}
                  </text>
                }
              >
                {(image) => (
                  <image
                    id={`opentui-markdown-math-${mathImageID(run.content, false, props.layout.color(), props.layout.cell(), 1, variant === "compact", variant === "standard")}`}
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
          }
          const style = styleOf(theme, run.style, props.heading)
          return (
            <text
              fg={style.fg}
              attributes={style.attributes}
              wrapMode="none"
              width={entry.columns}
              flexShrink={0}
              marginTop={props.line.textRow}
            >
              {index() === props.line.runs.length - 1 ? run.content.trimEnd() : run.content}
            </text>
          )
        }}
      </For>
    </box>
  )
}

function FlowLines(props: {
  runs: InlineRun[]
  columns: number
  prefix?: (index: number) => string
  prefixColor?: RGBA
  layout: FlowLayout
  heading?: HeadingContext
}) {
  const theme = props.layout.theme
  const lines = createMemo(() => layout(props.runs, props.columns, props.layout.measureOf, props.layout.compactOverflow))
  return (
    <box width="100%" flexDirection="column" flexShrink={0}>
      <For each={lines()}>
        {(line, index) => (
          <FlowLine
            line={line}
            prefix={props.prefix?.(index()) ?? ""}
            prefixColor={props.prefixColor ?? theme.markdown.text}
            layout={props.layout}
            heading={props.heading}
          />
        )}
      </For>
    </box>
  )
}

function mathOf(block: FlowBlock) {
  const found: InlineMathRun[] = []
  const visit = (runs: InlineRun[]) =>
    runs.forEach((run) => {
      if (run.type === "math" && !found.some((existing) => existing.content === run.content)) found.push(run)
    })
  if (block.type === "list") block.items.forEach((item) => visit(item.runs))
  else visit(block.runs)
  return found
}

export function CanvasFlow(props: {
  block: FlowBlock
  columns: () => number
  surface: () => string
  background?: () => RGBA | undefined
  theme: Theme
  graphics: CanvasGraphics
  // The look of every heading level. Without it the bundled styles are used.
  headings?: HeadingStyles
}) {
  const theme = props.theme
  const color = () => rgbaToHex(theme.text.base)
  const contents = createMemo(() => mathOf(props.block).map((run) => run.content))
  // The resource source has to be a string: a fresh array would refetch on
  // every read. Surface and foreground are part of the opaque PNG, so selection
  // must refetch when either changes. A formula that cannot be rasterized
  // resolves to a hole instead of a rejected resource.
  const [rendered] = createResource(
    () => JSON.stringify({ contents: contents(), color: color(), surface: props.surface(), cell: props.graphics.cell() }),
    async (key) => {
      const input = JSON.parse(key) as { contents: string[]; color: string; surface: string; cell: CellSize | null }
      return Promise.all(
        input.contents.map(async (content) => {
          try {
            const normal = await renderMathImage(content, false, input.color, input.surface, input.cell)
            if (!normal) return undefined
            const compact =
              normal.rows > 1
                ? await renderMathImage(content, false, input.color, input.surface, input.cell, 1, true)
                : normal
            // A formula that was scaled down into the text row can keep the text
            // size when it stands alone in its line.
            const standard = normal.clamped
              ? await renderMathImage(content, false, input.color, input.surface, input.cell, 1, false, true)
              : normal
            return { normal, compact: compact ?? normal, standard: standard ?? normal }
          } catch {
            return undefined
          }
        }),
      )
    },
  )
  const images = createMemo(() => {
    const list = rendered()
    if (!list) return new Map<string, { normal: MathImage; compact: MathImage; standard: MathImage }>()
    return new Map(
      contents().flatMap((content, index) => {
        const image = list[index]
        return image ? [[content, image] as const] : []
      }),
    )
  })
  // Inline formulas stay tied to the text row. Only the block-character mosaic
  // needs a larger cell box because it uses one terminal cell per coarse pixel.
  const scale = createMemo(() => mosaicScale(props.graphics.protocol()))
  const available = createMemo(() => Math.max(8, props.columns()))
  const layoutProps = createMemo<FlowLayout>(() => ({
    measureOf: (content: string) => {
      const image = images().get(content)
      if (!image) return undefined
      return {
        normal: {
          columns: Math.max(1, Math.round(image.normal.columns * scale())),
          rows: Math.max(1, Math.round(image.normal.rows * scale())),
          baseline: image.normal.baseline * scale(),
        },
        compact: {
          columns: Math.max(1, Math.round(image.compact.columns * scale())),
          rows: image.compact.rows === 1 ? 1 : Math.max(1, Math.round(image.compact.rows * scale())),
          baseline: image.compact.baseline * scale(),
        },
        standard: {
          columns: Math.max(1, Math.round(image.standard.columns * scale())),
          rows: Math.max(1, Math.round(image.standard.rows * scale())),
          baseline: image.standard.baseline * scale(),
        },
      }
    },
    imageOf: (content: string, variant: MathVariant) => {
      const image = images().get(content)
      return image?.[variant]
    },
    compactOverflow: props.graphics.protocol() !== "blocks",
    color,
    surface: props.surface,
    background: props.background,
    theme,
    cell: props.graphics.cell,
  }))

  const view = createMemo(() => {
    const block = props.block
    const layout = layoutProps()
    if (block.type === "paragraph") return <FlowLines runs={block.runs} columns={available()} layout={layout} />
    if (block.type === "heading") {
      const level = headingLevel(block.level)
      const style = props.headings?.[level] ?? defaultHeadingStyles[level]
      const heading: HeadingContext = { color: headingColor(theme, level), attributes: headingAttributes(style) }
      // Upper case is applied to the text of the heading before it is laid
      // out, so the wider glyphs are measured and the line wraps correctly.
      const runs = style.uppercase
        ? block.runs.map((run) =>
            run.type === "text" && run.style === "heading" ? { ...run, content: run.content.toUpperCase() } : run,
          )
        : block.runs
      return (
        <box
          width="100%"
          flexDirection="column"
          marginTop={style.marginTop}
          marginBottom={style.marginBottom}
          flexShrink={0}
        >
          <FlowLines runs={runs} columns={available()} layout={layout} heading={heading} />
        </box>
      )
    }
    if (block.type === "quote") {
      return (
        <FlowLines
          runs={block.runs}
          columns={Math.max(8, available() - 2)}
          prefix={(index) => (index === 0 ? "│ " : "  ")}
          layout={layout}
        />
      )
    }
    return (
      <box width="100%" flexDirection="column" flexShrink={0}>
        <For each={block.items}>
          {(item) => {
            const hanging = () => item.indent + stringWidth(item.marker) + 1
            return (
              <FlowLines
                runs={item.runs}
                columns={Math.max(8, available() - hanging())}
                prefix={(index) => (index === 0 ? `${" ".repeat(item.indent)}${item.marker} ` : " ".repeat(hanging()))}
                prefixColor={/^\d/.test(item.marker) ? theme.markdown.listEnumeration : theme.markdown.listItem}
                layout={layout}
              />
            )
          }}
        </For>
      </box>
    )
  })

  return (
    <box width="100%" flexDirection="column" flexShrink={0} backgroundColor={props.background?.()}>
      {view()}
    </box>
  )
}
