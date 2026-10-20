import { parseColor, type ColorInput, type RGBA } from "@opentui/core"
import { defaultTheme } from "./defaults"
import type { Theme, ThemeMode, ThemeOverride } from "./types"

export function resolveTheme(options: {
  mode: ThemeMode | null | undefined
  override?: ThemeOverride
}): Theme {
  const override = options.override
  const mode = override?.mode ?? options.mode ?? "dark"
  return mergeTheme(defaultTheme(mode), override)
}

export function mergeTheme(base: Theme, override: ThemeOverride | undefined): Theme {
  if (!override) return base
  const color = (value: ColorInput | undefined, fallback: RGBA) => (value === undefined ? fallback : parseColor(value))
  return {
    mode: override.mode ?? base.mode,
    accent: color(override.accent, base.accent),
    categorical: override.categorical ? override.categorical.map((entry) => parseColor(entry)) : base.categorical,
    text: {
      base: color(override.text?.base, base.text.base),
      muted: color(override.text?.muted, base.text.muted),
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
    background: { base: color(override.background?.base, base.background.base) },
    border: { base: color(override.border?.base, base.border.base) },
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
