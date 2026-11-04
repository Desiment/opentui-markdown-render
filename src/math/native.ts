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

let loaded: Promise<NativeModule | undefined> | undefined

export function loadNativeMath() {
  loaded ??= importNativeMath()
  return loaded
}

async function importNativeMath(): Promise<NativeModule | undefined> {
  if (process.platform !== "linux" || process.arch !== "x64") return undefined
  const relative = path.join("prebuilds", "linux-x64-gnu", "opentui_markdown_render.node")
  // The first location is the published package layout. The second supports a
  // host bundling the TypeScript implementation into its own package while
  // copying `prebuilds` beside the generated entrypoint.
  const candidates = [
    path.join(import.meta.dir, "..", "..", relative),
    path.join(import.meta.dir, "..", relative),
    path.join(import.meta.dir, relative),
    path.join(import.meta.dir, "node_modules", "opentui-markdown-render", relative),
  ]
  for (const file of candidates) {
    try {
      return createRequire(import.meta.url)(file) as NativeModule
    } catch {}
  }
  return undefined
}
