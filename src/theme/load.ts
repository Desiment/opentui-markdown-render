import { existsSync, readFileSync, statSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { parseJsonc } from "../config/load"
import { validateTheme } from "../config/theme"
import type { ThemeOverride } from "./types"

export const bundledThemeNames = ["light", "dark", "solarized-light", "solarized-dark"] as const
export const themeFileNames = [".jsonc", ".json"] as const

export type ThemeEnvironment = {
  readonly XDG_CONFIG_HOME?: string
  readonly HOME?: string
}

export function loadTheme(
  name: string,
  environment: ThemeEnvironment = { XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME, HOME: process.env.HOME },
): ThemeOverride | undefined {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name)) return undefined
  const configured = environment.XDG_CONFIG_HOME
  const configHome = configured && path.isAbsolute(configured)
    ? configured
    : path.join(environment.HOME || os.homedir(), ".config")
  const directories = [
    path.join(configHome, "otmd", "themes"),
    path.resolve(import.meta.dir, "..", "..", "themes"),
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
