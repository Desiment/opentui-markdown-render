import type { BorderCharacters, BorderStyle } from "@opentui/core"
import type { JSX } from "solid-js"
import type { FrameAlign, FrameStyle, ResolvedFrame } from "../core/frame"
import type { Theme } from "../theme/types"

// OpenTUI only ships the Unicode border sets, so the ASCII frame is expressed as
// its own character table. Every corner is the same `+`, which is the look the
// plain-text sketches ask for.
const asciiBorder: BorderCharacters = {
  topLeft: "+",
  topRight: "+",
  bottomLeft: "+",
  bottomRight: "+",
  horizontal: "-",
  vertical: "|",
  topT: "+",
  bottomT: "+",
  leftT: "+",
  rightT: "+",
  cross: "+",
}

function borderStyle(style: FrameStyle): BorderStyle {
  if (style === "rounded" || style === "heavy" || style === "double") return style
  return "single"
}

function alignSelf(align: FrameAlign) {
  if (align === "left") return "flex-start" as const
  if (align === "right") return "flex-end" as const
  return "center" as const
}

export function frameBorderColor(theme: Theme) {
  return theme.frame?.border ?? theme.border.base
}

export function frameTitleColor(theme: Theme) {
  return theme.frame?.title ?? theme.text.muted
}

// The border props are only handed to the box when the frame is on. OpenTUI's
// `borderStyle` and `borderColor` setters enable the border as a side effect, so
// passing them while the frame is off would draw a window the host never asked
// for.
function borderProps(frame: ResolvedFrame, theme: Theme) {
  if (!frame.enabled) return {}
  return {
    border: true,
    borderStyle: borderStyle(frame.style),
    customBorderChars: frame.style === "ascii" ? asciiBorder : undefined,
    borderColor: frameBorderColor(theme),
    title: frame.title,
    titleColor: frameTitleColor(theme),
    titleAlignment: frame.titleAlign,
  }
}

// The frame is deliberately just a box around whatever the host puts inside it.
// It owns no document state, so a host can wrap its own scroll box and keep the
// border fixed while the document scrolls, or let the document renderer draw it.
export function MarkdownFrame(props: {
  readonly frame: ResolvedFrame
  readonly theme: Theme
  readonly children: JSX.Element
}) {
  return (
    <box
      width={props.frame.width}
      alignSelf={alignSelf(props.frame.align)}
      flexDirection="column"
      flexShrink={0}
      backgroundColor={props.theme.background.base}
      paddingLeft={props.frame.paddingX}
      paddingRight={props.frame.paddingX}
      paddingTop={props.frame.paddingY}
      paddingBottom={props.frame.paddingY}
      {...borderProps(props.frame, props.theme)}
    >
      {props.children}
    </box>
  )
}
