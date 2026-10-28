import stringWidth from "string-width"
import type { StyledAtom } from "./inline-style"

export type MathMeasure = { columns: number; rows: number; baseline: number }
export type MathVariant = "normal" | "compact" | "standard"
export type LayoutAtom =
  | { kind: "text"; text: string; atom: Extract<StyledAtom, { type: "text" }> }
  | { kind: "math"; atom: Extract<StyledAtom, { type: "math" }> }
export type LayoutLine = { atoms: LayoutAtom[]; columns: number; height: number; textRow: number }

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

export function layoutAtoms(
  atoms: StyledAtom[],
  columns: number,
  measureOf: (content: string) => { normal: MathMeasure; compact: MathMeasure; standard: MathMeasure } | undefined,
  compactOverflow: boolean,
): LayoutLine[] {
  const lines: LayoutLine[] = []
  let current: LayoutLine = { atoms: [], columns: 0, height: 1, textRow: 0 }
  const flush = () => {
    if (!current.atoms.length) return
    lines.push(current)
    current = { atoms: [], columns: 0, height: 1, textRow: 0 }
  }
  const place = (entry: LayoutAtom, textRow = 0) => {
    const add = (e: LayoutAtom) => {
      current.atoms.push(e)
      const w = e.kind === "text" ? stringWidth(e.text) : (e as any).columns || 0
      // columns computed separately
      current.height = Math.max(current.height, e.kind === "math" ? (e as any).rows || 1 : 1, textRow + 1)
      current.textRow = Math.max(current.textRow, textRow)
    }
    // compute width
    let entryW = 0
    let entryRows = 1
    if (entry.kind === "text") {
      entryW = stringWidth(entry.text)
    } else if (entry.kind === "math") {
      const m = measureOf(entry.atom.content)
      if (m) {
        const n = m.normal
        entryW = Math.max(1, Math.round(n.columns))
        entryRows = Math.max(1, Math.round(n.rows))
      } else {
        entryW = Math.min(columns, Math.max(3, entry.atom.content.length + 2))
        entryRows = 1
      }
    }
    ;(entry as any).columns = entryW
    ;(entry as any).rows = entryRows
    if (current.columns + entryW <= columns || !current.atoms.length) {
      current.atoms.push(entry)
      current.columns += entryW
      current.height = Math.max(current.height, entryRows, textRow + 1)
      current.textRow = Math.max(current.textRow, textRow)
      return
    }
    if (entry.kind === "text") {
      flush()
      current.atoms.push(entry)
      current.columns += entryW
      current.height = Math.max(current.height, entryRows, textRow + 1)
      current.textRow = Math.max(current.textRow, textRow)
      return
    }
    flush()
    current.atoms.push(entry)
    current.columns += entryW
    current.height = Math.max(current.height, entryRows, textRow + 1)
    current.textRow = Math.max(current.textRow, textRow)
  }

  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i]
    if (a.type === "break") {
      flush()
      // push empty line marker? just flush creates new line
      continue
    }
    if (a.type === "math") {
      const measured = measureOf(a.content)
      const natural = measured?.normal
      const squeezed = natural ? natural.columns > columns : false
      const entry: any = { kind: "math", atom: a, variant: "normal" as MathVariant }
      if (natural) {
        entry.columns = squeezed ? columns : natural.columns
        entry.rows = Math.max(1, Math.round(squeezed ? (natural.rows * columns) / natural.columns : natural.rows))
      } else {
        entry.columns = Math.min(columns, Math.max(3, a.content.length + 2))
        entry.rows = 1
      }
      const textRow = natural ? Math.max(0, Math.ceil(natural.baseline) - 1) : 0
      place(entry, textRow)
      continue
    }
    if (a.type === "text") {
      // split by words
      const matches = a.text.match(/\s*\S+\s*/g)
      if (!matches) {
        place({ kind: "text", atom: a, text: a.text } as any)
        continue
      }
      for (const word of matches) {
        const size = stringWidth(word)
        if (size > columns) {
          for (const chunk of hardChunks(word.trimEnd(), columns)) {
            place({ kind: "text", atom: { ...a, text: chunk }, text: chunk } as any)
          }
          continue
        }
        place({ kind: "text", atom: { ...a, text: word }, text: word } as any)
      }
      continue
    }
  }
  flush()
  // recompute
  for (const line of lines) {
    line.columns = line.atoms.reduce((t, e: any) => t + (e.columns || 0), 0)
    line.height = Math.max(1, line.textRow + 1, ...line.atoms.map((e: any) => e.rows || 1))
  }
  return lines
}
