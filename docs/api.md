# API reference

This page documents the public package surface exported from `opentui-markdown-render`. The package also exposes a renderer-free `opentui-markdown-render/core` entry point; use it when a host needs parsing and layout without importing OpenTUI or Solid. Signatures below describe the current exports, not a proposed interface.

## Choosing an entry point

| Import path | Typical use | Includes UI dependencies? |
| --- | --- | --- |
| `opentui-markdown-render` | Mount `MarkdownRenderer` or `StatusLine`; use the full parser, theme, layout, math, media, and diagram helpers. | Yes: OpenTUI and Solid view code. |
| `opentui-markdown-render/core` | Parse documents, inspect the AST-lite model, resolve frame/table layout, or check standalone image syntax without mounting a view. | No OpenTUI or Solid imports in the core entry point. |

The root entry point re-exports the common core types and functions, so a host that already uses `MarkdownRenderer` does not need separate imports merely to call `parseDocument`.

## Main component

```ts
import {
  MarkdownRenderer,
  type MarkdownRendererProps,
  type MarkdownRendererCommonProps,
} from "opentui-markdown-render"
```

`MarkdownRendererProps` is `MarkdownRendererCommonProps` plus exactly one of these inputs:

```ts
type MarkdownRendererProps = MarkdownRendererCommonProps & (
  | { content: () => string; document?: never }
  | { document: () => Document; content?: never }
)
```

Both accessors are reactive. `content` is parsed by the component. `document` is used as-is and skips parsing.

### Common props

| Prop | Type | Purpose |
| --- | --- | --- |
| `renderer` | `CliRenderer` | Required OpenTUI renderer instance. |
| `columns` | `() => number` | Explicit content width. Overrides measured width when positive. |
| `assetBase` | `() => string \| undefined` | Root directory for local standalone images. |
| `theme` | `Theme \| (() => Theme)` | Fully resolved host theme. Wins over all configured themes. |
| `config` | `MarkdownConfig \| (() => MarkdownConfig)` | Runtime config. Replaces config-file lookup. |
| `configPath` | `string` | Explicit JSON/JSONC config path. |
| `themeMode` | `ThemeModeSetting \| (() => ThemeModeSetting \| null \| undefined)` | Runtime preset mode. |
| `mathScale` | `number \| (() => number)` | Positive host-controlled scale for display math; defaults to `1`. |
| `cwd` | `string` | Starting directory for config discovery. |
| `frame` | `FrameConfig \| (() => FrameConfig)` | Runtime frame override. |
| `tables` | `TablesConfig \| (() => TablesConfig)` | Runtime table override. |
| `discoverConfig` | `boolean` | Set `false` to prevent automatic config discovery. |
| `onDiagnostic` | `(diagnostic: MarkdownDiagnostic) => void` | Receives config warnings and unexpected Mermaid errors instead of the default stderr/console path. |
| `renderUnit` | `RenderUnit` | Wraps each non-overlapping top-level render unit. |

Runtime `frame` and `tables` values override the corresponding config-file sections **as whole objects**. `config` itself replaces discovery; it is not merged with a discovered file. An explicit `configPath` still loads when `discoverConfig={false}`. `MarkdownDiagnostic` is `{ readonly level: "warning" | "error"; readonly message: string }`.

The component measures its own root box and uses that width once available. Before measurement it uses `renderer.terminalWidth`. A positive `columns()` result wins over measurement and is clamped to at least eight columns; a non-positive value falls back to measurement.

### Theme precedence

For the theme mode, resolution is:

```text
host-provided Theme -> runtime themeMode -> config.theme.name -> light
```

The terminal's own theme does not automatically choose the renderer palette. Pass a resolved `Theme` when the host needs total control.

## Parsing and document types

```ts
import {
  parseDocument,
  type Document,
  type Block,
  type Inline,
  type ListItem,
  type TableCell,
  type SourceRange,
} from "opentui-markdown-render"
```

The core model is intentionally smaller than a browser DOM:

```ts
type Document = {
  readonly source: string
  readonly blocks: readonly Block[]
}

type SourceRange = {
  readonly start: number
  readonly end: number
}
```

`Block` can be `paragraph`, `heading`, `quote`, `list`, `table`, `code`, `mermaid`, `rule`, `display-math`, `image`, or `literal`. `Inline` can be text/code, strong/emphasis/deletion, links, inline images, breaks, or inline math. See the TypeScript declarations in `src/core/document.ts` for the exact discriminated unions.

