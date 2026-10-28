import { generateSyntax } from "../theme/syntax"
import { defaultHeadingStyles } from "../headings"
import type { Theme } from "../theme/types"
import type { HeadingStyles } from "../headings"

export type CodeBlockProps = {
  content: string
  language: string | null
  theme: Theme
  headings: HeadingStyles
}

function firstInfoWord(lang: string | null | undefined) {
  if (!lang) return undefined
  const word = lang.trim().split(/\s+/)[0]
  if (!word) return undefined
  const lower = word.toLowerCase()
  if (lower === "js") return "javascript"
  if (lower === "ts") return "typescript"
  if (lower === "sh") return "bash"
  if (lower === "rs") return "rust"
  return lower
}

export function CodeBlock(props: CodeBlockProps) {
  const syntaxStyle = generateSyntax(props.theme, props.headings || defaultHeadingStyles, props.theme.markdown.codeBlock)
  return (
    <code
      content={props.content}
      filetype={firstInfoWord(props.language) ?? undefined}
      syntaxStyle={syntaxStyle}
      fg={props.theme.markdown.codeBlock}
      bg={props.theme.background.base}
      conceal={false}
      drawUnstyledText={true}
      streaming={false}
      width="100%"
    />
  )
}
