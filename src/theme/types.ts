import type { ColorInput, RGBA } from "@opentui/core"

export type ThemeMode = "light" | "dark"

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
  readonly markdown: {
    readonly text: RGBA
    readonly heading: RGBA
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
  readonly markdown?: { readonly [K in keyof Theme["markdown"]]?: ColorInput }
  readonly syntax?: { readonly [K in keyof Theme["syntax"]]?: ColorInput }
  readonly diff?: {
    readonly text?: { readonly added?: ColorInput; readonly removed?: ColorInput; readonly context?: ColorInput }
    readonly background?: { readonly added?: ColorInput; readonly removed?: ColorInput; readonly context?: ColorInput }
  }
}
