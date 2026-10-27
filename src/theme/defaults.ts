import { RGBA } from "@opentui/core"
import type { Theme, ThemeMode } from "./types"

const h = (hex: string) => RGBA.fromHex(hex)

const light: Theme = {
  mode: "light",
  accent: h("#0969da"),
  categorical: [h("#0969da"), h("#8250df"), h("#1a7f37"), h("#9a6700"), h("#cf222e"), h("#bc4c00")],
  text: {
    base: h("#1f2328"),
    muted: h("#59636e"),
    feedback: {
      error: h("#cf222e"),
      warning: h("#9a6700"),
      success: h("#1a7f37"),
      info: h("#0969da"),
    },
    action: { primary: { focused: h("#0969da") } },
  },
  background: { base: h("#ffffff") },
  border: { base: h("#d1d9e0") },
  frame: { border: h("#d1d9e0"), title: h("#59636e") },
  markdown: {
    text: h("#1f2328"),
    heading: h("#8250df"),
    // The ramp of the heading levels: the top level takes the accent, the
    // middle levels the heading colour, the lowest ones the muted text colour.
    headingLevels: [h("#0969da"), h("#8250df"), h("#8250df"), h("#59636e"), h("#59636e"), h("#59636e")],
    link: h("#0969da"),
    linkText: h("#0969da"),
    code: h("#953800"),
    blockQuote: h("#59636e"),
    emphasis: h("#1f2328"),
    strong: h("#1f2328"),
    horizontalRule: h("#d1d9e0"),
    listItem: h("#1f2328"),
    listEnumeration: h("#1f2328"),
    image: h("#0969da"),
    imageText: h("#0969da"),
    codeBlock: h("#1f2328"),
  },
  syntax: {
    comment: h("#59636e"),
    keyword: h("#cf222e"),
    function: h("#8250df"),
    variable: h("#1f2328"),
    string: h("#0a3069"),
    number: h("#0550ae"),
    type: h("#0550ae"),
    operator: h("#0550ae"),
    punctuation: h("#1f2328"),
  },
  diff: {
    text: { added: h("#1a7f37"), removed: h("#cf222e"), context: h("#59636e") },
    background: { added: h("#dafbe1"), removed: h("#ffebe9"), context: h("#f6f8fa") },
  },
}

const dark: Theme = {
  mode: "dark",
  accent: h("#58a6ff"),
  categorical: [h("#58a6ff"), h("#d2a8ff"), h("#3fb950"), h("#d29922"), h("#f85149"), h("#ffa657")],
  text: {
    base: h("#e6edf3"),
    muted: h("#8b949e"),
    feedback: {
      error: h("#f85149"),
      warning: h("#d29922"),
      success: h("#3fb950"),
      info: h("#58a6ff"),
    },
    action: { primary: { focused: h("#58a6ff") } },
  },
  background: { base: h("#0d1117") },
  border: { base: h("#30363d") },
  frame: { border: h("#30363d"), title: h("#8b949e") },
  markdown: {
    text: h("#e6edf3"),
    heading: h("#d2a8ff"),
    headingLevels: [h("#58a6ff"), h("#d2a8ff"), h("#d2a8ff"), h("#8b949e"), h("#8b949e"), h("#8b949e")],
    link: h("#58a6ff"),
    linkText: h("#58a6ff"),
    code: h("#ffa657"),
    blockQuote: h("#8b949e"),
    emphasis: h("#e6edf3"),
    strong: h("#e6edf3"),
    horizontalRule: h("#30363d"),
    listItem: h("#e6edf3"),
    listEnumeration: h("#e6edf3"),
    image: h("#58a6ff"),
    imageText: h("#58a6ff"),
    codeBlock: h("#e6edf3"),
  },
  syntax: {
    comment: h("#8b949e"),
    keyword: h("#ff7b72"),
    function: h("#d2a8ff"),
    variable: h("#ffa657"),
    string: h("#a5d6ff"),
    number: h("#79c0ff"),
    type: h("#ffa657"),
    operator: h("#ff7b72"),
    punctuation: h("#c9d1d9"),
  },
  diff: {
    text: { added: h("#3fb950"), removed: h("#f85149"), context: h("#8b949e") },
    background: { added: h("#12261e"), removed: h("#25171c"), context: h("#161b22") },
  },
}

export function defaultTheme(mode: ThemeMode): Theme {
  return mode === "light" ? light : dark
}
