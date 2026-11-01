import {
  parseColor,
  StyledText,
  type ColorInput,
  type RGBA,
} from "@opentui/core"
import type { OpenCodeDiagramPalette } from "./palette.js"
import { drawClassDiagramGrid } from "./class/drawing.js"
import type { ClassLayoutEngine } from "./class/types.js"
import { parseMermaidClassDiagram } from "./class/parser.js"
import { renderClassGridStyledText } from "./class/render-grid.js"
import { resolveClassStyleColors } from "./class/style.js"
import { detectMermaidDiagram } from "./detect.js"
import { drawFlowchartDiagramGrid } from "./flowchart/drawing.js"
import { parseMermaidFlowchartDiagram } from "./flowchart/parser.js"
import { renderGridStyledText, resolveFlowchartStyleColors } from "./flowchart/style.js"
import { drawGanttDiagramGrid } from "./gantt/drawing.js"
import { parseMermaidGanttDiagram } from "./gantt/parser.js"
import { renderGanttGridStyledText } from "./gantt/render-grid.js"
import { resolveGanttStyleColors } from "./gantt/style.js"
import type { GanttDiagramRenderOptions } from "./gantt/types.js"
import { drawGitGraphDiagramGrid } from "./gitgraph/drawing.js"
import { parseMermaidGitGraphDiagram } from "./gitgraph/parser.js"
import { renderGitGraphGridStyledText } from "./gitgraph/render-grid.js"
import { resolveGitGraphStyleColors } from "./gitgraph/style.js"
import { drawSequenceDiagramGrid } from "./sequence/drawing.js"
import { parseMermaidSequenceDiagram } from "./sequence/parser.js"
import { renderSequenceGridStyledText } from "./sequence/render-grid.js"
import { resolveSequenceStyleColors } from "./sequence/style.js"
import { drawStateDiagramGrid } from "./state/drawing.js"
import { parseMermaidStateDiagram } from "./state/parser.js"
import { renderStateGridStyledText } from "./state/render-grid.js"
import { resolveStateStyleColors } from "./state/style.js"
import { drawTimelineDiagramGrid } from "./timeline/drawing.js"
import { parseMermaidTimelineDiagram } from "./timeline/parser.js"
import { renderTimelineGridStyledText } from "./timeline/render-grid.js"
import { resolveTimelineStyleColors } from "./timeline/style.js"

type DiagramKind = NonNullable<ReturnType<typeof detectMermaidDiagram>>

export interface PreparedDiagram {
  readonly kind: DiagramKind
  readonly source: string
  readonly text: StyledText
  readonly height: number
}

export interface MermaidDiagramOptions {
  /** Use terminal-optimized diagram spacing. Defaults to true. */
  compact?: boolean
  /** Fold responsive horizontal diagrams that exceed this width. Defaults to 120 columns. */
  layoutMaxWidth?: number
  /** Class diagram layout engine. Defaults to builtin. */
  classLayout?: ClassLayoutEngine
  /** Gantt-specific terminal rendering options. */
  gantt?: Omit<GanttDiagramRenderOptions, "layoutMaxWidth">
  colors?: Partial<Record<keyof OpenCodeDiagramPalette, ColorInput>>
  /** Restrict generated diagram colours to a fixed palette (e.g. Solarized). */
  palette?: readonly RGBA[]
}

function color(value: ColorInput | undefined): RGBA | undefined {
  return value === undefined ? undefined : parseColor(value)
}

