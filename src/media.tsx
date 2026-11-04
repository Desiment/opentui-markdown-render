import { NativeImage, imageInfo, parseColor, type ColorInput, type RGBA } from "@opentui/core"
import { useRenderer } from "@opentui/solid"
import { decompressFrame, parseGIF, type ParsedGif } from "gifuct-js"
import path from "node:path"
import { createEffect, createResource, createSignal, Match, onCleanup, Show, Switch } from "solid-js"

const maxRows = 32
// Allow larger images for better resolution in kitty/modern terminals
export const maxColumns = 80

const TRANSPARENT_BACKGROUND = "#000000"

export type ImageLimits = {
  readonly maxColumns?: number
  readonly maxRows?: number
}

type Rgb = readonly [number, number, number]

function isRgba(value: unknown): value is RGBA {
  return typeof value === "object" && value !== null && "r" in value && "g" in value && "b" in value
}

// `parseColor` cannot read a plain object, and an OpenTUI `RGBA` reaches us both
// as a live instance and as a JSON round-trip inside the resource key, so the
// channel values are normalized here instead of trusted to `parseColor`.
export function resolveBackground(input: ColorInput | RGBA | undefined): Rgb {
  if (input === undefined) return [0, 0, 0]
  if (isRgba(input)) {
    const channel = (value: number) => Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 255)
    return [channel(input.r), channel(input.g), channel(input.b)]
  }
  try {
    const color = parseColor(input)
    const channel = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 255)
    return [channel(color.r), channel(color.g), channel(color.b)]
  } catch {
    const color = parseColor(TRANSPARENT_BACKGROUND)
    return [Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)]
  }
}

export function rgbToHex(color: Rgb) {
  const channel = (value: number) => Math.round(value).toString(16).padStart(2, "0")
  return `#${channel(color[0])}${channel(color[1])}${channel(color[2])}`
}

type GifFrame = Parameters<typeof decompressFrame>[0]
type GifAnimation = {
  readonly width: number
  readonly height: number
  readonly frames: readonly GifFrame[]
  readonly colorTable: ParsedGif["gct"]
  readonly target: { width: number; height: number }
  readonly background: Rgb
}
type Media = { readonly box: { columns: number; rows: number }; readonly image?: NativeImage; readonly animation?: GifAnimation }

export { standaloneImage, type MarkdownImage } from "./core/image"

export function resolveLocalImage(base: string | undefined, href: string) {
  if (!base) return { error: "No asset base is configured" }
  if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("//")) return { error: "Only local image paths are supported" }
  const root = path.resolve(base)
  const target = path.resolve(root, href)
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return { error: "Image path escapes the asset root" }
  return { path: target }
}

export function imageBox(
  width: number,
  height: number,
  columns: number,
  cellAspectRatio: number,
  limits?: ImageLimits,
) {
  const ratio = width / height
  // A 0 (or non-finite) cell aspect means the terminal never reported pixel
  // dimensions; the common 2:1 cell is the safe default.
  const aspect = Number.isFinite(cellAspectRatio) && cellAspectRatio > 0 ? cellAspectRatio : 2
  const columnLimit = Math.max(1, limits?.maxColumns ?? maxColumns)
  const rowLimit = Math.max(1, limits?.maxRows ?? maxRows)
  const clamped = Math.max(1, Math.min(Math.max(1, columns), columnLimit))
  const naturalRows = Math.max(1, Math.ceil(clamped / (ratio * aspect)))
  if (naturalRows <= rowLimit) return { columns: clamped, rows: naturalRows }
  return { columns: Math.max(1, Math.round(ratio * rowLimit * aspect)), rows: rowLimit }
}

