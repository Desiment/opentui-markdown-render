import type { Theme, ThemeMode } from "../theme/types"
import { resolveTheme } from "../theme/resolve"
import { createDocumentLayout, type DocumentLayout, type FrameConfig, type TablesConfig } from "../core"
import type { MarkdownConfig } from "./types"

export type ThemeModeSetting = ThemeMode | "auto"

// The configuration describes the document's defaults. The host supplies live
// values separately; a ready-made theme is never merged with the file theme.
export type ThemeRuntime = {
  readonly theme?: Theme
  readonly themeMode?: ThemeModeSetting | null
  readonly terminalThemeMode?: ThemeMode | null
}

export function resolveConfiguredTheme(config: MarkdownConfig, runtime: ThemeRuntime = {}): Theme {
  if (runtime.theme) return runtime.theme
  const explicit = runtime.themeMode && runtime.themeMode !== "auto" ? runtime.themeMode : undefined
  const mode = explicit ?? config.theme?.mode ?? runtime.terminalThemeMode ?? "dark"
  // resolveTheme normally gives override.mode precedence over mode. An explicit
  // host setting must win over the mode in the file, including for defaults.
  const override = explicit ? { ...config.theme, mode } : config.theme
  return resolveTheme({ mode, override })
}

export type LayoutRuntime = {
  readonly viewport: number
  readonly frame?: FrameConfig
  readonly tables?: TablesConfig
}

export function resolveConfiguredLayout(config: MarkdownConfig, runtime: LayoutRuntime): DocumentLayout {
  return createDocumentLayout({
    viewport: runtime.viewport,
    frame: runtime.frame ?? config.frame,
    tables: runtime.tables ?? config.tables,
  })
}
