import stringWidth from "string-width"

// The frame is the chrome of the viewer: a window the document is drawn in. It
// only ever constrains and decorates the area around the document; the document
// itself stays anchored to the left edge of that area.
export const frameAligns = ["left", "center", "right"] as const

export type FrameAlign = (typeof frameAligns)[number]

export function isFrameAlign(value: unknown): value is FrameAlign {
  return typeof value === "string" && (frameAligns as readonly string[]).includes(value)
}

export const frameStyles = ["box", "ascii", "rounded", "heavy", "double"] as const

// "box" is the bundled single-line window. "ascii" draws the same window with
// `+ - |` for terminals and fonts where the Unicode box characters do not line
// up. The rest are the native OpenTUI border sets.
export type FrameStyle = (typeof frameStyles)[number]

export function isFrameStyle(value: unknown): value is FrameStyle {
  return typeof value === "string" && (frameStyles as readonly string[]).includes(value)
}

export type FrameConfig = {
  // The frame is opt-in: without it the document uses the whole measured area,
  // which is what an embedded host (a message bubble, a sidebar) wants.
  readonly enabled?: boolean
  // The width of the frame in terminal columns, border and padding included.
  // Omitted means "as wide as the area allows".
  readonly width?: number
  // Where the frame sits when it is narrower than the area around it.
  readonly align?: FrameAlign
  readonly style?: FrameStyle
  // Empty columns between the border and the document.
  readonly paddingX?: number
  // Empty rows between the border and the document.
  readonly paddingY?: number
  // A label carved out of the middle of the top border.
  readonly title?: string
  readonly titleAlign?: FrameAlign
}

export type FrameInsets = {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

export type ResolvedFrame = {
  readonly enabled: boolean
  // The width every block of the document is laid out for. This is the single
  // content width shared across the document.
  readonly contentWidth: number
  // The outer width, border and padding included.
  readonly width: number
  // The column the frame starts at inside the area around it.
  readonly offsetX: number
  readonly insets: FrameInsets
  readonly align: FrameAlign
  readonly style: FrameStyle
  readonly paddingX: number
  readonly paddingY: number
  readonly title?: string
  readonly titleAlign: FrameAlign
}

const borderWidth = 1
const noInsets: FrameInsets = { left: 0, right: 0, top: 0, bottom: 0 }

function whole(value: number | undefined, fallback: number) {
  if (value === undefined) return fallback
  if (!Number.isFinite(value)) return fallback
  return Math.max(0, Math.floor(value))
}

function alignOffset(align: FrameAlign, available: number, width: number) {
  if (align === "right") return Math.max(0, available - width)
  if (align === "center") return Math.max(0, Math.floor((available - width) / 2))
  return 0
}

// A title wider than the top border would be clipped by the terminal instead of
// by us, so it is cut here where the layout knows the frame width.
function fitTitle(title: string | undefined, columns: number) {
  if (!title || columns <= 0) return undefined
  let result = ""
  for (const character of title) {
    if (stringWidth(result + character) > columns) break
    result += character
  }
  return result || undefined
}

// `resolveFrame` is the single place that turns the host's area width and the
// frame configuration into the widths the renderer uses. It has no dependency on
// OpenTUI or Solid, so a host can call it without mounting anything.
export function resolveFrame(viewport: number, config?: FrameConfig): ResolvedFrame {
  const available = Math.max(1, Math.floor(viewport) || 1)
  const align = config?.align ?? "left"
  const style = config?.style ?? "box"
  const titleAlign = config?.titleAlign ?? "left"
  const enabled = config?.enabled ?? false
  if (!enabled) {
    return {
      enabled: false,
      contentWidth: available,
      width: available,
      offsetX: 0,
      insets: noInsets,
      align,
      style,
      paddingX: 0,
      paddingY: 0,
      title: undefined,
      titleAlign,
    }
  }
  const paddingX = whole(config?.paddingX, 1)
  const paddingY = whole(config?.paddingY, 0)
  const insets: FrameInsets = {
    left: borderWidth + paddingX,
    right: borderWidth + paddingX,
    top: borderWidth + paddingY,
    bottom: borderWidth + paddingY,
  }
  const minWidth = insets.left + insets.right + 1
  const width = config?.width === undefined ? available : Math.max(minWidth, Math.min(available, Math.floor(config.width)))
  const contentWidth = Math.max(1, width - insets.left - insets.right)
  return {
    enabled: true,
    contentWidth,
    width,
    offsetX: alignOffset(align, available, width),
    insets,
    align,
    style,
    paddingX,
    paddingY,
    title: fitTitle(config?.title, Math.max(0, width - borderWidth * 2 - 2)),
    titleAlign,
  }
}
