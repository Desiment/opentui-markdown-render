// Retained as a public helper for hosts validating a standalone image before
// passing the Markdown to the renderer.
export type MarkdownImage = { readonly alt: string; readonly href: string }

export function standaloneImage(source: string): MarkdownImage | undefined {
  const match = /^!\[([^\]]*)\]\((?:<([^>]+)>|([^\s)]+))\)\s*$/.exec(source.trim())
  if (!match) return undefined
  return { alt: match[1] ?? "", href: match[2] ?? match[3] ?? "" }
}
