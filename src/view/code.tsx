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

export function resolveCodeFiletype(language: string | null) {
  const token = language?.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? ""
  return token === "jsonc" ? "json" : infoStringToFiletype(language ?? "")
}

export function CodeBlock(props: CodeBlockProps) {
  const renderer = useRenderer()
  const nativeScene = (renderer as typeof renderer & { readonly nativeScene?: object }).nativeScene
  const owned = props.syntaxStyle ? undefined : generateSyntax(props.theme, props.headings, props.theme.markdown.codeBlock, nativeScene)
  onCleanup(() => {
    if (owned) void renderer.idle().then(() => owned.destroy())
  })
  return (
    <code
      content={props.content}
      filetype={resolveCodeFiletype(props.language)}
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
