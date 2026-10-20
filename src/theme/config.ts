import { existsSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import type { ThemeOverride } from "./types"

export const themeConfigFilenames = ["opentui-markdown-render.jsonc", "opentui-markdown-render.json"]

// The config is an ordinary JSON/JSONC object of the same shape as a theme
// override. Parse is intentionally forgiving: comments and trailing commas are
// stripped, everything else has to be valid JSON.
export function loadThemeConfig(explicitPath?: string, cwd?: string): ThemeOverride | undefined {
  const file = explicitPath ?? discoverThemeConfig(cwd ?? process.cwd())
  if (!file) return undefined
  if (!existsSync(file)) {
    if (explicitPath) throw new Error(`Theme config not found: ${file}`)
    return undefined
  }
  return parseThemeConfig(readFileSync(file, "utf8"), file)
}

export function discoverThemeConfig(start: string): string | undefined {
  let directory = path.resolve(start)
  while (true) {
    for (const name of themeConfigFilenames) {
      const candidate = path.join(directory, name)
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
    }
    const parent = path.dirname(directory)
    if (parent === directory) return undefined
    directory = parent
  }
}

export function parseThemeConfig(source: string, file = "theme config"): ThemeOverride {
  try {
    return JSON.parse(stripJsonComments(source)) as ThemeOverride
  } catch (error) {
    throw new Error(`Invalid theme config ${file}: ${error instanceof Error ? error.message : String(error)}`)
  }
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
