import { deflateSync } from "node:zlib"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const output = path.join(import.meta.dir, "..", "examples", "assets")
await mkdir(output, { recursive: true })

// The assets are rendered at the resolution a terminal actually paints them at:
// an image that fills 80 columns of a 10 pixel wide cell needs roughly 800
// pixels, so the sources are wider than that and stay sharp when the renderer
// scales them down.

// Opaque ascent profile on a dark telemetry-console background.
await writeFile(path.join(output, "opaque.png"), png(1280, 720, (x, y) => {
  const pathY = ascentY(x, 1280, 720)
  const distance = Math.abs(y - pathY)
  const grid = x % 160 < 2 || y % 90 < 2
  const glow = Math.max(0, 1 - distance / 18)
  if (distance <= 3) return [102, 235, 255, 255]
  if (glow > 0) return [Math.round(24 + glow * 35), Math.round(66 + glow * 120), Math.round(92 + glow * 130), 255]
  if (grid) return [24, 61, 82, 255]
  const depth = y / 720
  return [Math.round(8 + depth * 8), Math.round(22 + depth * 18), Math.round(38 + depth * 28), 255]
}))

// Overlapping translucent coverage footprints for the coastal and inland
// ground stations. The transparent field lets the terminal background show.
await writeFile(path.join(output, "transparent.png"), png(1024, 640, (x, y) => {
  const coastal = ellipse(x, y, 340, 350, 255, 150)
  const inland = ellipse(x, y, 690, 300, 255, 150)
  const coastalRing = Math.abs(Math.hypot((x - 340) / 255, (y - 350) / 150) - 1) < 0.025
  const inlandRing = Math.abs(Math.hypot((x - 690) / 255, (y - 300) / 150) - 1) < 0.025
  const coastalStation = Math.hypot(x - 340, y - 350) < 10
  const inlandStation = Math.hypot(x - 690, y - 300) < 10
  if (coastalStation || inlandStation) return [255, 255, 255, 235]
  if (coastal && inland) return [255, 176, 92, 145]
  if (coastalRing || inlandRing) return [210, 240, 255, 210]
  if (coastal) return [66, 174, 238, 125]
  if (inland) return [238, 118, 150, 125]
  return [0, 0, 0, 0]
}))

// A dark plume-spectrum fixture with a few bright emission lines.
await writeFile(path.join(output, "spectrum.png"), png(1280, 640, (x, y) => {
  if (y < 96 || y >= 544) return [7, 17, 30, 255]
  const hue = (x / 1280) * 5.8
  const [r, g, b] = hueRgb(hue)
  const normalizedX = x / 1280
  const peaks = [0.16, 0.31, 0.48, 0.72, 0.86]
  const peak = Math.max(...peaks.map((position) => Math.max(0, 1 - Math.abs(normalizedX - position) / 0.012)))
  const band = 0.38 + peak * 0.62
  const grid = x % 160 < 2 || y % 112 < 2
  if (grid && peak < 0.4) return [24, 43, 58, 255]
  return [Math.round(r * band), Math.round(g * band), Math.round(b * band), 255]
}))

// Calibration grid with a visible centre reticle and terminal-friendly contrast.
await writeFile(path.join(output, "checker.png"), png(1024, 1024, (x, y) => {
  const cell = ((x >> 6) + (y >> 6)) & 1
  const line = x % 64 < 2 || y % 64 < 2
  const reticle = Math.abs(x - 512) < 3 || Math.abs(y - 512) < 3
  const ring = Math.abs(Math.hypot(x - 512, y - 512) - 230) < 3
  if (reticle) return [102, 235, 255, 255]
  if (ring) return [255, 183, 82, 230]
  if (line) return [74, 103, 121, 255]
  return cell ? [31, 50, 66, 255] : [11, 25, 40, 255]
}))

// A real animation: a ring pulsing outwards on a transparent field. Every
// frame is a full-canvas image with its own disposal method, so the decoder's
// per-frame compositing and the frame scheduler are both exercised.
await writeFile(path.join(output, "pulse.gif"), gif(640, 640, 6, (x, y, frame, frames) => {
  const phase = frame / frames
  const outer = 104 + phase * 176
  const inner = 40 + phase * 80
  const distance = Math.hypot(x - 320, y - 320)
  if (Math.abs(distance - outer) <= 16) return [1, 2, 3][frame % 3]!
  if (Math.abs(distance - inner) <= 12) return 3
  return 0
}, [0, 0, 0], [[66, 174, 238], [255, 176, 92], [255, 255, 255]]))

