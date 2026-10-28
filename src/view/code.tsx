import { infoStringToFiletype } from "@opentui/core"
import { generateSyntax } from "../theme/syntax"
import type { Theme } from "../theme/types"
import type { HeadingStyles } from "../headings"

export type CodeBlockProps = {
  content: string
  language: string | null
  theme: Theme
  headings: HeadingStyles
}

export function CodeBlock(props: CodeBlockProps) {
  return (
    <code
      content={props.content}
      filetype={infoStringToFiletype(props.language ?? "")}
      syntaxStyle={generateSyntax(props.theme, props.headings, props.theme.markdown.codeBlock)}
      fg={props.theme.markdown.codeBlock}
      bg={props.theme.background.base}
      conceal={false}
      drawUnstyledText={true}
      streaming={false}
      width="100%"
    />
  )
}
