import type { StyledText } from "@opentui/core"
import type { DiagramCanvas } from "../core/canvas.js"
import { renderDiagramGridStyledText } from "../core/render-grid.js"
import type { ClassStyleColors } from "./style.js"
import type { ClassCellStyle } from "./types.js"

export type ClassGrid = DiagramCanvas<ClassCellStyle>

export function renderClassGridText(grid: ClassGrid): string {
  return grid.toString({ trimTop: true, trimBottom: true })
}

export function renderClassGridStyledText(grid: ClassGrid, colors: ClassStyleColors): StyledText {
  return renderDiagramGridStyledText(grid, (run) => (run.style ? colors[run.style] : undefined), undefined, {
    trimTop: true,
    trimBottom: true,
  })
}