function ascentY(x: number, width: number, height: number): number {
  const progress = x / (width - 1)
  const altitude = progress < 0.25
    ? 0.12 + 0.34 * (progress / 0.25) ** 0.8
    : progress < 0.7
      ? 0.46 + 0.38 * ((progress - 0.25) / 0.45) ** 0.78
      : 0.84 + 0.04 * ((progress - 0.7) / 0.3)
  return Math.round(height - 58 - altitude * (height - 112))
}

function ellipse(x: number, y: number, centerX: number, centerY: number, radiusX: number, radiusY: number): boolean {
  return ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2 < 1
}

function hueRgb(hue: number): [number, number, number] {
  const c = 1
  const segment = hue % 6
  const x = c * (1 - Math.abs((segment % 2) - 1))
  const table: Array<[number, number, number]> = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ]
  const rgb = table[Math.floor(segment)] ?? table[0]!
  return [Math.round(rgb[0] * 255), Math.round(rgb[1] * 255), Math.round(rgb[2] * 255)]
}

// A PNG writer with adaptive row filtering. Every row is written with the
// filter that produces the smallest sum of absolute differences, which is what
// the reference encoders do. Without it a smooth gradient is stored as raw
// samples and the file grows with every pixel.
function png(width: number, height: number, pixel: (x: number, y: number) => readonly [number, number, number, number]) {
  const bytesPerPixel = 4
  const stride = width * bytesPerPixel
  const raw = new Uint8Array(height * (1 + stride))
  const current = new Uint8Array(stride)
  const previous = new Uint8Array(stride)
  const candidate = new Uint8Array(stride)
  const best = new Uint8Array(stride)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixel(x, y)
      current[x * 4] = r
      current[x * 4 + 1] = g
      current[x * 4 + 2] = b
      current[x * 4 + 3] = a
    }
    let bestType = 0
    let bestScore = Infinity
    for (let type = 0; type <= 4; type++) {
      let score = 0
      for (let index = 0; index < stride; index++) {
        const value = filterPixel(type, index, current, previous, bytesPerPixel)
        candidate[index] = value
        score += value < 128 ? value : 256 - value
      }
      if (score < bestScore) {
        bestScore = score
        bestType = type
        best.set(candidate)
      }
    }
    const row = y * (1 + stride)
    raw[row] = bestType
    raw.set(best, row + 1)
    previous.set(current)
  }
  const chunk = (type: string, data: Uint8Array) => {
    const value = new Uint8Array(12 + data.length)
    new DataView(value.buffer).setUint32(0, data.length)
    value.set(new TextEncoder().encode(type), 4)
    value.set(data, 8)
    new DataView(value.buffer).setUint32(8 + data.length, crc(value.subarray(4, 8 + data.length)))
    return value
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", new Uint8Array([width >>> 24, width >>> 16, width >>> 8, width, height >>> 24, height >>> 16, height >>> 8, height, 8, 6, 0, 0, 0])),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", new Uint8Array()),
  ])
}

function filterPixel(type: number, index: number, current: Uint8Array, previous: Uint8Array, bytesPerPixel: number) {
  const raw = current[index]!
  const left = index >= bytesPerPixel ? current[index - bytesPerPixel]! : 0
  const up = previous[index]!
  const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel]! : 0
  switch (type) {
    case 0:
      return raw
    case 1:
      return raw - left
    case 2:
      return raw - up
    case 3:
      return raw - ((left + up) >> 1)
    default:
      return raw - paeth(left, up, upLeft)
  }
}

function paeth(left: number, up: number, upLeft: number) {
  const estimate = left + up - upLeft
  const distanceLeft = Math.abs(estimate - left)
  const distanceUp = Math.abs(estimate - up)
  const distanceUpLeft = Math.abs(estimate - upLeft)
  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) return left
  return distanceUp <= distanceUpLeft ? up : upLeft
}

