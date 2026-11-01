import { RGBA } from "@opentui/core"
import type { Theme, ThemePreset } from "./types"

const h = (hex: string) => RGBA.fromHex(hex)

// The canonical Solarized base tones and accents (8 + 8), without interpolated
// shades. Both presets share these swatches and differ only in how they use them.
const solarizedPalette = [
  "#002b36", "#073642", "#586e75", "#657b83", "#839496", "#93a1a1", "#eee8d5", "#fdf6e3",
  "#b58900", "#cb4b16", "#dc322f", "#d33682", "#6c71c4", "#268bd2", "#2aa198", "#859900",
].map(h)

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
  border: { base: h("#8c959f") },
  frame: { border: h("#8c959f"), title: h("#59636e") },
  markdown: {
    text: h("#1f2328"),
    heading: h("#8250df"),
    // The ramp of the heading levels: the top level takes the accent, the
    // middle levels the heading colour, the lowest ones a readable text colour.
    headingLevels: [h("#0969da"), h("#8250df"), h("#8250df"), h("#6f42c1"), h("#3d444d"), h("#3d444d")],
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

const solarizedLight: Theme = {
  mode: "light",
  palette: solarizedPalette,
  accent: h("#268bd2"),
  categorical: [h("#268bd2"), h("#6c71c4"), h("#859900"), h("#b58900"), h("#dc322f"), h("#cb4b16")],
  text: {
    base: h("#586e75"), muted: h("#657b83"),
    feedback: { error: h("#dc322f"), warning: h("#b58900"), success: h("#859900"), info: h("#268bd2") },
    action: { primary: { focused: h("#268bd2") } },
  },
  background: { base: h("#fdf6e3") },
  border: { base: h("#657b83") },
  frame: { border: h("#657b83"), title: h("#586e75") },
  markdown: {
    text: h("#586e75"), heading: h("#268bd2"),
    headingLevels: [h("#268bd2"), h("#268bd2"), h("#268bd2"), h("#268bd2"), h("#268bd2"), h("#268bd2")],
    link: h("#268bd2"), linkText: h("#268bd2"), code: h("#cb4b16"), blockQuote: h("#657b83"),
    emphasis: h("#586e75"), strong: h("#586e75"), horizontalRule: h("#657b83"),
    listItem: h("#586e75"), listEnumeration: h("#586e75"), image: h("#268bd2"),
    imageText: h("#268bd2"), codeBlock: h("#586e75"),
  },
  syntax: {
    comment: h("#657b83"), keyword: h("#dc322f"), function: h("#6c71c4"), variable: h("#586e75"),
    string: h("#2aa198"), number: h("#d33682"), type: h("#b58900"), operator: h("#268bd2"),
    punctuation: h("#586e75"),
  },
  diff: {
    text: { added: h("#859900"), removed: h("#dc322f"), context: h("#657b83") },
    background: { added: h("#eee8d5"), removed: h("#eee8d5"), context: h("#eee8d5") },
  },
}

const solarizedDark: Theme = {
  mode: "dark",
  palette: solarizedPalette,
  accent: h("#268bd2"),
  categorical: [h("#268bd2"), h("#6c71c4"), h("#859900"), h("#b58900"), h("#dc322f"), h("#cb4b16")],
  text: {
    base: h("#93a1a1"), muted: h("#839496"),
    feedback: { error: h("#dc322f"), warning: h("#b58900"), success: h("#859900"), info: h("#268bd2") },
    action: { primary: { focused: h("#268bd2") } },
  },
  background: { base: h("#002b36") },
  border: { base: h("#586e75") },
  frame: { border: h("#586e75"), title: h("#93a1a1") },
  markdown: {
    text: h("#93a1a1"), heading: h("#268bd2"),
    headingLevels: [h("#268bd2"), h("#268bd2"), h("#268bd2"), h("#268bd2"), h("#268bd2"), h("#268bd2")],
    link: h("#268bd2"), linkText: h("#268bd2"), code: h("#cb4b16"), blockQuote: h("#839496"),
    emphasis: h("#93a1a1"), strong: h("#93a1a1"), horizontalRule: h("#586e75"),
    listItem: h("#93a1a1"), listEnumeration: h("#93a1a1"), image: h("#268bd2"),
    imageText: h("#268bd2"), codeBlock: h("#93a1a1"),
  },
  syntax: {
    comment: h("#839496"), keyword: h("#dc322f"), function: h("#6c71c4"), variable: h("#93a1a1"),
    string: h("#2aa198"), number: h("#d33682"), type: h("#b58900"), operator: h("#268bd2"),
    punctuation: h("#93a1a1"),
  },
  diff: {
    text: { added: h("#859900"), removed: h("#dc322f"), context: h("#839496") },
    background: { added: h("#073642"), removed: h("#073642"), context: h("#073642") },
  },
}

export function defaultTheme(preset: ThemePreset): Theme {
  switch (preset) {
    case "light": return light
    case "dark": return dark
    case "solarized-light": return solarizedLight
    case "solarized-dark": return solarizedDark
  }
}