export function LocalImage(props: {
  readonly href: string
  readonly alt: string
  readonly base: () => string | undefined
  readonly columns: () => number
  readonly cell: () => { width: number; height: number } | null | undefined
  readonly background: () => ColorInput | RGBA | undefined
  readonly labelColor?: () => RGBA
  readonly textColor?: () => RGBA
  readonly limits?: ImageLimits
}) {
  const renderer = useRenderer()
  const [failure, setFailure] = createSignal<string>()
  // The cell size is part of the key so the image is reloaded and re-fitted once
  // the terminal reports its pixel resolution (kitty queries it after startup).
  const [loaded] = createResource(
    () =>
      JSON.stringify({
        href: props.href,
        base: props.base(),
        columns: props.columns(),
        cell: props.cell() ?? null,
        background: rgbToHex(resolveBackground(props.background())),
        limits: props.limits ?? null,
      }),
    async (key): Promise<Media | { error: string }> => {
      const input = JSON.parse(key) as {
        href: string
        base?: string
        columns: number
        cell?: { width: number; height: number } | null
        background?: string
        limits?: ImageLimits | null
      }
      const resolved = resolveLocalImage(input.base, input.href)
      if (resolved.path === undefined) return { error: resolved.error ?? "Image path is invalid" }
      const file = Bun.file(resolved.path)
      if (!(await file.exists())) return { error: `Image does not exist: ${input.href}` }
      try {
        const bytes = new Uint8Array(await file.arrayBuffer())
        const info = imageInfo(bytes)
        const box = imageBox(
          info.width,
          info.height,
          Math.max(1, input.columns),
          input.cell ? input.cell.height / input.cell.width : 2,
          input.limits ?? undefined,
        )
        const target = { width: Math.max(1, Math.round(box.columns * (input.cell?.width ?? 8))), height: Math.max(1, Math.round(box.rows * (input.cell?.height ?? 16))) }
        const background = resolveBackground(input.background)
        if (info.format === "gif") return loadGif(bytes, box, target, background)
        return { box, image: prepareImage(NativeImage.decode(bytes), target, background) }
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) }
      }
    },
  )
  const media = () => {
    const value = loaded()
    return value && !("error" in value) ? value : undefined
  }
  const error = () => {
    const value = loaded()
    return failure() ?? (value && "error" in value ? value.error : undefined)
  }
  const [frame, setFrame] = createSignal<NativeImage>()

  createEffect(() => {
    const value = media()
    if (!value?.animation) {
      setFrame(value?.image)
      return
    }
    const animation = value.animation
    const canvas = new Uint8Array(animation.width * animation.height * 4)
    let index = 0
    let current: NativeImage | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const next = () => {
      const decoded = decompressFrame(animation.frames[index]!, animation.colorTable, true)
      const before = decoded.disposalType === 3 ? canvas.slice() : undefined
      drawPatch(canvas, animation.width, animation.height, decoded.patch, decoded.dims.left, decoded.dims.top, decoded.dims.width, decoded.dims.height)
      const image = prepareImage(NativeImage.fromRgba(canvas.slice(), animation.width, animation.height), animation.target, animation.background)
      const previous = current
      current = image
      setFrame(image)
      if (previous) void renderer.idle().then(() => previous.dispose())
      if (decoded.disposalType === 2) clearPatch(canvas, animation.width, decoded.dims.left, decoded.dims.top, decoded.dims.width, decoded.dims.height)
      if (before) canvas.set(before)
      index = (index + 1) % animation.frames.length
      timer = setTimeout(next, Math.max(50, decoded.delay || 100))
    }
    next()
    onCleanup(() => {
      if (timer) clearTimeout(timer)
      const image = current
      if (image) void renderer.idle().then(() => image.dispose())
      setFrame()
    })
  })
  createEffect(() => {
    const value = media()
    onCleanup(() => void renderer.idle().then(() => disposeMedia(value)))
  })

  return (
    <box width="100%" flexDirection="column" flexShrink={0} overflow="hidden" alignItems="center">
      <Switch>
        <Match when={loaded.loading}>
          <box width="100%" flexDirection="row">
            <text fg={props.labelColor?.()} flexShrink={0}>Loading image: </text>
            <text fg={props.textColor?.()} wrapMode="word" flexGrow={1}>{props.alt || props.href}</text>
          </box>
        </Match>
        <Match when={error()}>
          <box width="100%" flexDirection="row">
            <text fg={props.labelColor?.()} flexShrink={0}>Could not render image </text>
            <text fg={props.textColor?.()} wrapMode="word" flexGrow={1}>{`${props.alt || props.href}: ${error()}`}</text>
          </box>
        </Match>
        <Match when={media() && frame()}>
          <image
            id={`opentui-markdown-image-${props.href}`}
            source={frame()!}
            fit="fit"
            protocol="auto"
            width={media()!.box.columns}
            height={media()!.box.rows}
            onError={(error) => setFailure(error instanceof Error ? error.message : String(error))}
          />
        </Match>      </Switch>
    </box>
  )
}