function crc(bytes: Uint8Array) {
  let value = 0xffffffff
  for (const byte of bytes) {
    value ^= byte
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1
  }
  return (value ^ 0xffffffff) >>> 0
}

// GIF89a with a global color table. `pixel` returns a palette index; index 0
// is the transparent color. Every frame is a full-canvas image with the
// "restore to background" disposal method, so frames never depend on each
// other.
function gif(
  width: number,
  height: number,
  frameCount: number,
  pixel: (x: number, y: number, frame: number, frames: number) => number,
  transparent: [number, number, number],
  palette: Array<[number, number, number]>,
) {
  const colors = [transparent, ...palette]
  // The color table is addressed with `bits` bits per pixel, and GIF stores
  // `bits - 1`. Two bits are the minimum that keeps the LZW dictionary
  // consistent: a single-bit table makes the decoder widen its code mask by the
  // table size instead of the code size, which desynchronizes the stream.
  const bits = Math.max(2, Math.ceil(Math.log2(colors.length)))
  if (1 << bits > 256) throw new Error(`GIF palette overflow: ${colors.length} colors`)

  const bytes: number[] = []
  const push = (...values: number[]) => bytes.push(...values)
  push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)
  push(width & 0xff, (width >> 8) & 0xff, height & 0xff, (height >> 8) & 0xff)
  push(0x80 | (bits - 1), 0x00, 0x00)
  for (let index = 0; index < 1 << bits; index++) {
    const color = colors[index] ?? [0, 0, 0]
    push(color[0], color[1], color[2])
  }

  for (let frame = 0; frame < frameCount; frame++) {
    const indices = new Uint8Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) indices[y * width + x] = pixel(x, y, frame, frameCount)
    }
    // Graphic control extension: transparent color given, restore to
    // background, 120ms delay.
    push(0x21, 0xf9, 0x04, 0x09, 0x0c, 0x00, 0x00, 0x00)
    push(0x2c, 0, 0, 0, 0, width & 0xff, (width >> 8) & 0xff, height & 0xff, (height >> 8) & 0xff, 0x00)
    push(bits)
    push(...gifBlocks(gifLzw(indices, bits)))
  }
  push(0x3b)
  return Buffer.from(bytes)
}

function gifBlocks(data: readonly number[]): number[] {
  const result: number[] = []
  for (let offset = 0; offset < data.length; offset += 255) {
    const slice = data.slice(offset, offset + 255)
    result.push(slice.length, ...slice)
  }
  result.push(0)
  return result
}

// GIF LZW encoder.
//
// The decoder adds a dictionary entry one code later than the encoder does, so
// the code width grows one code later as well: the width changes when the
// *next* code to be assigned would pass a power of two, not when it reaches
// one. Getting this off by one desynchronizes the stream and the decoder
// renders a single flat frame.
function gifLzw(indices: Uint8Array, bits: number): number[] {
  const clearCode = 1 << bits
  const endCode = clearCode + 1
  let codeSize = bits + 1
  let nextCode = clearCode + 2
  // The dictionary is keyed by the pair "current code, next pixel" packed into
  // one number, which keeps the encoder linear on large frames.
  const dictionary = new Map<number, number>()

  const out: number[] = []
  let buffer = 0
  let bitCount = 0
  const emit = (code: number) => {
    buffer |= (code & ((1 << codeSize) - 1)) << bitCount
    bitCount += codeSize
    while (bitCount >= 8) {
      out.push(buffer & 0xff)
      buffer >>>= 8
      bitCount -= 8
    }
  }

  emit(clearCode)
  let prefix = indices[0] ?? 0
  for (let index = 1; index < indices.length; index++) {
    const character = indices[index]!
    const key = prefix * 256 + character
    const existing = dictionary.get(key)
    if (existing !== undefined) {
      prefix = existing
      continue
    }
    emit(prefix)
    dictionary.set(key, nextCode++)
    if (nextCode - 1 === 1 << codeSize && codeSize < 12) codeSize++
    prefix = character
  }
  emit(prefix)
  emit(endCode)
  if (bitCount > 0) out.push(buffer & 0xff)
  return out
}