function prepareDiagram(
  kind: DiagramKind,
  source: string,
  options: MermaidDiagramOptions,
  layoutMaxWidth: number,
): PreparedDiagram {
  const colors = options.colors ?? {}
  const compact = options.compact ?? true
  switch (kind) {
    case "classDiagram": {
      const grid = drawClassDiagramGrid(parseMermaidClassDiagram(source), { layoutMaxWidth, classLayout: options.classLayout })
      const size = grid.getTextSize({ trimTop: true, trimBottom: true })
      return {
        kind,
        source,
        text: renderClassGridStyledText(
          grid,
          resolveClassStyleColors({
            border: color(colors.boxBorder ?? colors.muted),
            title: color(colors.boxText ?? colors.primary),
            stereotype: color(colors.groupText ?? colors.group ?? colors.muted),
            member: color(colors.text),
            edge: color(colors.line ?? colors.secondary),
            label: color(colors.text),
          }),
        ),
        height: size.height,
      }
    }
    case "flowchart": {
      const grid = drawFlowchartDiagramGrid(parseMermaidFlowchartDiagram(source), {
        compact,
        layoutMaxWidth,
      })
      const size = grid.getTextSize({ trimTop: true, trimBottom: true })
      return {
        kind,
        source,
        text: renderGridStyledText(
          grid,
          resolveFlowchartStyleColors({
            node: color(colors.boxText ?? colors.primary),
            nodeBorder: color(colors.boxBorder ?? colors.muted),
            database: color(colors.boxText ?? colors.primary),
            databaseBorder: color(colors.boxBorder ?? colors.muted),
            edge: color(colors.line ?? colors.secondary),
            label: color(colors.text),
            group: color(colors.group ?? colors.muted),
            groupLabel: color(colors.groupText ?? colors.group ?? colors.muted),
          }),
          { label: color(colors.labelBackground) },
        ),
        height: size.height,
      }
    }
    case "gitGraph": {
      const grid = drawGitGraphDiagramGrid(parseMermaidGitGraphDiagram(source))
      const size = grid.getTextSize({ trimBottom: true })
      return {
        kind,
        source,
        text: renderGitGraphGridStyledText(
          grid,
          resolveGitGraphStyleColors({
            primary: color(colors.primary),
            secondary: color(colors.secondary),
            muted: color(colors.muted),
            warning: color(colors.warning),
            text: color(colors.text),
          }),
        ),
        height: size.height,
      }
    }
    case "gantt": {
      const grid = drawGanttDiagramGrid(parseMermaidGanttDiagram(source), { ...options.gantt, layoutMaxWidth })
      const size = grid.getTextSize({ trimBottom: true })
      return {
        kind,
        source,
        text: renderGanttGridStyledText(
          grid,
          resolveGanttStyleColors({
            title: color(colors.text),
            axis: color(colors.muted),
            background: color(colors.background),
            section: color(colors.secondary),
            task: color(colors.primary),
            active: color(colors.primary),
            critical: color(colors.warning),
            done: color(colors.muted),
          }),
        ),
        height: size.height,
      }
    }
    case "sequence": {
      const grid = drawSequenceDiagramGrid(parseMermaidSequenceDiagram(source), { compact })
      const size = grid.getTextSize()
      return {
        kind,
        source,
        text: renderSequenceGridStyledText(
          grid,
          resolveSequenceStyleColors({
            participant: color(colors.primary),
            lifeline: color(colors.muted),
            group: color(colors.secondary),
            request: color(colors.request ?? colors.primary),
            response: color(colors.response ?? colors.primary),
            fragment: color(colors.secondary),
            fragmentLabelBg: color(colors.background),
            note: color(colors.note ?? colors.warning),
            noteBg: color(colors.noteBackground ?? colors.background),
          }),
        ),
        height: size.height,
      }
    }
    case "state": {
      const grid = drawStateDiagramGrid(parseMermaidStateDiagram(source), { layoutMaxWidth })
      const size = grid.getTextSize({ trimTop: true, trimBottom: true })
      return {
        kind,
        source,
        text: renderStateGridStyledText(
          grid,
          resolveStateStyleColors({
            state: color(colors.boxText ?? colors.primary),
            stateBorder: color(colors.boxBorder ?? colors.primary),
            composite: color(colors.group ?? colors.muted),
            compositeLabel: color(colors.groupText ?? colors.group ?? colors.muted),
            transition: color(colors.line ?? colors.secondary),
            label: color(colors.text),
            noteBorder: color(colors.noteBorder ?? colors.warning),
            noteText: color(colors.noteText ?? colors.warning),
            noteConnector: color(colors.noteConnector ?? colors.muted),
            start: color(colors.marker ?? colors.muted),
            end: color(colors.marker ?? colors.muted),
            choice: color(colors.marker ?? colors.secondary),
          }),
          { label: color(colors.labelBackground) },
        ),
        height: size.height,
      }
    }
    case "timeline": {
      const grid = drawTimelineDiagramGrid(parseMermaidTimelineDiagram(source))
      const size = grid.getTextSize({ trimBottom: true })
      return {
        kind,
        source,
        text: renderTimelineGridStyledText(
          grid,
          resolveTimelineStyleColors({
            title: color(colors.text),
            section: color(colors.secondary),
            period: color(colors.warning),
            spine: color(colors.muted),
            event: color(colors.primary),
          }),
        ),
        height: size.height,
      }
    }
  }
}

// The view and the tests both need the prepared diagram without a render
// context. `undefined` means the fence is not a Mermaid diagram at all.
export function measureMermaidDiagram(
  source: string,
  options: MermaidDiagramOptions = {},
): PreparedDiagram | undefined {
  const kind = detectMermaidDiagram(source)
  if (!kind) return undefined
  const configuredMaxWidth =
    options.layoutMaxWidth === undefined ? 120 : Math.max(1, Math.trunc(options.layoutMaxWidth))
  const prepared = prepareDiagram(kind, source, options, configuredMaxWidth)
  const palette = options.palette
  if (!palette?.length) return prepared
  const nearest = (color: RGBA): RGBA => {
    const [r, g, b] = color.toInts()
    let closest = palette[0]!
    let distance = Number.POSITIVE_INFINITY
    for (const candidate of palette) {
      const [cr, cg, cb] = candidate.toInts()
      const difference = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
      if (difference < distance) { distance = difference; closest = candidate }
    }
    return closest
  }
  return {
    ...prepared,
    text: new StyledText(prepared.text.chunks.map((chunk) => ({
      ...chunk,
      fg: chunk.fg ? nearest(chunk.fg) : undefined,
      // Transparent label overlays should remain transparent, not turn into
      // opaque blocks when snapped to one of the 16 palette swatches.
      bg: chunk.bg && chunk.bg.a >= 1 ? nearest(chunk.bg) : undefined,
    }))),
  }
}
