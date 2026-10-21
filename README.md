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
- `mathScale` adjusts display-math size.

Math PNGs bake in the foreground/background, so they rerasterize when the theme
or terminal cell size changes.

## Configuration

The renderer reads a JSON/JSONC file. Without an explicit `configPath` it walks
up from `cwd` looking for `opentui-markdown-render.jsonc` and then
`opentui-markdown-render.json`. A `config` prop replaces the file lookup
entirely.

```jsonc
{
  "$schema": "./node_modules/opentui-markdown-render/schema.json", // ignored
  "theme": {
    "mode": "dark",
    "accent": "#7dd3fc",
    "markdown": { "heading": "#e2e8f0" },
    // Colours of the status line bar.
    "statusline": { "background": "#162333", "title": "#7dd3fc", "border": "#7dd3fc" }
  },
  "statusline": {
    "enabled": true,
    "style": "bar",
    "highlight": "title",
    "fields": ["title", "mode", "protocol", "cell", "mathScale", "position", "hint"],
    "separator": " · ",
    "border": "top"
  },
  "math": { "scale": 1, "displayScale": 1.2 },
  "images": { "maxColumns": 80, "maxRows": 32 },
  "mermaid": { "compact": false, "layoutMaxWidth": 120 }
}
```

Every section is optional and keeps the bundled default when it is missing.
Unknown sections and unknown status line field names are reported on stderr
and ignored; a file that is not valid JSON is reported with its name and the
bundled defaults are used.

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

## Source Preservation

The scanner extracts `$...$`, `$$...$$`, `\\(...\\)`, and `\\[...\\]` from raw
Markdown before Markdown rendering. It preserves the original delimiters and
source offsets, skips code spans and fenced blocks, and exposes an open-math
boundary for streaming hosts. The component never changes canonical Markdown.

## Markdown Features

- Plain Markdown, headings, quotes, lists, and tables use OpenTUI's native
  renderer; paragraphs and list items that contain math flow through the inline
  layout so text and formulas share one baseline.
- The vendored Mermaid engine renders flowcharts, sequence, state, gantt,
  timeline, git graphs, and class diagrams as terminal diagrams; unsupported
  Mermaid syntax remains a normal source fence.
- Standalone local PNG, JPEG, WebP, and GIF images resolve below `assetBase`.
  Network URLs and path traversal are rejected.
- Transparent images are composited against the configured background before
  terminal placement. GIFs are decoded and advanced by their embedded frame
  delays.

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
