# Getting started

This guide takes a new OpenTUI application from installation to a usable Markdown view. It also explains the choices that matter when the renderer is embedded in an existing message log, document viewer, or side panel.

## Requirements

For an application consuming the package:

- Bun 1.4 or newer;
- OpenTUI Core and OpenTUI Solid 0.5.12 or newer;
- Solid 1.9 or newer;
- a terminal with Kitty graphics for best image and math quality; Sixel and block-character rendering are available through OpenTUI when supported;
- Linux x64 glibc for the current native math prebuild target.

The text renderer remains useful without high-resolution graphics. Image quality and formula layout depend on the protocol OpenTUI selects. Missing native math or an invalid formula leaves readable math source rather than an empty block.

For development from this repository, also install a Rust 1.92+ toolchain compatible with [`native/Cargo.toml`](../native/Cargo.toml).

## Run the repository demo

```sh
bun install
bun run generate:examples
bun run build:native
bun run demo:all
```

The first command installs the package and its peer dependencies. `generate:examples` creates the image and GIF fixtures used by the image, mixed, and all-document demos. `build:native` builds the Rust addon used for math. `demo:all` starts the standalone viewer with the complete fixture.

Use a focused demo when investigating one feature:

```sh
bun run demo:plain       # Markdown text, headings, lists, code
bun run demo:tables      # table sizing and alignment data
bun run demo:math        # inline/display formulas and fallbacks
bun run demo:images      # local images, transparency, and GIFs
bun run demo:mermaid     # supported Mermaid families
bun run demo:merman-ext  # larger Mermaid stress suite
bun run demo:mixed       # prose, table, formula, diagram, and image together
bun run demo:frame       # frame layout and a wide pannable table
```

The demo discovers [`examples/opentui-markdown-render.jsonc`](../examples/opentui-markdown-render.jsonc) by walking upward from the examples directory. Press `c` to change theme, frame, table, and class-diagram layout at runtime. Those changes are deliberately ephemeral. The installed `otmd` command uses the same viewer shell and controls, while discovering configuration from its current working directory or XDG config directory.

## Install the package

```sh
bun add opentui-markdown-render @opentui/core @opentui/solid solid-js
```

The package exposes TypeScript source through its package entry points. `@opentui/core`, `@opentui/solid`, and `solid-js` are peer dependencies so that the host controls their versions. The native math loader looks for a matching addon in the package's `prebuilds/linux-x64-gnu/` directory; building from a repository checkout writes it there.

To install the standalone CLI globally, npm and Bun are both supported as
installers. Bun is still required to run the command:

```sh
npm install -g opentui-markdown-render
otmd --version
otmd README.md
```

## Render a string

Create an OpenTUI renderer, then mount the Solid component:

```tsx
import { createCliRenderer } from "@opentui/core"
import { render } from "@opentui/solid"
import { MarkdownRenderer } from "opentui-markdown-render"

const renderer = await createCliRenderer({})
const markdown = () => `# Release notes

The renderer accepts **Markdown**, tables, Mermaid, and $E = mc^2$.
`

render(
  () => (
    <MarkdownRenderer
      content={markdown}
      renderer={renderer}
    />
  ),
  renderer,
)
```

Both `content` and `document` are functions because the component is reactive. When the returned string changes, the renderer reparses it and updates the document view.

## Render a parsed document

Use the `core` parser when the host needs to inspect or cache the document before rendering:

```tsx
import { MarkdownRenderer, parseDocument } from "opentui-markdown-render"

const source = `## Cached document

This document was parsed by the host.
`
const document = parseDocument(source)

<MarkdownRenderer
  document={() => document}
  renderer={renderer}
/>
```

`content` and `document` are mutually exclusive. A ready `document` skips parsing inside `MarkdownRenderer`; theme, layout, image, table, Mermaid, and frame props work the same way for both inputs.

## Add local images and GIFs

Image paths in Markdown are resolved below `assetBase`. Set it to the directory that is the root of the document's local assets:

```tsx
<MarkdownRenderer
  content={() => `![Telemetry frame](assets/opaque.png)\n\n![Pulse](assets/pulse.gif)`}
  renderer={renderer}
  assetBase={() => "/absolute/path/to/document-assets"}
/>
```

The resolver rejects network URLs and paths that escape `assetBase`. The standalone viewer passes the examples directory as its asset root, which is why `examples/images.md` can refer to `./assets/*.png` and `./assets/pulse.gif`.

## Embedding in a scrollable view

The host normally owns the vertical scroll container. The renderer measures the width of its assigned box, so padding, sidebars, and borders must be applied by the host around that box:

```tsx
<scrollbox
  width="100%"
  flexGrow={1}
  contentOptions={{ paddingLeft: 1, paddingRight: 1, paddingTop: 1, paddingBottom: 1 }}
>
  <MarkdownRenderer
    content={markdown}
    renderer={renderer}
    assetBase={() => documentAssetRoot}
  />
</scrollbox>
```

Do not assume that the terminal width is the document width. The component measures its own box after mounting. If the host already knows the exact width, pass `columns={() => width}` to make layout deterministic.

## Keep the frame fixed while content scrolls

If the document has a frame that should remain outside the scrolling content, compute layout in the host and render `MarkdownFrame` around the scrollbox:

```tsx
import {
  MarkdownFrame,
  MarkdownRenderer,
  createDocumentLayout,
  defaultTheme,
} from "opentui-markdown-render"

const theme = defaultTheme("dark")
const layout = createDocumentLayout({
  viewport: 120,
  frame: { enabled: true, width: 96, align: "center" },
  tables: { widthMode: "content", overflow: "scroll" },
})

<MarkdownFrame frame={layout.frame} theme={theme}>
  <scrollbox width="100%" flexGrow={1}>
    <MarkdownRenderer
      content={markdown}
      renderer={renderer}
      frame={{ enabled: false }}
      theme={theme}
      columns={() => layout.contentWidth}
      discoverConfig={false}
    />
  </scrollbox>
</MarkdownFrame>
```

Passing the frame directly to `MarkdownRenderer` is also valid. In that mode the frame is part of the document and scrolls with it, which is what the standalone demo does.

The example uses the **same** resolved theme for the frame and the document; otherwise their background colours could disagree. In an actual resizable host, recompute `layout` when its available width changes rather than keeping `viewport: 120` fixed.

## Handle diagnostics in the host

Configuration warnings and errors normally go to stderr. An embedding application can collect them instead:

```tsx
<MarkdownRenderer
  content={markdown}
  renderer={renderer}
  onDiagnostic={(diagnostic) => {
    diagnostics.push(`${diagnostic.level}: ${diagnostic.message}`)
  }}
/>
```

Set `discoverConfig={false}` for an embedded view when the process may run from a directory containing a standalone viewer's configuration. A supplied `config` replaces file discovery entirely.

## Next steps

- Use [Configuration](CONFIGURATION.md) to control theme and layout.
- Use [API reference](api.md) for `renderUnit`, source ranges, `StatusLine`, and the parser model.
- Use [Features](features.md) to learn the exact fallbacks for math, images, tables, and links.
- Use [Troubleshooting](troubleshooting.md) if a feature stays source text or looks different in your host than in the demo.
- Use [Architecture](architecture.md) if the renderer will be integrated into a larger TUI.
