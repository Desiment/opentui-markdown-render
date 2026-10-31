import type { FrameConfig, TablesConfig } from "../src/core"
import type { ThemeModeSetting } from "../src"

export type DemoSettings = {
  readonly mode: ThemeModeSetting
  readonly frame: FrameConfig
  readonly tables: TablesConfig
}

export const settingKeys = [
  "mode", "frameEnabled", "frameStyle", "frameAlign", "frameWidth", "framePadding",
  "tableWidth", "tableOverflow", "tableFitter", "tablePadding",
] as const

type SettingKey = (typeof settingKeys)[number]

export function settingRows(settings: DemoSettings): { key: SettingKey; label: string; value: string }[] {
  return [
    { key: "mode", label: "Theme", value: settings.mode },
    { key: "frameEnabled", label: "Frame", value: settings.frame.enabled ? "on" : "off" },
    { key: "frameStyle", label: "Frame style", value: settings.frame.style ?? "box" },
    { key: "frameAlign", label: "Frame align", value: settings.frame.align ?? "left" },
    { key: "frameWidth", label: "Frame width", value: String(settings.frame.width ?? "full") },
    { key: "framePadding", label: "Frame padding", value: String(settings.frame.paddingX ?? 1) },
    { key: "tableWidth", label: "Table width", value: settings.tables.widthMode ?? "content" },
    { key: "tableOverflow", label: "Table overflow", value: settings.tables.overflow ?? "scroll" },
    { key: "tableFitter", label: "Table fitter", value: settings.tables.columnFitter ?? "balanced" },
    { key: "tablePadding", label: "Table padding", value: String(settings.tables.cellPaddingX ?? 1) },
  ]
}

function cycle<T>(options: readonly T[], value: T, direction: number): T {
  const index = options.indexOf(value)
  return options[(index + direction + options.length) % options.length]!
}

function step(value: number, direction: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value + direction))
}

export function changeSetting(settings: DemoSettings, key: SettingKey, direction: number): DemoSettings {
  const { frame, tables } = settings
  switch (key) {
    case "mode":
      return { ...settings, mode: cycle(["light", "dark"] as const, settings.mode, direction) }
    case "frameEnabled":
      return { ...settings, frame: { ...frame, enabled: !frame.enabled } }
    case "frameStyle":
      return { ...settings, frame: { ...frame, style: cycle(["box", "ascii", "rounded", "heavy", "double"] as const, frame.style ?? "box", direction) } }
    case "frameAlign":
      return { ...settings, frame: { ...frame, align: cycle(["left", "center", "right"] as const, frame.align ?? "left", direction) } }
    case "frameWidth":
      return { ...settings, frame: { ...frame, width: step(frame.width ?? 100, direction * 5, 20, 200) } }
    case "framePadding":
      return { ...settings, frame: { ...frame, paddingX: step(frame.paddingX ?? 1, direction, 0, 8) } }
    case "tableWidth":
      return { ...settings, tables: { ...tables, widthMode: cycle(["content", "full"] as const, tables.widthMode ?? "content", direction) } }
    case "tableOverflow":
      return { ...settings, tables: { ...tables, overflow: cycle(["scroll", "wrap"] as const, tables.overflow ?? "scroll", direction) } }
    case "tableFitter":
      return { ...settings, tables: { ...tables, columnFitter: cycle(["balanced", "proportional"] as const, tables.columnFitter ?? "balanced", direction) } }
    case "tablePadding":
      return { ...settings, tables: { ...tables, cellPaddingX: step(tables.cellPaddingX ?? 1, direction, 0, 8) } }
  }
}
