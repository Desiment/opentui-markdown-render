import { infoStringToFiletype, type SyntaxStyle } from "@opentui/core"
import { useRenderer } from "@opentui/solid"
import { onCleanup } from "solid-js"
import { generateSyntax } from "../theme/syntax"
import type { Theme } from "../theme/types"
import type { HeadingStyles } from "../headings"

export type CodeBlockProps = {
  content: string
  language: string | null
  theme: Theme
  headings: HeadingStyles
  syntaxStyle?: SyntaxStyle
}

export function CodeBlock(props: CodeBlockProps) {
  const renderer = useRenderer()
  const nativeScene = (renderer as typeof renderer & { readonly nativeScene?: object }).nativeScene
  const owned = props.syntaxStyle ? undefined : generateSyntax(props.theme, props.headings, props.theme.markdown.codeBlock, nativeScene)
  onCleanup(() => owned?.destroy())
  return (
    <code
      content={props.content}
      filetype={infoStringToFiletype(props.language ?? "")}
      syntaxStyle={props.syntaxStyle ?? owned!}
      fg={props.theme.markdown.codeBlock}
      bg={props.theme.background.base}
      conceal={false}
      drawUnstyledText={true}
      streaming={false}
      width="100%"
    />
  )
}
