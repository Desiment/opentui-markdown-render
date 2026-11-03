import stringWidth from "string-width"
import type { StyledAtom } from "./inline-style"

export type MathMeasure = { columns: number; rows: number; baseline: number }
export type MathVariant = "normal" | "compact" | "standard"
export type LayoutRun = { atom: Extract<StyledAtom, { type: "text" | "math" }>; columns: number; rows: number; variant?: MathVariant }
export type LayoutLine = { runs: LayoutRun[]; columns: number; height: number; textRow: number }

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

// Measurements, compact collision checks, and standard-size choices use the
// shared styled AST.
export function layoutAtoms(
  atoms: readonly StyledAtom[],
  columns: number,
  measureOf: (content: string) => { normal: MathMeasure; compact: MathMeasure; standard: MathMeasure } | undefined,
  compactOverflow: boolean,
): LayoutLine[] {
  columns = Math.max(1, columns)
  const lines: LayoutLine[] = []
  let current: LayoutLine = { runs: [], columns: 0, height: 1, textRow: 0 }
  const flush = (force = false) => {
    if (!current.runs.length && !force) return
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
    if (run.atom.type === "text") {
      const text = run.atom.text.trimStart()
      const trimmed = { ...run, atom: { ...run.atom, text }, columns: stringWidth(text) }
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

  for (const atom of atoms) {
    if (atom.type === "break") {
      flush(true)
      continue
    }
    if (atom.type === "math") {
      const natural = measureOf(atom.content)?.normal
      const squeezed = natural ? natural.columns > columns : false
      const entry: LayoutRun = natural
        ? { atom, columns: squeezed ? columns : natural.columns, rows: Math.max(1, Math.round(squeezed ? natural.rows * columns / natural.columns : natural.rows)) }
        : { atom, columns: Math.min(columns, Math.max(3, atom.raw.length)), rows: 1 }
      place(entry, natural ? Math.max(0, Math.ceil(natural.baseline) - 1) : 0)
      continue
    }
    // Soft newlines in Markdown prose are spaces. A hard break is its own atom.
    const normalized = atom.text.replace(/\r?\n/g, " ")
    const words = normalized.match(/\s*\S+\s*/g) ?? (normalized ? [normalized] : [])
    for (const word of words) {
      if (stringWidth(word) > columns) {
        for (const chunk of hardChunks(word.trimEnd(), columns)) {
          place({ atom: { ...atom, text: chunk }, columns: stringWidth(chunk), rows: 1 })
        }
      } else {
        place({ atom: { ...atom, text: word }, columns: stringWidth(word), rows: 1 })
      }
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
            entry, column,
            row: row + (entry.atom.type === "text" ? line.textRow : 0),
            rows: entry.atom.type === "math" ? entry.rows : 1,
          }
          column += entry.columns
          return area
        })
      })
      for (const area of occupied) {
        if (area.entry.atom.type !== "math" || area.entry.variant === "compact" || area.rows <= 1) continue
        const collision = occupied.some((other) =>
          other.entry !== area.entry &&
          other.column < area.column + area.entry.columns &&
          area.column < other.column + other.entry.columns &&
          other.row < area.row + area.rows &&
          area.row + 1 < other.row + other.rows,
        )
        if (!collision) continue
        const compact = measureOf(area.entry.atom.content)?.compact
        if (!compact) continue
        area.entry.variant = "compact"
        area.entry.columns = compact.columns
        area.entry.rows = compact.rows
        changed = true
      }
    }
  }
  for (const line of lines) {
    const entry = line.runs.at(-1)
    if (!entry || entry.atom.type !== "math" || entry.variant === "compact") continue
    const standard = measureOf(entry.atom.content)?.standard
    if (!standard || line.columns - entry.columns + standard.columns > columns) continue
    entry.variant = "standard"
    entry.columns = standard.columns
    entry.rows = standard.rows
  }
  for (const line of lines) {
    line.columns = line.runs.reduce((total, entry) => total + entry.columns, 0)
    line.textRow = Math.max(0, ...line.runs.flatMap((entry) => {
      if (entry.atom.type !== "math") return []
      const measured = measureOf(entry.atom.content)
      return measured ? [Math.max(0, Math.ceil(measured[entry.variant ?? "normal"].baseline) - 1)] : []
    }))
    line.height = Math.max(1, line.textRow + 1, ...line.runs.map((entry) => entry.rows))
  }
  return lines
}