Every block has `raw` and `source`. `raw` is the parser's source text for that node. `source` is an exact range when the source can be proven, otherwise `null`; `start` is inclusive and `end` is exclusive. `ListItem` also contains `task`, `checked`, `loose`, `blocks`, and `source`.

### Block model at a glance

| `block.type` | Additional fields | Typical source |
| --- | --- | --- |
| `paragraph` | `children: Inline[]` | Ordinary prose. |
| `heading` | `level: 1..6`, `children` | `# Heading`. |
| `quote` | `blocks` | `> quoted text`. |
| `list` | `ordered`, `start`, `loose`, `items` | Bullets, numbers, tasks, nested lists. |
| `table` | `align`, `header`, `rows` | GFM table. |
| `code` | `language`, `content`, `fenced` | Fenced or indented code. |
| `mermaid` | `content`, `language` | Fenced `mermaid` code; diagram preparation occurs in the view. |
| `rule` | No extra fields | Markdown horizontal rule. |
| `display-math` | `content`, `open`, `close` | `$$...$$` or `\\[...\\]`. |
| `image` | `href`, `alt`, `title` | An image alone in a paragraph. |
| `literal` | `text` | HTML and unsupported block tokens. |

`Inline` includes `text`, `code`, `strong`, `em`, `del`, `link`, `inline-image`, `break`, and `math`. Inline math also preserves `raw`, `open`, and `close` to support exact source fallback. A `TableCell` contains `children`, a `header` boolean, and a parsed alignment value; the view may not visually apply all alignment markers.

```ts
const source = "# Notes\n\n- one\n- two\n"
const document = parseDocument(source)
for (const block of document.blocks) {
  if (block.source) {
    const exactSource = document.source.slice(block.source.start, block.source.end)
    // Use exactSource in host-owned diagnostics or review UI.
  }
}
```

## Render units and source ranges

`renderUnit` lets a host wrap rendered content for selection, comments, annotations, or an overlay:

```tsx
<MarkdownRenderer
  content={content}
  renderer={renderer}
  renderUnit={(info, rendered) => (
    <ReviewUnit source={info().source}>
      {rendered}
    </ReviewUnit>
  )}
/>
```

The callback receives an accessor for `UnitInfo` and the original rendered content:

```ts
type UnitInfo =
  | {
      kind: "block"
      block: Exclude<Block, { type: "list" }>
      source: SourceRange | null
    }
  | {
      kind: "list-item"
      item: ListItem
      source: SourceRange | null
    }
```

Units never overlap:

- outside a top-level list, each top-level block is one unit, except the list itself;
- inside a top-level list, each complete item is one unit, including nested lists, tables, images, and formulas;
- children of a list item are not separate units.

The callback's `info` is an **accessor**, not a frozen value: read `info()` where fresh ranges are needed after streaming updates. `RenderUnit` has the shape `(info: Accessor<UnitInfo>, content: JSX.Element) => JSX.Element`. `renderUnit` can change after mount. Without it, the renderer adds no extra host wrapper.

The library does not store selection, comment, review, or persistent ID state. The host should keep those values beside the source ranges or its own document model. A `source: null` unit is still rendered and still passed to the callback. If a helper supplies `content` or `document` later, use `Partial<MarkdownRendererCommonProps>` for the shared options, not `MarkdownRendererProps` without either input.

## Core layout helpers

```ts
import {
  createDocumentLayout,
  resolveFrame,
  resolveTableOptions,
} from "opentui-markdown-render"
```

`createDocumentLayout` is pure and renderer-free. It resolves a viewport, frame, content width, and table policy:

```ts
const layout = createDocumentLayout({
  viewport: 120,
  frame: { enabled: true, width: 96, align: "center" },
  tables: { widthMode: "content", overflow: "scroll" },
})

layout.contentWidth
layout.frame
layout.tables
```

Recompute it when the host's available width changes. Keeping this calculation in the host is useful when a frame must remain fixed while a scrollbox moves.

### Layout results and related exports

```ts
type DocumentLayoutInput = {
  readonly viewport: number
  readonly frame?: FrameConfig
  readonly tables?: TablesConfig
}

type DocumentLayout = {
  readonly frame: ResolvedFrame
  readonly contentWidth: number
  readonly tables: ResolvedTableOptions
}
```

`resolveFrame(viewport, frameConfig?)` returns the frame's `enabled`, `width`, `contentWidth`, `offsetX`, insets, alignment, style, padding, and optional title. If the frame is disabled, `contentWidth` equals the available width. `resolveTableOptions(tablesConfig?)` returns `widthMode`, `overflow`, `columnFitter`, `cellPaddingX`, and the derived OpenTUI `wrapMode`. The default is `content` + `scroll` + `balanced` + one padding column.

