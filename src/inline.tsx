import { TextAttributes, type RGBA } from "@opentui/core"
import { createMemo, createResource, For, Show } from "solid-js"
import stringWidth from "string-width"
import { mosaicScale, type CanvasGraphics } from "./graphics"
import { mathImageID, renderMathImage, rgbaToHex, type CellSize, type MathImage } from "./math"
import { standaloneImage } from "./media"
import type { Theme } from "./theme/types"

export type InlineStyle = "text" | "strong" | "emphasis" | "code" | "linkText" | "heading"

export type InlineRun = { type: "text"; content: string; style: InlineStyle } | InlineMathRun

type InlineMathRun = { type: "math"; content: string; open: string; close: string }

export type FlowItem = { marker: string; indent: number; runs: InlineRun[] }

export type FlowBlock =
  | { type: "paragraph"; runs: InlineRun[] }
  | { type: "heading"; level: number; runs: InlineRun[] }
  | { type: "list"; items: FlowItem[] }
  | { type: "quote"; runs: InlineRun[] }

export type CanvasBlock =
  | { type: "markdown"; content: string; source: CanvasSource }
  | { type: "display-math"; content: string; open: string; close: string; source: CanvasSource }
  | { type: "image"; href: string; alt: string; source: CanvasSource }
  | { type: "flow"; block: FlowBlock; source: CanvasSource }

export type CanvasSource = { start: number; end: number; atom: "text" | "formula" | "mermaid" }

// A backslash in front of ASCII punctuation makes it a literal character, which
// is how an author keeps a dollar out of math.
const markdownPunctuation = /[!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~]/

function escaped(content: string, index: number) {
  const slashes = content.slice(0, index).match(/\\*$/)?.[0].length ?? 0
  return slashes % 2 === 1
}

function fenceAt(line: string) {
  if (line.startsWith("```")) return "```"
  if (line.startsWith("~~~")) return "~~~"
  return undefined
}

function findFenceEnd(content: string, start: number, fence: string) {
  const index = content.indexOf(`\n${fence}`, start)
  if (index < 0) return content.length
  const lineEnd = content.indexOf("\n", index + 1)
  if (lineEnd < 0) return content.length
  return lineEnd + 1
}

// An inline code span hides its content from every other inline rule, so `$x$`
// between backticks stays source text.
function codeSpanAt(content: string, index: number) {
  if (content[index] !== "`") return undefined
  let ticks = 0
  while (content[index + ticks] === "`") ticks++
  let cursor = index + ticks
  while (cursor < content.length) {
    const next = content.indexOf("`", cursor)
    if (next < 0) return undefined
    let run = 0
    while (content[next + run] === "`") run++
    if (run === ticks) return content.slice(index, next + run)
    cursor = next + run
  }
  return undefined
}

function findUnescaped(content: string, needle: string, start: number) {
  for (let index = start; index < content.length; index++) {
    if (content.startsWith(needle, index) && !escaped(content, index)) return index
    if (needle === "$" && content[index] === "\n") return -1
  }
  return -1
}

function inlineMathAt(content: string, index: number): InlineMathRun | undefined {
  if (content.startsWith("\\(", index) && !escaped(content, index)) {
    const end = findUnescaped(content, "\\)", index + 2)
    const inner = end < 0 ? "" : content.slice(index + 2, end)
    if (end < 0 || !inner.trim() || inner.includes("\n")) return undefined
    return { type: "math", content: inner, open: "\\(", close: "\\)" }
  }
  if (content[index] !== "$" || escaped(content, index)) return undefined
  const end = findUnescaped(content, "$", index + 1)
  const inner = end < 0 ? "" : content.slice(index + 1, end)
  if (end < 0 || !inner.trim() || inner.includes("\n")) return undefined
  return { type: "math", content: inner, open: "$", close: "$" }
}

// `\$` escapes the math scanner. OpenTUI's Markdown renderer keeps the backslash
// in plain text, so the escape is resolved on the way to that renderer. Fenced
// blocks and code spans keep their source verbatim.
function unescapeDollar(content: string) {
  let result = ""
  let index = 0
  while (index < content.length) {
    const fence = index === 0 || content[index - 1] === "\n" ? fenceAt(content.slice(index, index + 3)) : undefined
    if (fence) {
      const end = findFenceEnd(content, index + fence.length, fence)
      result += content.slice(index, end)
      index = end
      continue
    }
    const code = codeSpanAt(content, index)
    if (code) {
      result += code
      index += code.length
      continue
    }
    if (content.startsWith("\\$", index)) {
      result += "$"
      index += 2
      continue
    }
    result += content[index]
    index++
  }
  return result
}

