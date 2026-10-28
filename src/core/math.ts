import type { TokenizerAndRendererExtension } from "marked"

export type MathInlineToken = {
  type: "mathInline"
  raw: string
  text: string
  content: string
  open: "$" | "\\("
  close: "$" | "\\)"
}

export type MathDisplayToken = {
  type: "mathDisplay"
  raw: string
  text: string
  content: string
  open: "$$" | "\\["
  close: "$$" | "\\]"
}

export type MathToken = MathInlineToken | MathDisplayToken

function isEscaped(src: string, index: number): boolean {
  let backslashes = 0
  let i = index - 1
  while (i >= 0 && src[i] === "\\") {
    backslashes++
    i--
  }
  return backslashes % 2 === 1
}

export function createMathInlineExtension(): TokenizerAndRendererExtension {
  return {
    name: "mathInline",
    level: "inline",
    start(src: string) {
      let i = 0
      while (i < src.length) {
        const ch = src[i]
        if (ch === "\\") {
          if (src[i + 1] === "(") {
            if (!isEscaped(src, i)) return i
          }
          i += 2
          continue
        }
        if (ch === "$") {
          if (src[i + 1] === "$") {
            i += 2
            continue
          }
          if (!isEscaped(src, i)) return i
        }
        i++
      }
      return
    },
    tokenizer(src: string) {
      // Try \(...\)
      if (src.startsWith("\\(")) {
        // look for \)
        const end = src.indexOf("\\)")
        if (end > 2 && src.slice(2, end).indexOf("\n") === -1) {
          const content = src.slice(2, end)
          const raw = src.slice(0, end + 2)
          return {
            type: "mathInline",
            raw,
            text: content,
            content,
            open: "\\(",
            close: "\\)",
          }
        }
      }
      // Try single $
      if (src[0] === "$" && src[1] !== "$") {
        // find closing $ not escaped
        let j = 1
        while (j < src.length) {
          if (src[j] === "\n") break
          if (src[j] === "$" && !isEscaped(src, j)) {
            if (j === 1) break // empty
            const content = src.slice(1, j)
            const raw = src.slice(0, j + 1)
            return {
              type: "mathInline",
              raw,
              text: content,
              content,
              open: "$",
              close: "$",
            }
          }
          j++
        }
      }
      return
    },
  }
}

export function createMathDisplayExtension(): TokenizerAndRendererExtension {
  return {
    name: "mathDisplay",
    level: "inline",
    start(src: string) {
      let i = 0
      while (i < src.length) {
        const ch = src[i]
        if (ch === "\\") {
          if (src[i + 1] === "[") {
            if (!isEscaped(src, i)) return i
          }
          i += 2
          continue
        }
        if (ch === "$") {
          if (src[i + 1] === "$" && !isEscaped(src, i)) return i
        }
        i++
      }
      return
    },
    tokenizer(src: string) {
      // $$...$$
      if (src.startsWith("$$")) {
        const end = src.indexOf("$$", 2)
        if (end > 2) {
          const content = src.slice(2, end)
          const raw = src.slice(0, end + 2)
          return {
            type: "mathDisplay",
            raw,
            text: content,
            content,
            open: "$$",
            close: "$$",
          }
        }
      }
      // \[...\]
      if (src.startsWith("\\[")) {
        const end = src.indexOf("\\]", 2)
        if (end > 2) {
          const content = src.slice(2, end)
          const raw = src.slice(0, end + 2)
          return {
            type: "mathDisplay",
            raw,
            text: content,
            content,
            open: "\\[",
            close: "\\]",
          }
        }
      }
      return
    },
  }
}