Frame styles are `box`, `ascii`, `rounded`, `heavy`, and `double`; alignments are `left`, `center`, and `right`. Table width modes are `content` and `full`; overflow modes are `scroll` and `wrap`; column fitters are `balanced` and `proportional`.

The root also exports the allowed-value arrays and guards (`frameAligns`, `frameStyles`, `isFrameAlign`, `isFrameStyle`, `tableWidthModes`, `tableOverflows`, `tableColumnFitters`, `isTableWidthMode`, `isTableOverflow`, `isTableColumnFitter`), plus `MarkdownFrame`, `frameBorderColor`, and `frameTitleColor`. `MarkdownFrame` accepts a **resolved** frame and a `Theme`; pass `layout.frame`, not the raw `FrameConfig` object.

## StatusLine

```tsx
import {
  StatusLine,
  defaultTheme,
  formatStatusLine,
  statusLineSegments,
  type StatusLineState,
} from "opentui-markdown-render"

const theme = defaultTheme("dark")
const state = (): StatusLineState => ({
  title: "notes.md",
  mode: "theme:dark",
  protocol: "kitty",
  cell: "10x20",
  position: "1/24",
})

<StatusLine
  theme={theme}
  state={state}
  fields={["title", "mode", "protocol", "position"]}
  separator=" · "
  border="top"
  style="bar"
  highlight="title"
/>
```

`StatusLineState` fields are optional. `protocol` is displayed as `img:<value>`, `mathScale` is formatted with one decimal place, and `text` expands a list of additional strings. `formatStatusLine(state, fields?, separator?)` and `statusLineSegments(state, fields?, highlight?)` expose the same value selection without mounting a component. The default field list excludes `text`, so request `fields={["title", "text"]}` explicitly to include it. An absent value is skipped, and `StatusLine` takes a reactive `state: () => StatusLineState`.

The root additionally exports `statusLinePalette`, `defaultStatusLineFields`, `StatusLineSegment`, and `StatusLinePalette` for custom host status views. `statusLinePalette(theme, "plain" | "bar")` returns the effective colours; it does not mount a row.

## Theme API

The package exports `defaultTheme`, `loadTheme`, `bundledThemeNames`, `resolveTheme`, `mergeTheme`, `resolveRendererTheme`, and theme types (`Theme`, `ThemeMode`, `ThemePreset`, `ThemeOverride`, and the section overrides). A `Theme` is fully resolved and uses RGBA values. `MarkdownConfig.theme` selects a complete theme file by name; `ThemeOverride` remains the partial colour/configuration shape accepted by host-side theme helpers.

Use `resolveRendererTheme` when a host wants the same precedence rules as `MarkdownRenderer`:

```ts
const theme = resolveRendererTheme(renderer, {
  config,
  themeMode: "solarized-dark",
})
```

`solarized-light` and `solarized-dark` use their canonical palette for Markdown and diagram colours. The resolved `Theme.mode` remains `light` or `dark`; the Solarized palette is available separately.

`defaultTheme(preset)` returns the bundled palette. `resolveTheme({ mode, override? })` starts with a preset and merges the override (whose `mode` can also select the preset). `mergeTheme(base, override)` merges a partial theme over a resolved theme. Other root helpers include `deriveStatusLineTheme`, `mixColors`, `generateSyntax`, `rgbaToHex`, heading style helpers (`defaultHeadingStyles`, `resolveHeadingStyles`, `headingAttributes`, `headingColor`, `headingLevels`), and their related types. Prefer the complete `theme` prop if the host already owns its palette.

## Math API

The public math helpers are useful for a host that wants to display a formula outside `MarkdownRenderer`:

```ts
import {
  renderMath,
  renderMathImage,
  clearMathCache,
  mathImageID,
} from "opentui-markdown-render"
```

`renderMath(request: MathRenderRequest)` returns a promise of native PNG result or `undefined` on an unavailable/failed render. The request supports `latex`, optional foreground/background colours, `display`, `scale`, `cellWidth`, `cellHeight`, `compact`, `standard`, and `enabled`; `enabled: false` resolves to `undefined` without rendering. The result carries `png`, `pixelWidth`, `pixelHeight`, `baseline`, and `clamped`.

`renderMathImage(content, display, color, background, cell, scale?, compact?, standard?)` prepares a `MathImage` with `png`, terminal `columns` and `rows`, `baseline`, and `clamped`. The `cell` argument is `{ width, height } | null`; the helper uses fallback cell dimensions until OpenTUI reports a measured size. A failed or incomplete formula resolves to `undefined`.

