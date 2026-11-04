import type { Theme, ThemePreset } from "../theme/types"
import { resolveTheme } from "../theme/resolve"
import { loadTheme } from "../theme/load"
import { createDocumentLayout, type DocumentLayout, type FrameConfig, type TablesConfig } from "../core"
import type { MarkdownConfig } from "./types"

export type ThemeModeSetting = ThemePreset

// The configuration describes the document's defaults. The host supplies live
// values separately; a ready-made theme is never merged with the file theme.
export type ThemeRuntime = {
  readonly theme?: Theme
  readonly themeMode?: ThemeModeSetting | null
}

export function resolveConfiguredTheme(config: MarkdownConfig, runtime: ThemeRuntime = {}): Theme {
  if (runtime.theme) return runtime.theme
  const explicit = runtime.themeMode ?? undefined
  const override = loadTheme(explicit ?? config.theme?.name ?? "light")
  const mode = override?.mode ?? "light"
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
