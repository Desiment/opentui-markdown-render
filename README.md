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
prop, then a config file, then a bundled light/dark default. The default follows
the terminal's reported theme (`auto`), falling back to dark.

- `theme` accepts a resolved `Theme` (or an accessor) built with `resolveTheme`,
  `mergeTheme`, `defaultTheme`, and `type Theme`.
- `configPath` points at a JSON/JSONC override. Without it, the package walks up
  from `cwd` looking for `opentui-markdown-render.json[c]`.
- `themeMode` is `"light" | "dark" | "auto"` (or an accessor).
- `mathScale` adjusts display-math size.

Math PNGs bake in the foreground/background, so they rerasterize when the theme
or terminal cell size changes.

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
bun run demo:class-diag
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
