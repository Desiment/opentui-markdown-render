import { RGBA } from "@opentui/core"
import type { Theme } from "../theme/types"
import { blendColor } from "./core/color/style.js"

export interface OpenCodeDiagramPaletteInput {
  readonly text: RGBA
  readonly subdued: RGBA
  readonly info: RGBA
  readonly success: RGBA
  readonly warning: RGBA
  readonly background: RGBA
  readonly accent: {
    readonly soft: RGBA
    readonly clear: RGBA
  }
}

export type OpenCodeDiagramPalette = ReturnType<typeof createOpenCodeDiagramPalette>

export function createOpenCodeDiagramPalette(input: OpenCodeDiagramPaletteInput) {
  const secondary = blendColor(input.text, input.subdued, 0.5)
  const muted = blendColor(input.text, input.subdued, 0.7)
  return {
    text: input.text,
    primary: input.text,
    secondary,
    muted,
    warning: input.info,
    background: input.background,
    request: input.success,
    response: input.warning,
    note: input.text,
    noteBackground: blendColor(input.background, input.subdued, 0.25),
    boxText: input.text,
    boxBorder: muted,
    line: input.subdued,
    labelBackground: RGBA.fromValues(input.text.r, input.text.g, input.text.b, 0.08),
    group: input.accent.soft,
    groupText: input.accent.soft,
    marker: secondary,
    noteBorder: input.accent.soft,
    noteText: input.accent.clear,
    noteConnector: input.accent.soft,
  }
}

export function resolveOpenCodeDiagramPalette(theme: Theme) {
  return createOpenCodeDiagramPalette({
    text: theme.text.base,
    subdued: theme.text.muted,
    info: theme.text.feedback.info,
    success: theme.text.feedback.success,
    warning: theme.text.feedback.warning,
    background: theme.background.base,
    accent: {
      soft: theme.accent,
      clear: theme.accent,
    },
  })
}
