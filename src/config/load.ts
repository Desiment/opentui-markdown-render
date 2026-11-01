import { existsSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { isFrameAlign, isFrameStyle } from "../core/frame"
import { isTableColumnFitter, isTableOverflow, isTableWidthMode } from "../core/tables"
import { isHeadingLevelKey, isStatusLineField, isStatusLineStyle, type HeadingLevelConfig, type HeadingsConfig, type MarkdownConfig, type StatusLineField } from "./types"
import { validateTheme } from "./theme"

export const configFilenames = ["opentui-markdown-render.jsonc", "opentui-markdown-render.json"]

// Config warnings normally go to stderr. A host that embeds the renderer can
// collect them instead and show them in its own UI.
export type ConfigReporter = (message: string) => void

function warn(report: ConfigReporter | undefined, message: string) {
  if (report) report(message)
  else console.warn(`[opentui-markdown-render] ${message}`)
}

// The config is an ordinary JSON/JSONC object. Parsing is intentionally
// forgiving: comments and trailing commas are stripped, everything else has to
// be valid JSON.
export function loadConfig(explicitPath?: string, cwd?: string, report?: ConfigReporter): MarkdownConfig {
  const file = explicitPath ?? discoverConfig(cwd ?? process.cwd())
  if (!file) return {}
  if (!existsSync(file)) {
    if (explicitPath) throw new Error(`Config not found: ${file}`)
    return {}
  }
  return parseConfig(readFileSync(file, "utf8"), file, report)
}

// Component-facing adapter: malformed or missing explicit files should report
// diagnostics, not abort the Solid tree. Embedders can disable discovery.
export function loadRendererConfig(
  configPath?: string,
  cwd?: string,
  options: { readonly discover?: boolean; readonly report?: ConfigReporter } = {},
): MarkdownConfig {
  if (options.discover === false && !configPath) return {}
  try {
    return loadConfig(configPath, cwd, options.report)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    warn(options.report, message)
    return {}
  }
}

export function discoverConfig(start: string): string | undefined {
  let directory = path.resolve(start)
  while (true) {
    for (const name of configFilenames) {
      const candidate = path.join(directory, name)
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
    }
    const parent = path.dirname(directory)
    if (parent === directory) return undefined
    directory = parent
  }
}

export function parseConfig(source: string, file = "config", report?: ConfigReporter): MarkdownConfig {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripJsonComments(source))
  } catch (error) {
    throw new Error(`Invalid config ${file}: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Invalid config ${file}: expected a JSON object`)
  }
  return validateConfig(parsed as Record<string, unknown>, file, report)
}

const sections = ["theme", "statusline", "images", "mermaid", "headings", "frame", "tables"] as const

function validateConfig(value: Record<string, unknown>, file: string, report?: ConfigReporter): MarkdownConfig {
  for (const key of Object.keys(value)) {
    if (key === "$schema") continue
    if (!sections.includes(key as (typeof sections)[number])) {
      warn(report, `Unknown config section "${key}" in ${file}`)
    }
  }
  return {
    theme: isRecord(value.theme) ? validateTheme(value.theme, file, report) : undefined,
    statusline: isRecord(value.statusline) ? validateStatusLine(value.statusline, file, report) : undefined,
    images: isRecord(value.images) ? validateImages(value.images) : undefined,
    mermaid: isRecord(value.mermaid) ? validateMermaid(value.mermaid, file, report) : undefined,
    headings: isRecord(value.headings) ? validateHeadings(value.headings, file, report) : undefined,
    frame: isRecord(value.frame) ? validateFrame(value.frame, file, report) : undefined,
    tables: isRecord(value.tables) ? validateTables(value.tables, file, report) : undefined,
  }
}

function validateStatusLine(value: Record<string, unknown>, file: string, report?: ConfigReporter): MarkdownConfig["statusline"] {
  const fields: StatusLineField[] = []
  if (Array.isArray(value.fields)) {
    for (const entry of value.fields) {
      if (isStatusLineField(entry)) fields.push(entry)
      else warn(report, `Unknown status line field "${String(entry)}" in ${file}`)
    }
  }
  if (value.style !== undefined && !isStatusLineStyle(value.style)) {
    warn(report, `Unknown status line style "${String(value.style)}" in ${file}`)
  }
  if (value.highlight !== undefined && !isStatusLineField(value.highlight)) {
    warn(report, `Unknown status line field "${String(value.highlight)}" in ${file}`)
  }
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : undefined,
    fields: fields.length ? fields : undefined,
    separator: typeof value.separator === "string" ? value.separator : undefined,
    border: value.border === "none" || value.border === "top" || value.border === "bottom" ? value.border : undefined,
    style: isStatusLineStyle(value.style) ? value.style : undefined,
    highlight: isStatusLineField(value.highlight) ? value.highlight : undefined,
  }
}

function validateImages(value: Record<string, unknown>): MarkdownConfig["images"] {
  return {
    maxColumns: positiveInteger(value.maxColumns),
    maxRows: positiveInteger(value.maxRows),
  }
}

function validateMermaid(value: Record<string, unknown>, file: string, report?: ConfigReporter): MarkdownConfig["mermaid"] {
  if (value.classLayout !== undefined && value.classLayout !== "builtin" && value.classLayout !== "dagre") {
    warn(report, `Unknown Mermaid class layout "${String(value.classLayout)}" in ${file}`)
  }
  return {
    compact: typeof value.compact === "boolean" ? value.compact : undefined,
    layoutMaxWidth: positiveInteger(value.layoutMaxWidth),
    classLayout: value.classLayout === "dagre" || value.classLayout === "builtin" ? value.classLayout : undefined,
  }
}