type RawPart =
  | { type: "text"; content: string; start: number; end: number }
  | { type: "display"; content: string; open: string; close: string; start: number; end: number }

// Display math is the only construct that owns whole blocks, so it is split out
// before anything else looks at the text around it.
function splitRaw(content: string) {
  const parts: RawPart[] = []
  let text = ""
  let textStart = 0
  const flush = () => {
    if (!text) return
    parts.push({ type: "text", content: text, start: textStart, end: textStart + text.length })
    text = ""
  }
  for (let index = 0; index < content.length; ) {
    const fence = index === 0 || content[index - 1] === "\n" ? fenceAt(content.slice(index, index + 3)) : undefined
    if (fence) {
      const end = findFenceEnd(content, index + fence.length, fence)
      text += content.slice(index, end)
      index = end
      continue
    }
    const code = codeSpanAt(content, index)
    if (code) {
      text += code
      index += code.length
      continue
    }
    if (content.startsWith("$$", index) && !escaped(content, index)) {
      const end = findUnescaped(content, "$$", index + 2)
      if (end >= 0) {
        flush()
        parts.push({ type: "display", content: content.slice(index + 2, end), open: "$$", close: "$$", start: index, end: end + 2 })
        index = end + 2
        textStart = index
        continue
      }
    }
    if (content.startsWith("\\[", index) && !escaped(content, index)) {
      const end = findUnescaped(content, "\\]", index + 2)
      if (end >= 0) {
        flush()
        parts.push({ type: "display", content: content.slice(index + 2, end), open: "\\[", close: "\\]", start: index, end: end + 2 })
        index = end + 2
        textStart = index
        continue
      }
    }
    text += content[index]
    index++
  }
  flush()
  return parts
}

type LineBlock =
  | { type: "markdown"; content: string; start: number; end: number }
  | { type: "paragraph"; content: string; start: number; end: number }
  | { type: "heading"; level: number; content: string; start: number; end: number }
  | { type: "list"; content: string; start: number; end: number }
  | { type: "quote"; content: string; start: number; end: number }
  | { type: "image"; href: string; alt: string; start: number; end: number }

