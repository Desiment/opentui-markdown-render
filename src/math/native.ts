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
  }): Promise<{
    png: Uint8Array
    pixelWidth: number
    pixelHeight: number
    baseline: number
  }>
}

let loaded: Promise<NativeModule | undefined> | undefined

export function loadNativeMath() {
  loaded ??= importNativeMath()
  return loaded
}

async function importNativeMath(): Promise<NativeModule | undefined> {
  if (process.platform !== "linux" || process.arch !== "x64") return undefined
  try {
    const file = path.join(import.meta.dir, "..", "..", "prebuilds", "linux-x64-gnu", "opentui_markdown_render.node")
    return createRequire(import.meta.url)(file) as NativeModule
  } catch {
    return undefined
  }
}