The view normally handles cache keys, theme colours, cell dimensions, and fallback behaviour. Hosts should prefer `MarkdownRenderer` unless they need a custom formula surface. `clearMathCache()` clears the in-process math result cache; it does not rebuild or reload the addon. `mathImageID` computes an identifier from formula arguments, while the view also accounts for the background when assigning image IDs.

## Image API

The package exports `resolveLocalImage`, `LocalImage`, `standaloneImage`, `imageBox`, `resolveBackground`, `rgbToHex`, `maxColumns`, and image-related types (`ImageLimits`, `MarkdownImage`). `resolveLocalImage(assetBase, href)` rejects URLs and lexical traversal outside the asset root; it does **not** inspect symlinks. It returns `{ path }` on success or `{ error }` on failure. Prefer passing `assetBase` to `MarkdownRenderer` rather than bypassing the view.

`standaloneImage(source)` is a small standalone-image syntax helper returning `{ alt, href } | undefined`. It is not a replacement for the Marked document parser or a file-system check. `imageBox(width, height, availableColumns, cellAspectRatio, limits?)` calculates the terminal columns/rows used for display; the default caps are 80 columns and 32 rows.

`LocalImage` is a lower-level Solid component for custom host views. It needs a path, alt text, asset root accessor, width accessor, cell-size accessor, background accessor, and optional theme label colours and limits. Use the main renderer unless your host already controls the document view.

## Mermaid API

```ts
import {
  detectMermaidDiagram,
  MermaidSyntaxError,
  type MermaidDiagramKind,
} from "opentui-markdown-render"
```

`detectMermaidDiagram` identifies the supported family of a Mermaid source block. Detection is not proof that every statement in the block is supported; parsing can still fail with `MermaidSyntaxError`. See the [support matrix](MERMAID_SUPPORT.md) for the supported grammar.

## Graphics helpers

The root exports `useCanvasGraphics(renderer)`, `mosaicScale(protocol)`, and types `CanvasGraphics` and `CellSize`. Call `useCanvasGraphics` inside a Solid owner/component so its capability and resize listeners can be cleaned up with the component. It exposes reactive `protocol()`, `cell()`, and `hyperlinks()` accessors. Protocol selection follows OpenTUI capabilities rather than guessing from environment variables; `mosaicScale("blocks")` is 2 and otherwise 1.

## Configuration helpers

The package exports `loadConfig`, `discoverConfig`, `parseConfig`, `loadRendererConfig`, `configFilenames`, `resolveConfiguredTheme`, and `resolveConfiguredLayout`, plus the config types. Most applications should either:

- let `MarkdownRenderer` discover the file;
- pass a complete `config` object for an embedded view;
- pass `discoverConfig={false}` and keep configuration entirely in the host.

### File loading and validation

```ts
const file = discoverConfig(process.cwd())  // string | undefined
const parsed = parseConfig('{ "theme": { "name": "dark" } }', "inline.jsonc")
const direct = loadConfig("/path/to/config.jsonc")
const safe = loadRendererConfig("/path/to/config.jsonc", process.cwd(), {
  report: (message) => diagnostics.push(message),
})
```

`discoverConfig(start)` walks up directories, preferring `.jsonc` over `.json` **within each directory**. `parseConfig(source, file?, report?)` parses/validates a JSONC string and throws for malformed JSON or a non-object root. `loadConfig(explicitPath?, cwd?, report?)` reads a file or discovers one; it returns `{}` if discovery finds nothing but throws if an explicit path is missing or malformed. `loadRendererConfig(configPath?, cwd?, { discover?, report? }?)` is the safe component-facing adapter: it reports a warning and returns `{}` for load/parse failures, and supports `discover: false` when no explicit path was provided.

`ConfigReporter` is `(message: string) => void`; the component turns these warnings into `MarkdownDiagnostic` objects for `onDiagnostic`. A ready `config` object is **not** passed through the file validator. File parsing accepts comments and trailing commas, but only valid JSON remains after stripping them.

`resolveConfiguredTheme(config, { theme?, themeMode? }?)` applies the theme precedence. `resolveConfiguredLayout(config, { viewport, frame?, tables? })` applies the layout precedence. The root also exports `statusLineFields` / `isStatusLineField` and `statusLineStyles` / `isStatusLineStyle`, plus the `MarkdownConfig`, `StatusLineConfig`, `ImagesConfig`, `MermaidConfig`, `HeadingsConfig`, and related setting types.

See [Configuration](CONFIGURATION.md) for the file format, exact options, and validation behaviour.
