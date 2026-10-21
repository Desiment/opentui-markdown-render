import { parseColor, type ColorInput, type RGBA } from "@opentui/core"
import { defaultTheme } from "./defaults"
import { mixColors } from "./colors"
import type { StatusLineTheme, StatusLineThemeOverride, Theme, ThemeMode, ThemeOverride } from "./types"

export function resolveTheme(options: {
  mode: ThemeMode | null | undefined
  override?: ThemeOverride
}): Theme {
  const override = options.override
  const mode = override?.mode ?? options.mode ?? "dark"
  return mergeTheme(defaultTheme(mode), override)
}

// The bar background is the accent colour toned down over the page background,
// so the strip separates from the page without a loud block of colour.
export function deriveStatusLineTheme(theme: {
  readonly mode: ThemeMode
  readonly accent: RGBA
  readonly background: { readonly base: RGBA }
  readonly text: { readonly base: RGBA; readonly muted: RGBA }
}): StatusLineTheme {
  // The same weight in both modes: a soft tint in light mode and a slightly
  // stronger one in dark mode.
  const ratio = theme.mode === "light" ? 0.12 : 0.14
  return {
    background: mixColors(theme.accent, theme.background.base, ratio),
    foreground: theme.text.base,
    title: theme.accent,
    muted: theme.text.muted,
    border: theme.accent,
  }
}

export function mergeTheme(base: Theme, override: ThemeOverride | undefined): Theme {
  if (!override) return base
  const color = (value: ColorInput | undefined, fallback: RGBA) => (value === undefined ? fallback : parseColor(value))
  const accent = color(override.accent, base.accent)
  const background = { base: color(override.background?.base, base.background.base) }
  const text = {
    base: color(override.text?.base, base.text.base),
    muted: color(override.text?.muted, base.text.muted),
  }
  const derived = deriveStatusLineTheme({ mode: override.mode ?? base.mode, accent, background, text })
  return {
    mode: override.mode ?? base.mode,
    accent,
    categorical: override.categorical ? override.categorical.map((entry) => parseColor(entry)) : base.categorical,
    text: {
      base: text.base,
      muted: text.muted,
      feedback: {
        error: color(override.text?.feedback?.error, base.text.feedback.error),
        warning: color(override.text?.feedback?.warning, base.text.feedback.warning),
        success: color(override.text?.feedback?.success, base.text.feedback.success),
        info: color(override.text?.feedback?.info, base.text.feedback.info),
      },
      action: {
        primary: { focused: color(override.text?.action?.primary?.focused, base.text.action.primary.focused) },
      },
    },
    background,
    border: { base: color(override.border?.base, base.border.base) },
    // The bar colours follow the merged accent, so overriding the accent in
    // the config file moves the bar with it. A theme that already carries
    // explicit bar colours keeps them.
    statusline: mergeStatusLineTheme(derived, base.statusline, override.statusline),
    markdown: mergeColors(base.markdown, override.markdown),
    syntax: mergeColors(base.syntax, override.syntax),
    diff: {
      text: {
        added: color(override.diff?.text?.added, base.diff.text.added),
        removed: color(override.diff?.text?.removed, base.diff.text.removed),
        context: color(override.diff?.text?.context, base.diff.text.context),
      },
      background: {
        added: color(override.diff?.background?.added, base.diff.background.added),
        removed: color(override.diff?.background?.removed, base.diff.background.removed),
        context: color(override.diff?.background?.context, base.diff.background.context),
      },
    },
  }
}

function mergeStatusLineTheme(
  derived: StatusLineTheme,
  base: StatusLineTheme | undefined,
  override: StatusLineThemeOverride | undefined,
): StatusLineTheme {
  const color = (value: ColorInput | undefined, fallback: RGBA) => (value === undefined ? fallback : parseColor(value))
  const pick = (key: keyof StatusLineTheme) => color(override?.[key], base?.[key] ?? derived[key])
  return {
    background: pick("background"),
    foreground: pick("foreground"),
    title: pick("title"),
    muted: pick("muted"),
    border: pick("border"),
  }
}

function mergeColors<T extends Record<string, RGBA>>(
  base: T,
  override: Partial<Record<keyof T, ColorInput>> | undefined,
): T {
  if (!override) return base
  const merged = { ...base } as Record<string, RGBA>
  for (const key of Object.keys(base) as (keyof T)[]) {
    const value = override[key]
    if (value !== undefined) merged[key as string] = parseColor(value)
  }
  return merged as T
}
