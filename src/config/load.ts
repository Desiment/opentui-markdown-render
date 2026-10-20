import { existsSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { isStatusLineField, type MarkdownConfig, type StatusLineField } from "./types"

export const configFilenames = ["opentui-markdown-render.jsonc", "opentui-markdown-render.json"]

// The config is an ordinary JSON/JSONC object. Parsing is intentionally
// forgiving: comments and trailing commas are stripped, everything else has to
// be valid JSON.
export function loadConfig(explicitPath?: string, cwd?: string): MarkdownConfig {
  const file = explicitPath ?? discoverConfig(cwd ?? process.cwd())
  if (!file) return {}
  if (!existsSync(file)) {
    if (explicitPath) throw new Error(`Config not found: ${file}`)
    return {}
  }
  return parseConfig(readFileSync(file, "utf8"), file)
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

export function parseConfig(source: string, file = "config"): MarkdownConfig {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripJsonComments(source))
  } catch (error) {
    throw new Error(`Invalid config ${file}: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Invalid config ${file}: expected a JSON object`)
  }
  return validateConfig(parsed as Record<string, unknown>, file)
}

const sections = ["theme", "statusline", "math", "images", "mermaid"] as const

function validateConfig(value: Record<string, unknown>, file: string): MarkdownConfig {
  for (const key of Object.keys(value)) {
    if (key === "$schema") continue
    if (!sections.includes(key as (typeof sections)[number])) {
      console.warn(`[opentui-markdown-render] Unknown config section "${key}" in ${file}`)
    }
  }
  return {
    theme: isRecord(value.theme) ? (value.theme as MarkdownConfig["theme"]) : undefined,
    statusline: isRecord(value.statusline) ? validateStatusLine(value.statusline, file) : undefined,
    math: isRecord(value.math) ? validateMath(value.math) : undefined,
    images: isRecord(value.images) ? validateImages(value.images) : undefined,
    mermaid: isRecord(value.mermaid) ? validateMermaid(value.mermaid) : undefined,
  }
}

function validateStatusLine(value: Record<string, unknown>, file: string): MarkdownConfig["statusline"] {
  const fields: StatusLineField[] = []
  if (Array.isArray(value.fields)) {
    for (const entry of value.fields) {
      if (isStatusLineField(entry)) fields.push(entry)
      else console.warn(`[opentui-markdown-render] Unknown status line field "${String(entry)}" in ${file}`)
    }
  }
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : undefined,
    fields: fields.length ? fields : undefined,
    separator: typeof value.separator === "string" ? value.separator : undefined,
    border: value.border === "none" || value.border === "top" || value.border === "bottom" ? value.border : undefined,
  }
}

function validateMath(value: Record<string, unknown>): MarkdownConfig["math"] {
  return {
    scale: positiveNumber(value.scale),
    displayScale: positiveNumber(value.displayScale),
  }
}

function validateImages(value: Record<string, unknown>): MarkdownConfig["images"] {
  return {
    maxColumns: positiveInteger(value.maxColumns),
    maxRows: positiveInteger(value.maxRows),
  }
}

function validateMermaid(value: Record<string, unknown>): MarkdownConfig["mermaid"] {
  return {
    compact: typeof value.compact === "boolean" ? value.compact : undefined,
    layoutMaxWidth: positiveInteger(value.layoutMaxWidth),
  }
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined
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