const listMarker = /^(\s*)([-*+]|\d+[.)])([ \t]+)(.*)$/
const headingMarker = /^(#{1,6})\s+(.*)$/
const ruleMarker = /^\s{0,3}([-*_])\s*(\1\s*){2,}$/
const quoteMarker = /^\s{0,3}>\s?(.*)$/
const tableDelimiter = /^\s*\|?[\s:|-]+\|[\s:|-]*$/

function startsNewBlock(line: string, next: string | undefined) {
  if (!line.trim()) return true
  if (standaloneImage(line)) return true
  if (fenceAt(line)) return true
  if (headingMarker.test(line)) return true
  if (ruleMarker.test(line)) return true
  if (listMarker.test(line)) return true
  if (quoteMarker.test(line)) return true
  if (/^ {4,}\S/.test(line)) return true
  if (line.includes("|") && next?.includes("|") && tableDelimiter.test(next)) return true
  return false
}

// A deliberately narrow line scanner. Whatever it does not recognise with
// confidence stays Markdown, so OpenTUI keeps ownership of that layout.
function scanLines(lines: string[], offset: number) {
  const blocks: LineBlock[] = []
  const starts = lines.reduce<number[]>((result, line, index) => [...result, index === 0 ? offset : result[index - 1]! + lines[index - 1]!.length + 1], [])
  const range = (start: number, end: number) => ({ start: starts[start]!, end: starts[end - 1]! + lines[end - 1]!.length })
  let index = 0
  while (index < lines.length) {
    const line = lines[index]!
    if (!line.trim()) {
      index++
      continue
    }
    const fence = fenceAt(line)
    if (fence) {
      // Consume the opening fence, its body and the closing fence as one Markdown
      // block so `$` inside code is never scanned for math.
      const start = index
      index++
      while (index < lines.length && !lines[index]!.startsWith(fence)) index++
      blocks.push({ type: "markdown", content: lines.slice(start, Math.min(index + 1, lines.length)).join("\n"), ...range(start, Math.min(index + 1, lines.length)) })
      index++
      continue
    }
    const image = standaloneImage(line)
    if (image) {
      blocks.push({ type: "image", ...image, ...range(index, index + 1) })
      index++
      continue
    }
    if (line.includes("|") && lines[index + 1]?.includes("|") && tableDelimiter.test(lines[index + 1]!)) {
      const start = index
      while (index < lines.length && lines[index]!.includes("|")) index++
      blocks.push({ type: "markdown", content: lines.slice(start, index).join("\n"), ...range(start, index) })
      continue
    }
    if (ruleMarker.test(line)) {
      blocks.push({ type: "markdown", content: line, ...range(index, index + 1) })
      index++
      continue
    }
    const heading = line.match(headingMarker)
    if (heading) {
      blocks.push({ type: "heading", level: heading[1]!.length, content: heading[2]!, ...range(index, index + 1) })
      index++
      continue
    }
    if (quoteMarker.test(line)) {
      const start = index
      while (index < lines.length) {
        const current = lines[index]!
        if (quoteMarker.test(current)) {
          index++
          continue
        }
        // A plain line directly under a quote line continues the quote.
        if (current.trim() && !startsNewBlock(current, lines[index + 1])) {
          index++
          continue
        }
        break
      }
      blocks.push({ type: "quote", content: lines.slice(start, index).join("\n"), ...range(start, index) })
      continue
    }
    if (listMarker.test(line)) {
      const start = index
      while (index < lines.length) {
        const current = lines[index]!
        if (!current.trim()) break
        if (listMarker.test(current)) {
          index++
          continue
        }
        if (startsNewBlock(current, lines[index + 1])) break
        index++
      }
      blocks.push({ type: "list", content: lines.slice(start, index).join("\n"), ...range(start, index) })
      continue
    }
    if (/^ {4,}\S/.test(line)) {
      const start = index
      while (index < lines.length && (/^ {4,}/.test(lines[index]!) || !lines[index]!.trim())) index++
      blocks.push({ type: "markdown", content: lines.slice(start, index).join("\n"), ...range(start, index) })
      continue
    }
    const start = index
    while (index < lines.length && !startsNewBlock(lines[index]!, lines[index + 1])) index++
    blocks.push({ type: "paragraph", content: lines.slice(start, index).join("\n"), ...range(start, index) })
  }
  return blocks
}

export function parseInlineRuns(content: string): InlineRun[] {
  const runs: InlineRun[] = []
  let buffer = ""
  let style: InlineStyle = "text"
  const stack: { marker: string; style: InlineStyle }[] = []
  const flush = () => {
    if (!buffer) return
    runs.push({ type: "text", content: buffer, style })
    buffer = ""
  }
  const open = (marker: string, next: InlineStyle) => {
    flush()
    stack.push({ marker, style: next })
    style = next
  }
  const close = (marker: string) => {
    if (stack.at(-1)?.marker !== marker) return false
    flush()
    stack.pop()
    style = stack.at(-1)?.style ?? "text"
    return true
  }
  // Emphasis has to hug its content, which keeps arithmetic such as `a * b * c`
  // and identifiers such as `snake_case` out of the styling.
  const opensEmphasis = (marker: string, index: number) => {
    const before = content[index - 1] ?? ""
    const after = content[index + 1] ?? ""
    if (!after || /\s/.test(after)) return false
    if (marker === "_" && before !== "" && !/\s/.test(before) && !markdownPunctuation.test(before)) return false
    return findUnescaped(content, marker, index + 1) > index
  }

  for (let index = 0; index < content.length; ) {
    const character = content[index]!

    const code = codeSpanAt(content, index)
    if (code) {
      const inner = code.slice(code.indexOf("`") + 1, -1)
      if (inner) {
        flush()
        runs.push({ type: "text", content: inner, style: "code" })
      }
      index += code.length
      continue
    }

    // Math is matched before the Markdown backslash escape, otherwise `\(` is
    // swallowed as an escaped parenthesis and never becomes a formula.
    const math = inlineMathAt(content, index)
    if (math) {
      flush()
      runs.push(math)
      index += math.open.length + math.content.length + math.close.length
      continue
    }

    if (character === "\\" && markdownPunctuation.test(content[index + 1] ?? "")) {
      buffer += content[index + 1]
      index += 2
      continue
    }

    if (content.startsWith("**", index) || content.startsWith("__", index) || content.startsWith("~~", index)) {
      const marker = content.slice(index, index + 2)
      if (!close(marker)) open(marker, marker === "~~" ? "text" : "strong")
      index += 2
      continue
    }
    if (character === "*" || character === "_") {
      if (close(character)) {
        index++
        continue
      }
      if (opensEmphasis(character, index)) open(character, "emphasis")
      else buffer += character
      index++
      continue
    }
    if (character === "[" && content.includes("](", index + 1)) {
      const closing = content.indexOf("](", index + 1)
      if (closing > index) {
        flush()
        const label = content.slice(index + 1, closing)
        if (label) runs.push({ type: "text", content: label, style: "linkText" })
        index = closing + 2
        while (index < content.length && content[index] !== ")" && content[index] !== "\n") index++
        if (content[index] === ")") index++
        continue
      }
    }

    buffer += character
    index++
  }
  flush()
  return runs
}

const hasMath = (runs: InlineRun[]) => runs.some((run) => run.type === "math")

function listItems(content: string) {
  const items: FlowItem[] = []
  for (const line of content.split("\n")) {
    if (!line.trim()) continue
    const match = line.match(listMarker)
    if (match) {
      items.push({ marker: match[2]!, indent: match[1]!.replace(/\t/g, "  ").length, runs: parseInlineRuns(match[4]!) })
      continue
    }
    const previous = items.at(-1)
    // A plain line under an item continues that item, which is what keeps a
    // wrapped sentence inside its own flow.
    if (previous) previous.runs.push(...parseInlineRuns(" " + line.trim()))
  }
  return items
}

function toFlowBlock(block: Exclude<LineBlock, { type: "image" }>): FlowBlock | undefined {
  if (block.type === "paragraph") {
    const runs = parseInlineRuns(block.content)
    return hasMath(runs) ? { type: "paragraph", runs } : undefined
  }
  if (block.type === "heading") {
    const runs = parseInlineRuns(`${"#".repeat(block.level)} ${block.content}`).map((run) =>
      run.type === "text" && run.style === "text" ? { ...run, style: "heading" as const } : run,
    )
    return { type: "heading", level: block.level, runs }
  }
  if (block.type === "quote") {
    const runs = parseInlineRuns(
      block.content
        .split("\n")
        .map((line) => quoteMarker.exec(line)?.[1] ?? line)
        .join(" "),
    )
    return hasMath(runs) ? { type: "quote", runs } : undefined
  }
  const items = listItems(block.content)
  // One list is rendered by one engine, otherwise its items would disagree
  // about spacing and hanging indents.
  return items.some((item) => hasMath(item.runs)) ? { type: "list", items } : undefined
}

export function scanDocument(content: string): CanvasBlock[] {
  const blocks: CanvasBlock[] = []
  for (const part of splitRaw(content)) {
    if (part.type === "display") {
      blocks.push({ type: "display-math", content: part.content, open: part.open, close: part.close, source: { start: part.start, end: part.end, atom: "formula" } })
      continue
    }
    for (const block of scanLines(part.content.split("\n"), part.start)) {
      if (block.type === "image") {
        blocks.push({ type: "image", href: block.href, alt: block.alt, source: { start: block.start, end: block.end, atom: "text" } })
        continue
      }
      const flow = toFlowBlock(block)
      const source: CanvasSource = {
        start: block.start,
        end: block.end,
        atom: /^(```|~~~)mermaid\b/.test(block.content.trimStart()) ? "mermaid" : "text",
      }
      blocks.push(flow ? { type: "flow", block: flow, source } : { type: "markdown", content: unescapeDollar(block.content), source })
    }
  }
  // Adjacent Markdown belongs to one renderable so it keeps its own margins.
  return blocks.reduce<CanvasBlock[]>((merged, block) => {
    const previous = merged.at(-1)
    if (block.type === "markdown" && previous?.type === "markdown" && block.source.atom === previous.source.atom) {
      previous.content += `\n\n${block.content}`
      previous.source = { ...previous.source, end: block.source.end }
      return merged
    }
    merged.push(block)
    return merged
  }, [])
}

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

function styleOf(theme: Theme, style: InlineStyle) {
  switch (style) {
    case "strong":
      return { fg: theme.markdown.strong, attributes: TextAttributes.BOLD }
    case "emphasis":
      return { fg: theme.markdown.emphasis, attributes: TextAttributes.ITALIC }
    case "code":
      return { fg: theme.markdown.code, attributes: TextAttributes.NONE }
    case "linkText":
      return { fg: theme.markdown.linkText, attributes: TextAttributes.UNDERLINE }
    case "heading":
      return { fg: theme.markdown.heading, attributes: TextAttributes.BOLD }
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

function FlowLine(props: { line: LayoutLine; prefix: string; prefixColor: RGBA; layout: FlowLayout }) {
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
          const style = styleOf(theme, run.style)
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
      return (
        <box width="100%" flexDirection="column" marginTop={1} flexShrink={0}>
          <FlowLines runs={block.runs} columns={available()} layout={layout} />
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
