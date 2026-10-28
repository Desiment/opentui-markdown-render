# OpenTUI Markdown Render

`opentui-markdown-render` is a Bun/OpenTUI component for rendering Markdown with
real LaTeX-style mathematics in Kitty-compatible terminals.

```text
raw Markdown -> math extraction -> MiTeX -> Typst -> in-memory PNG -> OpenTUI image
```

The renderer never invokes system LaTeX, TeX Live, Typst, or a rasterizer. Its
Linux x64 glibc prebuild is an in-process Rust N-API addon containing MiTeX,
Typst, embedded fonts, and PNG rasterization.

## Use

```tsx
import { MarkdownRenderer } from "opentui-markdown-render"

<MarkdownRenderer
  content={() => "Probability is $P(A \\mid B)$."}
  renderer={renderer}
  assetBase={() => "/absolute/path/to/document-assets"}
/>
```

## Theming

The component resolves its theme in priority order: a host-provided `theme`
prop, then the config file, then a bundled light/dark default. The default
follows the terminal's reported theme (`auto`), falling back to dark.

- `theme` accepts a resolved `Theme` (or an accessor) built with `resolveTheme`,
  `mergeTheme`, `defaultTheme`, and `type Theme`.
- `themeMode` is `"light" | "dark" | "auto"` (or an accessor).

Math PNGs bake in the foreground/background, so they rerasterize when the theme
or terminal cell size changes.

## Configuration

The renderer reads a JSON/JSONC file. Without an explicit `configPath` it walks
up from `cwd` looking for `opentui-markdown-render.jsonc` and then
`opentui-markdown-render.json`. A `config` prop replaces the file lookup
entirely.

```jsonc
{
  // $schema is reserved; the package does not currently publish a JSON schema.
  "theme": {
    "mode": "dark",
    "accent": "#7dd3fc",
    "markdown": { "heading": "#e2e8f0", "heading3": "#94a3b8" },
    // Colours of the status line bar.
    "statusline": { "background": "#162333", "title": "#7dd3fc", "border": "#7dd3fc" }
  },
  "statusline": {
    "enabled": true,
    "style": "bar",
    "highlight": "title",
    "fields": ["title", "mode", "protocol", "cell", "position", "hint"],
    "separator": " · ",
    "border": "top"
  },
  "images": { "maxColumns": 80, "maxRows": 32 },
  "mermaid": { "compact": false, "layoutMaxWidth": 120 },
  "headings": { "levels": { "1": { "underline": false } } },
  "frame": { "enabled": true, "width": 100, "align": "center", "style": "rounded" },
  "tables": { "widthMode": "content", "overflow": "scroll" }
}
```

