import type { CliRenderer, PixelResolution, TerminalCapabilities } from "@opentui/core"
import { createMemo, createSignal, onCleanup } from "solid-js"

export type CellSize = { readonly width: number; readonly height: number }

// OpenTUI does not export its `resolveImageRenderProtocol`, so this mirrors it:
// the package resolves the protocol from detected capabilities inside a renderer
// child process whose environment is filtered down to a fixed allowlist (`TERM`,
// `OPENTUI_*`, ...), which means `KITTY_WINDOW_ID` and friends never reach it.
// Sniffing our own environment therefore cannot be trusted to agree with what
// images will actually be drawn with.
function resolveGraphicsProtocol(capabilities: TerminalCapabilities | null, hasResolution: boolean) {
  const configured = capabilities?.image_protocol
  if (configured && configured !== "auto") return configured === "sixel" && !hasResolution ? "blocks" : configured
  if (!capabilities || capabilities.multiplexer === "tmux") return "blocks"
  if (capabilities.kitty_graphics) return "kitty"
  if (capabilities.sixel && hasResolution) return "sixel"
  return "blocks"
}

// Terminals without an image protocol fall back to a block-character mosaic where
// one cell is one coarse pixel, so a formula there needs a cell box twice as big
// to stay legible.
export const mosaicScale = (protocol: string) => (protocol === "blocks" ? 2 : 1)

export function useCanvasGraphics(renderer: CliRenderer) {
  // Capabilities and pixel size are resolved by terminal queries after startup,
  // so the first frame can still be missing them.
  const [queried, setQueried] = createSignal(0)
  const onCapabilities = () => setQueried((value) => value + 1)
  renderer.on("capabilities", onCapabilities)
  let refresh: ReturnType<typeof setTimeout> | undefined
  const onResize = () => {
    if (refresh) clearTimeout(refresh)
    refresh = setTimeout(() => {
      refresh = undefined
      setQueried((value) => value + 1)
    }, 250)
  }
  renderer.on("resize", onResize)
  // OpenTUI requests a render after receiving pixel resolution but does not emit
  // a capabilities event for it. A short probe is enough to make the first raster
  // use the returned cell size without keeping a background timer alive.
  const probe = setInterval(() => {
    if (!renderer.resolution) return
    clearInterval(probe)
    setQueried((value) => value + 1)
  }, 50)
  const stopProbe = setTimeout(() => clearInterval(probe), 1000)
  onCleanup(() => {
    renderer.off("capabilities", onCapabilities)
    renderer.off("resize", onResize)
    clearInterval(probe)
    clearTimeout(stopProbe)
    if (refresh) clearTimeout(refresh)
  })

  const resolution = createMemo<PixelResolution | null>(() => {
    queried()
    const value = renderer.resolution
    return value && value.width > 0 && value.height > 0 ? value : null
  })
  const cell = createMemo<CellSize | null>(() => {
    const value = resolution()
    const width = renderer.terminalWidth
    const height = renderer.terminalHeight
    if (!value || width <= 0 || height <= 0) return null
    const cellWidth = value.width / width
    const cellHeight = value.height / height
    if (cellWidth <= 0 || cellHeight <= 0) return null
    return { width: Math.max(1, Math.round(cellWidth)), height: Math.max(1, Math.round(cellHeight)) }
  })
  const protocol = createMemo(() => {
    queried()
    return resolveGraphicsProtocol(renderer.capabilities, resolution() !== null)
  })

  return { cell, protocol }
}

export type CanvasGraphics = ReturnType<typeof useCanvasGraphics>
