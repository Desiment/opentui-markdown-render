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

export type MathDisplayBlockToken = Omit<MathDisplayToken, "type"> & {
  type: "mathDisplayBlock"
}

export type MathToken = MathInlineToken | MathDisplayToken | MathDisplayBlockToken

function isEscaped(src: string, index: number): boolean {
  let backslashes = 0
  let i = index - 1
  while (i >= 0 && src[i] === "\\") {
    backslashes++
    i--
  }
  return backslashes % 2 === 1
}

function closing(src: string, delimiter: string, start: number, singleLine: boolean): number {
  for (let index = start; index < src.length; index++) {
    if (singleLine && src[index] === "\n") break
    if (src.startsWith(delimiter, index) && !isEscaped(src, index)) return index
  }
  return -1
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
        const end = closing(src, "\\)", 2, true)
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
        const end = closing(src, "$$", 2, false)
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
        const end = closing(src, "\\]", 2, false)
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

// Display delimiters can span Markdown block syntax. In particular, a line
// containing only `=` is otherwise consumed as a Setext heading underline
// before Marked reaches its inline extensions. Claim formulas that begin at a
// line boundary at block level, while leaving embedded forms such as
// `before $$x$$ after` to the inline extension below.
export function createMathDisplayBlockExtension(): TokenizerAndRendererExtension {
  return {
    name: "mathDisplayBlock",
    level: "block",
    start(src: string) {
      // Marked calls block start hints with the first source character already
      // removed. The current position is handled by tokenizer(); this hint must
      // therefore only report delimiters after an actual line break.
      const match = /\n(?= {0,3}(?:\$\$|\\\[))/.exec(src)
      if (!match) return
      return match.index + 1
    },
    tokenizer(src: string) {
      const match = /^( {0,3})(\$\$|\\\[)/.exec(src)
      if (!match) return
      const open = match[2] as "$$" | "\\["
      const close = open === "$$" ? "$$" : "\\]"
      const contentStart = match[0].length
      const end = closing(src, close, contentStart, false)
      if (end <= contentStart) return
      const content = src.slice(contentStart, end)
      const raw = src.slice(0, end + close.length)
      return {
        type: "mathDisplayBlock",
        raw,
        text: content,
        content,
        open,
        close,
      }
    },
  }
}