Every section is optional and keeps the bundled default when it is missing.
The file's theme keys and colors are checked before rendering; invalid colors
and unknown nested theme keys are reported and ignored.
The renderer uses `theme.markdown.listItem` for bullet markers and
`listEnumeration` for numbered markers (including lists containing inline math).
`codeBlock` sets the base colour of unhighlighted fenced code, while `code`
colours inline code. `horizontalRule` colours the rule's border. For standalone
images, `image` colours loading/error labels and `imageText` colours their alt
text and diagnostics; the pixels of a loaded image are not recoloured.
Unknown sections and unknown status line field names are reported on stderr
and ignored; a file that is not valid JSON is reported with its name and the
bundled defaults are used. A host can collect those reports with `onDiagnostic`
instead (see [Embedding](#embedding)).

## Headings

A terminal has one text size, so the level of a heading is expressed through
colour, attributes and spacing instead of a larger font. Every level has its
own colour (`theme.markdown.headingLevels`) and its own style
(`headings.levels` in the config file).

The marker stays in the output and is drawn in the muted text colour, so the
level of a heading is visible at a glance.

```jsonc
{
  "theme": {
    "markdown": {
      // The colour of every level that has no colour of its own.
      "heading": "#e2e8f0",
      // The colour of a single level.
      "heading3": "#94a3b8"
    }
  },
  "headings": {
    "levels": {
      "1": { "bold": true, "underline": true, "uppercase": false, "marginTop": 2, "marginBottom": 1 },
      "2": { "bold": true, "marginTop": 1 },
      "3": { "bold": true, "dim": true }
    }
  }
}
```

The options of a level are `bold`, `italic`, `underline`, `dim`, `uppercase`,
`marginTop` and `marginBottom`. An option that is not mentioned keeps the
bundled style of that level, and a level that is not mentioned at all keeps
the bundled style. An unknown level or an unknown option is reported on
stderr and ignored.

## Status line

`StatusLine` renders one themed row of labelled fields. The host owns the
values, the library owns the layout and the colours.

```tsx
import { StatusLine } from "opentui-markdown-render"

<StatusLine
  theme={theme}
  state={() => ({ title: "notes.md", protocol: "kitty", hint: "[q] quit" })}
  fields={config.statusline?.fields}
  separator={config.statusline?.separator}
  border={config.statusline?.border}
  style={config.statusline?.style}
  highlight={config.statusline?.highlight}
/>
```

Available fields are `title`, `mode`, `protocol`, `cell`, `mathScale`,
`position`, `hint`, and `text` (a list of extra host strings). A field without
a value is skipped. `formatStatusLine` and `statusLineSegments` expose the
same formatting without rendering.

`style` picks how strongly the row is highlighted:

- `bar` (default) gives the row its own background, an accent border, and
  draws the highlighted field in the accent colour. The background is the
  accent colour toned down over the page background.
- `plain` keeps the row in the page colours, like a normal line of text.

`highlight` names the field that gets the accent treatment and defaults to
`title`. The separator right after it is drawn in the accent colour as well.

The bar colours live in the theme section `statusline` and can be overridden
per colour: `background`, `foreground`, `title`, `muted`, and `border`. They
follow the theme accent, so overriding `theme.accent` moves the bar with it.

## Fallback

Typeset output is enabled only when OpenTUI reports a Kitty-compatible graphics
protocol and terminal pixel dimensions. Unsupported terminals, missing native
prebuilds, failed MiTeX/Typst conversion, and image errors leave the original
LaTeX source in the document. There is no Unicode-math fallback.

## Math

The LaTeX source is converted by MiTeX into Typst code and typeset by Typst, in
process, without a system LaTeX installation.

- Inline math (`$...$`, `\(...\)`) is typeset in text style and shares the
  baseline of the text around it.
- Display math (`$$...$$`, `\[...\]`) is typeset in display style: large
  operators carry their limits above and below instead of beside them.
- Formula raster size follows the terminal cell size; there is no user-facing
  math scale setting.
- The commands MiTeX emits but Typst has no equivalent for are handled by the
  official MiTeX scope (Apache-2.0, `mitex-rs/mitex`, see [`NOTICE`](NOTICE)):
  `\sqrt[n]{x}`, `\dfrac`, `\tfrac`, `\text`, `\operatorname`, `\boxed`,
  `\phantom`, `\begin{pmatrix}`, `\begin{bmatrix}`, `\begin{matrix}`,
  `\begin{cases}`, `\begin{aligned}`, `\begin{array}`, `\xrightarrow`,
  `\middle`, `\big`, `\substack`, `\displaystyle`.
- A formula that neither MiTeX nor Typst can parse is left in the document as
  its LaTeX source.
- An inline formula that has text after it on the same line is scaled down to
  fit that row. A formula that ends its line keeps the standard text size
  instead: nothing follows it there, so it does not have to share the row.

## Layout Width

The document is laid out for the width of the area it is rendered in, not for the
width of the terminal: the component measures its own box, so a host that insets
the document (a scroll box with padding, a sidebar, a border) leaves the text and
the formulas inside it. A line that reached past that area would be cut off by
the terminal.

The `columns` prop overrides the measurement with a width the host knows.

## Frame

The viewer can draw a window around the whole document. The frame has a fixed
width and is aligned inside the area around it; the text stays on the left edge
of the window, so moving the window does not move the prose.

```jsonc
{
  "frame": {
    "enabled": true,
    "width": 100,           // outer width, border and padding included
    "align": "center",      // left | center | right
    "style": "rounded",     // box | ascii | rounded | heavy | double
    "paddingX": 1,          // empty columns between border and text
    "paddingY": 0,
    "title": "notes.md",    // carved into the top border
    "titleAlign": "center"  // left | center | right
  }
}
```

Every option is also accepted by the `frame` prop (an object or an accessor); a
prop wins over the file. `width` is clamped to the measured area, so a frame
configured for 100 columns still fits an 80-column terminal. A title longer than
the top border is cut. `style: "ascii"` draws `+ - |` for terminals whose font
does not align the Unicode box characters.

The frame is off by default; without it the document uses the whole measured
area. The frame's content width — the outer width minus border and padding — is
the single number every block uses, so text, tables, formulas and images share
one right edge.

## Tables

Tables are content-sized and never stretch over the window: a two-column table
stays two columns wide. A table wider than the document scrolls sideways instead
of being wrapped or clipped, the same way a Mermaid diagram pans.

```jsonc
{
  "tables": {
    "widthMode": "content", // content | full
    "overflow": "scroll",   // scroll | wrap
    "columnFitter": "balanced", // balanced | proportional
    "cellPaddingX": 1
  }
}
```

`tables` also accepts a prop. `overflow: "wrap"` wraps cell text instead of
scrolling (a table with more columns than the width can hold at one character
each is still clipped); `widthMode: "full"` restores OpenTUI's full-width grid.
Vertical wheel events are left to the host's scroll box; a horizontal wheel or a
drag pans the table. A table that is wide enough to scroll is panned rather than
selected, so a drag belongs to the scroller; a table that fits keeps its cells
selectable.

## Embedding

The package is split into a pure core and an OpenTUI/Solid view. A host that
embeds the renderer (a message log, a side panel) can decide the layout before
mounting anything:

```ts
import { createDocumentLayout } from "opentui-markdown-render/core"

const layout = createDocumentLayout({
  viewport: 120,
  frame: { enabled: true, width: 96, align: "center" },
  tables: { widthMode: "content", overflow: "scroll" },
})

layout.contentWidth // the one width every block uses
layout.frame        // width, offsetX, insets, title
layout.tables       // resolved table policy
```

Recompute the layout when the area changes; it is cheap and pure.

`createDocumentLayout`, `parseDocument`, `resolveFrame`, `resolveTableOptions`,
and the AST-lite block types import neither OpenTUI nor Solid. The
`opentui-markdown-render/core` entry point exposes that renderer-free half.

The integration points the host controls:

- `config` replaces the file lookup; `discoverConfig={false}` keeps an embedded
  renderer from picking up a standalone viewer's config file.
- `onDiagnostic` receives config warnings and errors instead of stderr.
- `columns` tells the renderer the width the host measured.
- `theme` wins over the config file; `resolveRendererTheme` builds a theme from
  the same inputs as the component.

To keep the frame fixed while the document scrolls, render `MarkdownFrame`
outside the host's scroll box and give the renderer `frame={{ enabled: false }}`
with `columns={() => layout.contentWidth}`:

```tsx
<MarkdownFrame frame={layout.frame} theme={theme}>
  <scrollbox width="100%" flexGrow={1}>
    <MarkdownRenderer
      content={content}
      renderer={renderer}
      theme={theme}
      frame={{ enabled: false }}
      columns={() => layout.contentWidth}
      discoverConfig={false}
      onDiagnostic={(diagnostic) => log(diagnostic.message)}
    />
  </scrollbox>
</MarkdownFrame>
```

Passing the frame to the renderer instead makes the frame scroll with the
document, which is what the standalone viewer does.

## Source Preservation

`parseDocument` lexes the original Markdown once with Marked and local math
extensions for `$...$`, `$$...$$`, `\\(...\\)`, and `\\[...\\]`. It preserves
the original source and math delimiters, skips code spans and fenced blocks,
and keeps lists and quotes intact around display formulas. Exact source ranges
are available where Marked tokens match the original text; normalized nested
tokens have `source: null`. Unclosed math remains literal text; there is no
open-math boundary API. The component never changes canonical Markdown.

## Markdown Features

- Plain and math-containing paragraphs, headings, nested lists, task lists and
  quotes share one parser and one inline layout; links retain their `href` in
  rendered text chunks. On terminals without hyperlinks, link targets are
  also shown as `label (url)`.
- Fenced code uses OpenTUI's `CodeRenderable`; Mermaid and tables use the
  low-level OpenTUI primitives without OpenTUI's `<markdown>` parser.
- Tables size their columns to the content and pan sideways when they are wider
  than the document; `tables.overflow: "wrap"` wraps them instead.
- Headings flow through the inline layout as well, so every level can have its
  own colour, attributes and spacing.
- Inline images show linked alt text, not a bitmap. Formula source inside a
  table cell stays literal text: `TextTableRenderable` cannot embed images.
  Table alignment is retained in the parsed model but not visually applied by
  the current OpenTUI table primitive. HTML is displayed literally.
- Streaming updates retain unchanged prefix/suffix blocks and a single edited
  block's local Mermaid state. These are transient component slots, **not**
  stable IDs for review annotations or arbitrary block reordering.
- The vendored Mermaid engine renders flowcharts, sequence, state, gantt,
  timeline, git graphs, and class diagrams as terminal diagrams; unsupported
  Mermaid syntax remains a normal source fence.
- Standalone local PNG, JPEG, WebP, and GIF images resolve below `assetBase`.
  Network URLs and path traversal are rejected.
- Transparent images are composited against the configured background before
  terminal placement. GIFs are decoded and advanced by their embedded frame
  delays.

### Migration from the two-path renderer

`scanDocument(source): CanvasBlock[]` was replaced by
`parseDocument(source): Document`; use `document.blocks` for typed
paragraph/list/table/math/image nodes instead of `markdown`/`flow` routing.
`parseInlineRuns` was replaced by `paragraph.children` in the new AST-lite
model. The routing-only `CanvasBlock`, `CanvasSource`, `FlowBlock`, `FlowItem`,
`InlineRun`, `InlineStyle` and `CanvasFlow` exports were removed. Hosts should
render documents with `MarkdownRenderer` rather than instantiating the old
inline flow. `standaloneImage`, `MarkdownImage`, `createTableRenderer`, and
`createThemedMermaidRenderer` remain exported; the last two are independent
helpers for hosts rendering their own OpenTUI `<markdown>` nodes.

Run independent examples after building the native addon:

```sh
bun run generate:examples
bun run build:native
bun run demo:plain
bun run demo:tables
bun run demo:mermaid
bun run demo:math
bun run demo:images
bun run demo:mixed
bun run demo:frame
bun run demo:all
```

See [`examples/README.md`](examples/README.md) for the coverage expected from
each fixture.

## Development

```sh
bun install
bun run verify
```

`verify` builds the native addon, runs TypeScript tests and type checks, then
runs the Rust test suite. The release target is currently Linux x64 glibc.

The addon embeds Typst 0.15 and MiTeX 0.2. The Rust toolchain has to satisfy
the `rust-version` in `native/Cargo.toml`.
