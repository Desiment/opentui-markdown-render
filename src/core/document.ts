export type SourceRange = { readonly start: number; readonly end: number }

export type NodeBase = { readonly raw: string; readonly source: SourceRange | null }

export type Document = { readonly source: string; readonly blocks: readonly Block[] }

export type Block =
  | (NodeBase & { readonly type: 'paragraph'; readonly children: readonly Inline[] })
  | (NodeBase & { readonly type: 'heading'; readonly level: 1 | 2 | 3 | 4 | 5 | 6; readonly children: readonly Inline[] })
  | (NodeBase & { readonly type: 'quote'; readonly blocks: readonly Block[] })
  | (NodeBase & { readonly type: 'list'; readonly ordered: boolean; readonly start: number; readonly loose: boolean; readonly items: readonly ListItem[] })
  | (NodeBase & { readonly type: 'table'; readonly align: readonly ('left' | 'center' | 'right' | null)[]; readonly header: readonly TableCell[]; readonly rows: readonly (readonly TableCell[])[] })
  | (NodeBase & { readonly type: 'code'; readonly language: string | null; readonly content: string; readonly fenced: boolean })
  | (NodeBase & { readonly type: 'mermaid'; readonly content: string; readonly language: string })
  | (NodeBase & { readonly type: 'rule' })
  | (NodeBase & { readonly type: 'display-math'; readonly content: string; readonly open: '$$' | '\\['; readonly close: '$$' | '\\]' })
  | (NodeBase & { readonly type: 'image'; readonly href: string; readonly alt: string; readonly title: string | null })
  | (NodeBase & { readonly type: 'literal'; readonly text: string })

export type ListItem = { readonly task: boolean; readonly checked: boolean | null; readonly loose: boolean; readonly blocks: readonly Block[] }

export type TableCell = { readonly children: readonly Inline[]; readonly header: boolean; readonly align: 'left' | 'center' | 'right' | null }

export type Inline =
  | { readonly type: 'text' | 'code'; readonly text: string }
  | { readonly type: 'strong' | 'em' | 'del'; readonly children: readonly Inline[] }
  | { readonly type: 'link'; readonly href: string; readonly title: string | null; readonly children: readonly Inline[] }
  | { readonly type: 'inline-image'; readonly href: string; readonly alt: string; readonly title: string | null }
  | { readonly type: 'break'; readonly hard: boolean }
  | { readonly type: 'math'; readonly content: string; readonly open: '$' | '\\('; readonly close: '$' | '\\)'; readonly raw: string }

export function assertNever(value: never): never {
  throw new Error(`Unexpected document node: ${String(value)}`)
}
