import { For, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { statusLineFields } from "./config/types"
import type { Theme } from "./theme/types"
import type { StatusLineBorder, StatusLineField } from "./config/types"

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

// `text` is a list field, so it is only rendered when a host asks for it.
export const defaultStatusLineFields: readonly StatusLineField[] = statusLineFields.filter(
  (field) => field !== "text",
)

// A field without a value is skipped, so a host only has to provide what it
// knows. `text` expands to every entry of the state's text list.
export function statusLineSegments(
  state: StatusLineState,
  fields: readonly StatusLineField[] = defaultStatusLineFields,
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
    segments.push({ text: value, emphasis: field === "title" ? "strong" : "muted" })
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

export function StatusLine(props: {
  readonly theme: Theme
  readonly state: () => StatusLineState
  readonly fields?: readonly StatusLineField[]
  readonly separator?: string
  readonly border?: StatusLineBorder
}) {
  const separator = () => props.separator ?? " · "
  const parts = () => {
    const segments = statusLineSegments(props.state(), props.fields)
    const result: Array<{ text: string; emphasis: "strong" | "muted" }> = []
    for (const segment of segments) {
      if (result.length) result.push({ text: separator(), emphasis: "muted" })
      result.push(segment)
    }
    return result
  }
  const border = () => {
    if (props.border === "top") return ["top"] as ["top"]
    if (props.border === "bottom") return ["bottom"] as ["bottom"]
    return false
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
      borderColor={props.theme.border.base}
      backgroundColor={props.theme.background.base}
    >
      <Show when={parts().length}>
        <For each={parts()}>
          {(part) => (
            <text
              fg={part.emphasis === "strong" ? props.theme.text.base : props.theme.text.muted}
              attributes={part.emphasis === "strong" ? TextAttributes.BOLD : TextAttributes.NONE}
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