export function loadGif(bytes: Uint8Array, box: { columns: number; rows: number }, target: { width: number; height: number }, background: Rgb) {
  const gif = parseGIF(bytes.slice().buffer as ArrayBuffer)
  const width = gif.lsd.width
  const height = gif.lsd.height
  const frames = gif.frames.filter((frame): frame is GifFrame => "image" in frame)
  if (!frames.length) throw new Error("GIF contains no frames")
  return { box, animation: { width, height, frames, colorTable: gif.gct, target, background } }
}

function drawPatch(canvas: Uint8Array, width: number, height: number, patch: Uint8ClampedArray, left: number, top: number, patchWidth: number, patchHeight: number) {
  for (let y = 0; y < patchHeight; y++) {
    if (top + y < 0 || top + y >= height) continue
    for (let x = 0; x < patchWidth; x++) {
      if (left + x < 0 || left + x >= width) continue
      const source = (y * patchWidth + x) * 4
      const target = ((top + y) * width + left + x) * 4
      const alpha = patch[source + 3]! / 255
      const inverse = 1 - alpha
      canvas[target] = Math.round(patch[source]! * alpha + canvas[target]! * inverse)
      canvas[target + 1] = Math.round(patch[source + 1]! * alpha + canvas[target + 1]! * inverse)
      canvas[target + 2] = Math.round(patch[source + 2]! * alpha + canvas[target + 2]! * inverse)
      canvas[target + 3] = Math.round((alpha + canvas[target + 3]! / 255 * inverse) * 255)
    }
  }
}

function clearPatch(canvas: Uint8Array, width: number, left: number, top: number, patchWidth: number, patchHeight: number) {
  for (let y = 0; y < patchHeight; y++) {
    for (let x = 0; x < patchWidth; x++) canvas.fill(0, ((top + y) * width + left + x) * 4, ((top + y) * width + left + x + 1) * 4)
  }
}

function prepareImage(image: NativeImage, target: { width: number; height: number }, background: Rgb) {
  const targetWidth = Math.max(1, Math.round(target.width))
  const targetHeight = Math.max(1, Math.round(target.height))
  const scale = Math.min(targetWidth / image.width, targetHeight / image.height)
  const newWidth = Math.max(1, Math.round(image.width * scale))
  const newHeight = Math.max(1, Math.round(image.height * scale))
  const resized = scale !== 1 ? image.resize({ width: newWidth, height: newHeight }) : image
  if (resized !== image) image.dispose()
  if (!resized.info().hasAlpha) return resized
  const raw = resized.raw()
  const pixels = new Uint8Array(raw.width * raw.height * 4)
  const color = background
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = raw.data[index + 3]! / 255
    pixels[index] = Math.round(raw.data[index]! * alpha + color[0]! * (1 - alpha))
    pixels[index + 1] = Math.round(raw.data[index + 1]! * alpha + color[1]! * (1 - alpha))
    pixels[index + 2] = Math.round(raw.data[index + 2]! * alpha + color[2]! * (1 - alpha))
    pixels[index + 3] = 255
  }
  const composited = NativeImage.fromRgba(pixels, raw.width, raw.height)
  resized.dispose()
  return composited
}

function disposeMedia(media: Media | undefined) {
  media?.image?.dispose()
}
