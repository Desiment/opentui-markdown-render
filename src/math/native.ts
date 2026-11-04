import path from "node:path"
import { createRequire } from "node:module"

type NativeModule = {
  renderLatex(request: {
    latex: string
    scale?: number
    foreground?: string
    background?: string
    display?: boolean
    cellWidth?: number
    cellHeight?: number
    compact?: boolean
    standard?: boolean
  }): Promise<{
    png: Uint8Array
    pixelWidth: number
    pixelHeight: number
    baseline: number
    clamped: boolean
  }>
}

export class NativeMathUnavailableError extends Error {
  constructor(readonly attempts: readonly { file: string; error: string }[]) {
    super(`Unable to load native math addon. Tried ${attempts.map((attempt) => attempt.file).join(", ")}`)
    this.name = "NativeMathUnavailableError"
  }
}

let loaded: Promise<NativeModule | undefined> | undefined

export function loadNativeMath() {
  loaded ??= importNativeMath()
  return loaded
}

async function importNativeMath(): Promise<NativeModule | undefined> {
  if (process.platform !== "linux" || process.arch !== "x64") return undefined
  const relative = path.join("prebuilds", "linux-x64-gnu", "opentui_markdown_render.node")
  const require = createRequire(import.meta.url)
  // Support the published package layout and hosts that copy `prebuilds`
  // beside a bundled entrypoint.
  const candidates = [
    path.join(import.meta.dir, "..", "..", relative),
    path.join(import.meta.dir, "..", relative),
    path.join(import.meta.dir, relative),
    path.join(import.meta.dir, "node_modules", "opentui-markdown-render", relative),
  ]
  // Git-installed hosts commonly hoist this package next to the host package.
  // Resolve its compiled entry instead of guessing another node_modules shape.
  try {
    const entry = require.resolve("opentui-markdown-render")
    candidates.unshift(path.resolve(path.dirname(entry), "..", relative))
  } catch {}
  const attempts: { file: string; error: string }[] = []
  for (const file of new Set(candidates)) {
    try {
      return require(file) as NativeModule
    } catch (error) {
      attempts.push({ file, error: error instanceof Error ? error.message : String(error) })
    }
  }
  throw new NativeMathUnavailableError(attempts)
}
