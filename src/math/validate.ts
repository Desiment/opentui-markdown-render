// MiTeX and Typst both accept a truncated formula and lay out whatever they can
// parse, so an author error such as `\frac{1}{` becomes a small, wrong image
// instead of an error. There is no structured diagnostic to key off, so this is
// a deliberately conservative structural check: it only rejects input that is
// unambiguously incomplete and can never be valid math.
//
// Only `{}` and `\left`/`\right` are treated as structural. `[]` and `()` are
// ordinary math characters (interval notation such as `[0, 1)` is unbalanced on
// purpose), so they are left alone.
export function isRenderableLatex(content: string) {
  let depth = 0
  let left = 0
  let right = 0
  for (let index = 0; index < content.length; index++) {
    const character = content[index]!
    if (character === "\\") {
      if (content[index + 1] === undefined) return false
      // A backslash protects the next character (`\{`, `\}`), so it is consumed
      // here rather than counted as a brace.
      if (!/[A-Za-z]/.test(content[index + 1]!)) {
        index++
        continue
      }
      let cursor = index + 1
      while (cursor < content.length && /[A-Za-z]/.test(content[cursor]!)) cursor++
      const name = content.slice(index, cursor)
      if (name === "\\left") left++
      else if (name === "\\right") right++
      index = cursor - 1
      continue
    }
    if (character === "{") {
      depth++
      continue
    }
    if (character === "}") {
      if (depth === 0) return false
      depth--
    }
  }
  // `\frac{1}{` leaves an open group; an unmatched `\left` or `\right` is the
  // same class of error.
  return depth === 0 && left === right
}
