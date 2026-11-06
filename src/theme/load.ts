import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { parseJsonc } from "../config/load"
import { validateTheme } from "../config/theme"
import type { ThemeOverride } from "./types"

export const bundledThemeNames = ["light"] as const
export const themeFileNames = [".jsonc", ".json"] as const

export type ThemeEnvironment = {
  readonly XDG_CONFIG_HOME?: string
  readonly HOME?: string
}

function userThemeDirectory(environment: ThemeEnvironment): string {
  const configured = environment.XDG_CONFIG_HOME
  const configHome = configured && path.isAbsolute(configured)
    ? configured
    : path.join(environment.HOME || os.homedir(), ".config")
  return path.join(configHome, "otmd", "themes")
}

function bundledThemeDirectories(bundleDirectory: string): string[] {
  return [
    path.resolve(bundleDirectory, "..", "..", "themes"),
    // Bundled CLI and library entrypoints live in bin/ and dist/ respectively.
    path.resolve(bundleDirectory, "..", "themes"),
  ]
}

// Offer files actually available to this viewer. The source demo can see the
// repository's optional themes; the published package contains only light.
export function listViewerThemes(
  environment: ThemeEnvironment = { XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME, HOME: process.env.HOME },
  bundleDirectory = import.meta.dir,
): string[] {
  const names = new Set<string>(bundledThemeNames)
  for (const directory of [userThemeDirectory(environment), ...bundledThemeDirectories(bundleDirectory)]) {
    if (!existsSync(directory)) continue
    for (const file of readdirSync(directory)) {
      const suffix = themeFileNames.find((extension) => file.endsWith(extension))
      if (!suffix) continue
      const name = file.slice(0, -suffix.length)
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name)) continue
      try {
        if (statSync(path.join(directory, file)).isFile() && loadTheme(name, environment, bundleDirectory)) names.add(name)
      } catch {
        // A broken theme is not selectable.
      }
    }
  }
  return ["light", ...[...names].filter((name) => name !== "light").sort()]
}

export function loadTheme(
  name: string,
  environment: ThemeEnvironment = { XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME, HOME: process.env.HOME },
  bundleDirectory = import.meta.dir,
): ThemeOverride | undefined {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name)) return undefined
  const directories = [
    userThemeDirectory(environment),
    ...bundledThemeDirectories(bundleDirectory),
  ]
  for (const directory of directories) {
    for (const suffix of themeFileNames) {
      const file = path.join(directory, `${name}${suffix}`)
      if (!existsSync(file) || !statSync(file).isFile()) continue
      const parsed = parseJsonc(readFileSync(file, "utf8"), file)
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined
      return validateTheme(parsed as Record<string, unknown>, file)
    }
  }
  return undefined
}
