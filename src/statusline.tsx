import { For, Show } from "solid-js"
import { TextAttributes, type RGBA } from "@opentui/core"
import { statusLineFields } from "./config/types"
import { deriveStatusLineTheme } from "./theme/resolve"
import type { Theme } from "./theme/types"
import type { StatusLineBorder, StatusLineField, StatusLineStyle } from "./config/types"

// The host owns the values; the library owns the layout and the colours.
export type StatusLineState = {
  readonly title?: string
  readonly mode?: string
  readonly protocol?: string
  readonly cell?: string
  readonly mathScale?: number
  readonly position?: string
  readonly hint?: string
  readonly text?: readonly string[]
}

export type StatusLineSegment = {
  readonly text: string
  readonly emphasis: "strong" | "muted"
}

// The colours the row is drawn with. `plain` keeps the line in the page
// colours, `bar` gives it its own background and an accent border.
export type StatusLinePalette = {
  readonly background: RGBA
  readonly foreground: RGBA
  readonly title: RGBA
  readonly muted: RGBA
  readonly border: RGBA
}

// `text` is a list field, so it is only rendered when a host asks for it.
export const defaultStatusLineFields: readonly StatusLineField[] = statusLineFields.filter(
  (field) => field !== "text",
)

// A field without a value is skipped, so a host only has to provide what it
// knows. `text` expands to every entry of the state's text list.
export function statusLineSegments(
  state: StatusLineState,
  fields: readonly StatusLineField[] = defaultStatusLineFields,
  highlight: StatusLineField = "title",
): StatusLineSegment[] {
  const segments: StatusLineSegment[] = []
  for (const field of fields) {
    if (field === "text") {
      for (const entry of state.text ?? []) {
        if (entry) segments.push({ text: entry, emphasis: "muted" })
      }
      continue
    }
    const value = statusLineValue(state, field)
    if (value === undefined) continue
    segments.push({ text: value, emphasis: field === highlight ? "strong" : "muted" })
  }
  return segments
}

export function formatStatusLine(
  state: StatusLineState,
  fields: readonly StatusLineField[] = defaultStatusLineFields,
  separator = " · ",
): string {
  return statusLineSegments(state, fields)
    .map((segment) => segment.text)
    .join(separator)
}

// The effective colours of the row. The bar style uses the theme's status line
// section, falling back to colours derived from the accent colour.
export function statusLinePalette(theme: Theme, style: StatusLineStyle = "bar"): StatusLinePalette {
  if (style === "plain") {
    return {
      background: theme.background.base,
      foreground: theme.text.muted,
      title: theme.text.base,
      muted: theme.text.muted,
      border: theme.border.base,
    }
  }
  return theme.statusline ?? deriveStatusLineTheme(theme)
}

function statusLineValue(state: StatusLineState, field: StatusLineField): string | undefined {
  switch (field) {
    case "title":
      return state.title || undefined
    case "mode":
      return state.mode || undefined
    case "protocol":
      return state.protocol ? `img:${state.protocol}` : undefined
    case "cell":
      return state.cell
    case "mathScale":
      return state.mathScale === undefined ? undefined : `${state.mathScale.toFixed(1)}x`
    case "position":
      return state.position
    case "hint":
      return state.hint
    case "text":
      return undefined
  }
}

type StatusLinePart = {
  readonly text: string
  readonly kind: "value" | "separator"
  readonly emphasis: "strong" | "muted"
  // The separator that follows the highlighted field is drawn in the accent
  // colour, so the highlighted field is cut off from the rest of the row.
  readonly divider: boolean
}

function partColor(part: StatusLinePart, palette: StatusLinePalette): RGBA {
  if (part.kind === "separator") return part.divider ? palette.border : palette.muted
  return part.emphasis === "strong" ? palette.title : palette.foreground
}

export function StatusLine(props: {
  readonly theme: Theme
  readonly state: () => StatusLineState
  readonly fields?: readonly StatusLineField[]
  readonly separator?: string
  readonly border?: StatusLineBorder
  readonly style?: StatusLineStyle
  readonly highlight?: StatusLineField
}) {
  const separator = () => props.separator ?? " · "
  const style = () => props.style ?? "bar"
  const highlight = () => props.highlight ?? "title"
  const palette = () => statusLinePalette(props.theme, style())
  const parts = (): StatusLinePart[] => {
    const segments = statusLineSegments(props.state(), props.fields, highlight())
    const result: StatusLinePart[] = []
    let previousStrong = false
    for (const segment of segments) {
      if (result.length) {
        result.push({ text: separator(), kind: "separator", emphasis: "muted", divider: previousStrong })
      }
      result.push({ text: segment.text, kind: "value", emphasis: segment.emphasis, divider: false })
      previousStrong = segment.emphasis === "strong"
    }
    return result
  }
  const border = () => {
    if (props.border === "top") return ["top"] as ["top"]
    if (props.border === "bottom") return ["bottom"] as ["bottom"]
    // An empty side list keeps the border off. Passing `false` together with
    // a border colour makes OpenTUI draw a full frame instead.
    return [] as []
  }
  return (
    <box
      width="100%"
      flexShrink={0}
      flexDirection="row"
      alignItems="center"
      paddingLeft={1}
      paddingRight={1}
      border={border()}
      borderColor={palette().border}
      backgroundColor={palette().background}
    >
      <Show when={parts().length}>
        <For each={parts()}>
          {(part) => (
            <text
              fg={partColor(part, palette())}
              attributes={part.kind === "value" && part.emphasis === "strong" ? TextAttributes.BOLD : TextAttributes.NONE}
              flexShrink={0}
              wrapMode="none"
            >
              {part.text}
            </text>
          )}
        </For>
      </Show>
    </box>
  )
}
