import {
  BoxRenderable,
  TextTableRenderable,
  type MouseEvent,
  type RenderContext,
} from "@opentui/core"

// In content mode a table keeps its natural columns even when its layout box is
// narrower, so its drawn width can be larger than `table.width`. The layout
// itself knows the drawn width; fall back to the box when the field is gone.
function tableWidth(table: TextTableRenderable): number {
  const layout = (
    table as unknown as { computeLayout?: (maxWidth?: number) => { tableWidth?: number } | undefined }
  ).computeLayout?.(undefined)
  const width = layout?.tableWidth
  if (typeof width === "number" && Number.isFinite(width) && width > 0) return Math.round(width)
  return Number.isFinite(table.width) ? Math.round(table.width) : 0
}

// OpenTUI's table draws itself into the bounds it is given, so a table wider
// than the document is clipped by the terminal. The wrapper keeps the table at
// its natural width and moves it sideways, the same way a Mermaid diagram is
// panned. A table that actually needs the scroller gives up cell selection:
// otherwise a drag would select text instead of panning.
export class ScrollableTableRenderable extends BoxRenderable {
  protected readonly table: TextTableRenderable
  protected offset = 0
  protected panEnabled = true
  private dragX: number | undefined

  constructor(ctx: RenderContext, table: TextTableRenderable) {
    super(ctx, {
      width: "100%",
      flexDirection: "row",
      flexShrink: 0,
      overflow: "hidden",
    })
    this.table = table
    table.flexShrink = 0
    this.add(table)
    this.onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return
      this.dragX = event.x
    }
    this.onMouseDrag = (event: MouseEvent) => {
      if (this.dragX === undefined || !this.panEnabled) return
      const dx = event.x - this.dragX
      this.dragX = event.x
      if (!dx || !this.overflows()) return
      event.preventDefault()
      event.stopPropagation()
      this.scrollBy(-dx)
    }
    this.onMouseDragEnd = () => {
      this.dragX = undefined
    }
    this.onMouseUp = () => {
      this.dragX = undefined
    }
    // A vertical wheel is left to the host: the document scroll box owns it.
    this.onMouseScroll = (event: MouseEvent) => {
      const direction = event.scroll?.direction
      if (!this.panEnabled || (direction !== "left" && direction !== "right")) return
      if (!this.overflows()) return
      event.preventDefault()
      event.stopPropagation()
      this.scrollBy(direction === "left" ? -2 : 2)
    }
  }

  // A table that fits keeps cell selection; only a table that has to scroll
  // gives its drag to the scroller.
  protected override onResize(width: number, _height: number) {
    super.onResize(width, _height)
    this.syncOverflowState(width)
  }

  protected syncOverflowState(width = this.width) {
    // A Solid custom renderable receives props before Yoga assigns its first
    // width. Measuring the table at that point can poison the layout cache.
    if (!Number.isFinite(width) || width <= 0) return
    const viewport = Math.round(width)
    const max = Math.max(0, tableWidth(this.table) - viewport)
    this.offset = this.panEnabled ? Math.min(this.offset, max) : 0
    this.table.marginLeft = -this.offset
    this.table.selectable = !this.panEnabled || max === 0
  }

  private overflows(width = this.width) {
    const viewportWidth = Number.isFinite(width) ? Math.round(width) : 0
    return tableWidth(this.table) > viewportWidth
  }

  private scrollBy(delta: number) {
    const viewportWidth = Number.isFinite(this.width) ? Math.round(this.width) : 0
    const max = Math.max(0, tableWidth(this.table) - viewportWidth)
    this.offset = Math.max(0, Math.min(max, this.offset + delta))
    this.table.marginLeft = -this.offset
  }
}