// The frame is the viewer window. An option the renderer does not know is
// reported and ignored, so a typo in the file never takes the document down.
function validateFrame(value: Record<string, unknown>, file: string, report?: ConfigReporter): MarkdownConfig["frame"] {
  const option = <T>(name: string, check: (input: unknown) => input is T): T | undefined => {
    const entry = value[name]
    if (entry === undefined) return undefined
    if (check(entry)) return entry
    warn(report, `Invalid frame option "${name}" in ${file}`)
    return undefined
  }
  const padding = (name: string) => {
    const entry = value[name]
    if (entry === undefined) return undefined
    if (isNonNegativeInteger(entry)) return entry
    warn(report, `Invalid frame option "${name}" in ${file}`)
    return undefined
  }
  const boolean = (name: string) => {
    const entry = value[name]
    if (entry === undefined) return undefined
    if (typeof entry === "boolean") return entry
    warn(report, `Invalid frame option "${name}" in ${file}`)
    return undefined
  }
  const width = (() => {
    const entry = value.width
    if (entry === undefined) return undefined
    if (typeof entry === "number" && Number.isInteger(entry) && entry > 0) return entry
    warn(report, `Invalid frame option "width" in ${file}`)
    return undefined
  })()
  const title = value.title
  if (title !== undefined && typeof title !== "string") {
    warn(report, `Invalid frame option "title" in ${file}`)
  }
  return {
    enabled: boolean("enabled"),
    width,
    align: option("align", isFrameAlign),
    style: option("style", isFrameStyle),
    paddingX: padding("paddingX"),
    paddingY: padding("paddingY"),
    title: typeof title === "string" ? title : undefined,
    titleAlign: option("titleAlign", isFrameAlign),
  }
}

function validateTables(value: Record<string, unknown>, file: string, report?: ConfigReporter): MarkdownConfig["tables"] {
  const option = <T>(name: string, check: (input: unknown) => input is T): T | undefined => {
    const entry = value[name]
    if (entry === undefined) return undefined
    if (check(entry)) return entry
    warn(report, `Invalid tables option "${name}" in ${file}`)
    return undefined
  }
  const padding = value.cellPaddingX
  if (padding !== undefined && !isNonNegativeInteger(padding)) {
    warn(report, `Invalid tables option "cellPaddingX" in ${file}`)
  }
  return {
    widthMode: option("widthMode", isTableWidthMode),
    overflow: option("overflow", isTableOverflow),
    columnFitter: option("columnFitter", isTableColumnFitter),
    cellPaddingX: isNonNegativeInteger(padding) ? padding : undefined,
  }
}

// The heading styles are addressed by level. A level or an option that the
// renderer does not know is reported and ignored, so a typo in the file never
// takes the document down.
function validateHeadings(value: Record<string, unknown>, file: string, report?: ConfigReporter): MarkdownConfig["headings"] {
  if (value.levels !== undefined && !isRecord(value.levels)) {
    warn(report, `Invalid heading levels in ${file}`)
    return undefined
  }
  const levels: Record<string, HeadingLevelConfig> = {}
  for (const [key, entry] of Object.entries(value.levels ?? {})) {
    if (!isHeadingLevelKey(key)) {
      warn(report, `Unknown heading level "${key}" in ${file}`)
      continue
    }
    if (!isRecord(entry)) {
      warn(report, `Invalid heading level "${key}" in ${file}`)
      continue
    }
    levels[key] = validateHeadingLevel(key, entry, file, report)
  }
  return Object.keys(levels).length ? { levels: levels as HeadingsConfig["levels"] } : undefined
}

function validateHeadingLevel(key: string, value: Record<string, unknown>, file: string, report?: ConfigReporter): HeadingLevelConfig {
  const style: Record<string, unknown> = {}
  for (const [name, entry] of Object.entries(value)) {
    switch (name) {
      case "bold":
      case "italic":
      case "underline":
      case "dim":
      case "uppercase":
        if (typeof entry !== "boolean") {
          warn(report, `Invalid heading option "${name}" for level ${key} in ${file}`)
          continue
        }
        style[name] = entry
        break
      case "marginTop":
      case "marginBottom":
        if (!isNonNegativeInteger(entry)) {
          warn(report, `Invalid heading option "${name}" for level ${key} in ${file}`)
          continue
        }
        style[name] = entry
        break
      default:
        warn(report, `Unknown heading option "${name}" for level ${key} in ${file}`)
    }
  }
  return style as HeadingLevelConfig
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stripJsonComments(source: string) {
  let result = ""
  let index = 0
  let inString = false
  let quote = ""
  while (index < source.length) {
    const character = source[index]!
    if (inString) {
      result += character
      if (character === "\\") {
        result += source[index + 1] ?? ""
        index += 2
        continue
      }
      if (character === quote) inString = false
      index++
      continue
    }
    if (character === '"' || character === "'") {
      inString = true
      quote = character
      result += character
      index++
      continue
    }
    if (character === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") index++
      continue
    }
    if (character === "/" && source[index + 1] === "*") {
      index += 2
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) index++
      index += 2
      continue
    }
    result += character
    index++
  }
  return result.replace(/,(\s*[}\]])/g, "$1")
}
