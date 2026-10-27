import type { ColorInput, RGBA } from "@opentui/core"

export type ThemeMode = "light" | "dark"

// The six heading levels a Markdown document can have.
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type Theme = {
  readonly mode: ThemeMode
  readonly accent: RGBA
  readonly categorical: readonly RGBA[]
  readonly text: {
    readonly base: RGBA
    readonly muted: RGBA
    readonly feedback: {
      readonly error: RGBA
      readonly warning: RGBA
      readonly success: RGBA
      readonly info: RGBA
    }
    readonly action: {
      readonly primary: { readonly focused: RGBA }
    }
  }
  readonly background: {
    readonly base: RGBA
  }
  readonly border: {
    readonly base: RGBA
  }
  // The frame (viewer window) colours. Optional so a theme built by hand keeps
  // working; the frame falls back to the border and the muted text.
  readonly frame?: FrameTheme
  // Colours of the status line bar. Optional so a host that builds a theme by
  // hand keeps working; the bar falls back to colours derived from the theme.
  readonly statusline?: StatusLineTheme
  readonly markdown: {
    readonly text: RGBA
    readonly heading: RGBA
    // The colour of each heading level. `heading` is the base colour every
    // level falls back to, so a theme that only knows one heading colour keeps
    // working.
    readonly headingLevels: readonly [RGBA, RGBA, RGBA, RGBA, RGBA, RGBA]
    readonly link: RGBA
    readonly linkText: RGBA
    readonly code: RGBA
    readonly blockQuote: RGBA
    readonly emphasis: RGBA
    readonly strong: RGBA
    readonly horizontalRule: RGBA
    readonly listItem: RGBA
    readonly listEnumeration: RGBA
    readonly image: RGBA
    readonly imageText: RGBA
    readonly codeBlock: RGBA
  }
  readonly syntax: {
    readonly comment: RGBA
    readonly keyword: RGBA
    readonly function: RGBA
    readonly variable: RGBA
    readonly string: RGBA
    readonly number: RGBA
    readonly type: RGBA
    readonly operator: RGBA
    readonly punctuation: RGBA
  }
  readonly diff: {
    readonly text: { readonly added: RGBA; readonly removed: RGBA; readonly context: RGBA }
    readonly background: { readonly added: RGBA; readonly removed: RGBA; readonly context: RGBA }
  }
}

// The status line bar has its own background so it reads as a separate strip
// instead of another line of the page.
export type StatusLineTheme = {
  readonly background: RGBA
  readonly foreground: RGBA
  readonly title: RGBA
  readonly muted: RGBA
  readonly border: RGBA
}

export type StatusLineThemeOverride = {
  readonly background?: ColorInput
  readonly foreground?: ColorInput
  readonly title?: ColorInput
  readonly muted?: ColorInput
  readonly border?: ColorInput
}

// The frame is the window around the document: its border and the label carved
// into the top edge.
export type FrameTheme = {
  readonly border: RGBA
  readonly title: RGBA
}

export type FrameThemeOverride = {
  readonly border?: ColorInput
  readonly title?: ColorInput
}

// The colours of the Markdown surface. `heading1`..`heading6` override the
// colour of a single heading level; `heading` overrides the colour of every
// level that has no colour of its own.
export type MarkdownThemeOverride = {
  readonly [K in Exclude<keyof Theme["markdown"], "headingLevels">]?: ColorInput
} & {
  readonly heading1?: ColorInput
  readonly heading2?: ColorInput
  readonly heading3?: ColorInput
  readonly heading4?: ColorInput
  readonly heading5?: ColorInput
  readonly heading6?: ColorInput
}

// Host themes and the config file provide a partial, color-input override that
// is merged over the bundled default for the selected mode.
export type ThemeOverride = {
  readonly mode?: ThemeMode
  readonly accent?: ColorInput
  readonly categorical?: readonly ColorInput[]
  readonly text?: {
    readonly base?: ColorInput
    readonly muted?: ColorInput
    readonly feedback?: {
      readonly error?: ColorInput
      readonly warning?: ColorInput
      readonly success?: ColorInput
      readonly info?: ColorInput
    }
    readonly action?: { readonly primary?: { readonly focused?: ColorInput } }
  }
  readonly background?: { readonly base?: ColorInput }
  readonly border?: { readonly base?: ColorInput }
  readonly frame?: FrameThemeOverride
  readonly statusline?: StatusLineThemeOverride
  readonly markdown?: MarkdownThemeOverride
  readonly syntax?: { readonly [K in keyof Theme["syntax"]]?: ColorInput }
  readonly diff?: {
    readonly text?: { readonly added?: ColorInput; readonly removed?: ColorInput; readonly context?: ColorInput }
    readonly background?: { readonly added?: ColorInput; readonly removed?: ColorInput; readonly context?: ColorInput }
  }
}
