// The document scanner is the part of the renderer that turns a Markdown
// source into the blocks the two engines draw. It is pure: no OpenTUI, no
// Solid, no file system. A host can scan a document without a renderer.

export type InlineStyle = "text" | "strong" | "emphasis" | "code" | "linkText" | "heading" | "headingMarker"

export type InlineRun = { type: "text"; content: string; style: InlineStyle } | InlineMathRun

export type InlineMathRun = { type: "math"; content: string; open: string; close: string }

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

// A paragraph that is exactly one image is rendered as a picture, not as inline
// text.
export type MarkdownImage = { readonly alt: string; readonly href: string }

export function standaloneImage(source: string): MarkdownImage | undefined {
  const match = /^!\[([^\]]*)\]\((?:<([^>]+)>|([^\s)]+))\)\s*$/.exec(source.trim())
  if (!match) return undefined
  return { alt: match[1] ?? "", href: match[2] ?? match[3] ?? "" }
}

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
    const runs = parseInlineRuns(block.content).map((run) =>
      run.type === "text" && run.style === "text" ? { ...run, style: "heading" as const } : run,
    )
    // The marker stays in the output: it shows the level of the heading at a
    // glance. It is a run of its own, so it can be styled apart from the text
    // of the heading.
    const marker = { type: "text" as const, content: `${"#".repeat(block.level)} `, style: "headingMarker" as const }
    return { type: "heading", level: block.level, runs: [marker, ...runs] }
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
