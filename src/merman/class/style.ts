import { RGBA } from "@opentui/core"
import { rgba, type DiagramRgb } from "../core/color/style.js"
import type { ClassCellStyle } from "./types.js"

const DEFAULT_THEME_RGB = {
  border: [141, 169, 155],
  title: [228, 239, 232],
  stereotype: [154, 184, 169],
  member: [215, 229, 221],
  edge: [134, 225, 200],
  label: [134, 225, 200],
} as const satisfies Record<ClassCellStyle, DiagramRgb>

export type ClassStyleColors = Required<Record<ClassCellStyle, RGBA>>

export function resolveClassStyleColors(
  colors: Partial<Record<ClassCellStyle, RGBA | undefined>> = {},
): ClassStyleColors {
  return {
    border: colors.border ?? rgba(DEFAULT_THEME_RGB.border),
    title: colors.title ?? rgba(DEFAULT_THEME_RGB.title),
    stereotype: colors.stereotype ?? colors.title ?? rgba(DEFAULT_THEME_RGB.stereotype),
    member: colors.member ?? rgba(DEFAULT_THEME_RGB.member),
    edge: colors.edge ?? rgba(DEFAULT_THEME_RGB.edge),
    label: colors.label ?? colors.edge ?? rgba(DEFAULT_THEME_RGB.label),
  }
}
