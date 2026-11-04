# Integration recipes

These recipes assume an OpenTUI application already has a `CliRenderer` instance. For a complete first mount, read [Getting started](getting-started.md); for exact prop types, read the [API reference](api.md).

## Render streaming Markdown

Use a Solid signal as the source of truth and pass an accessor rather than a snapshot. The renderer parses each updated string and reconciles the rendered block slots:

```tsx
import { createSignal } from "solid-js"
import { MarkdownRenderer } from "opentui-markdown-render"

const [source, setSource] = createSignal("# Response\n\n")

<MarkdownRenderer
  content={source}
  renderer={renderer}
  discoverConfig={false}
/>

// When new Markdown arrives from your own stream/event handler:
setSource((previous) => previous + "Next sentence. ")
```

Do not pass `content={() => source}` if `source` is merely a non-reactive string variable and you expect Solid to notice assignments to it. Use a signal, memo, or another accessor with reactive dependencies.

The parser does not expose an “unfinished math” boundary. While a stream contains an unclosed delimiter or incomplete formula, the view keeps that source readable; once the full formula arrives it can render normally. Mermaid can keep a last-good diagram while the user edits a previously valid block. Neither mechanism creates permanent IDs for content; retain those in the host if needed.

## Parse once in the host

When another part of the application also reads the AST, create a memoized document and give the renderer the ready-document accessor:

```tsx
import { createMemo, createSignal } from "solid-js"
import { MarkdownRenderer, parseDocument } from "opentui-markdown-render"

const [source, setSource] = createSignal("# Notes\n")
const document = createMemo(() => parseDocument(source()))

<MarkdownRenderer
  document={document}
  renderer={renderer}
  discoverConfig={false}
/>
```

`MarkdownRenderer` does not parse this input again. It still resolves theme, frame, table width, images, math, and Mermaid in its view. Pass either `content` **or** `document`, not both. A hand-built `ListItem` with no proven range must set `source: null`.

## Prevent the host's working directory from affecting a view

The component normally discovers a JSONC/JSON file while walking up from `cwd`. This is useful in a standalone viewer but can be surprising for a nested message log or panel. Supply a complete runtime config object or disable discovery:

```tsx
import type { MarkdownConfig } from "opentui-markdown-render"

const config: MarkdownConfig = {
  theme: { name: "dark" },
  tables: { widthMode: "content", overflow: "scroll" },
  frame: { enabled: false },
}

<MarkdownRenderer
  content={source}
  renderer={renderer}
  config={config}
  onDiagnostic={(diagnostic) => log(diagnostic.message)}
/>
```

`config` replaces file discovery. It is not passed through the JSONC validator: TypeScript catches many shape errors, but a runtime-built object still needs valid values. If no config object is needed at all, set `discoverConfig={false}` instead. An explicit `configPath` continues to load even when discovery is disabled.

## Let the host control theme switching

If the host only needs to switch bundled palettes, pass a live `themeMode` accessor:

```tsx
import { createSignal } from "solid-js"
import { MarkdownRenderer, type ThemeModeSetting } from "opentui-markdown-render"

const [mode, setMode] = createSignal<ThemeModeSetting>("dark")

<MarkdownRenderer
  content={source}
  renderer={renderer}
  themeMode={mode}
  discoverConfig={false}
/>

setMode("solarized-light")
```

If the host has already built a complete `Theme`, pass `theme={() => hostTheme()}` instead; that takes precedence over `themeMode` and the config file. Formula rasters and transparent image compositing depend on the active colours and update with theme changes.

## Put a status line below a scrolling document

`StatusLine` is not automatically mounted by `MarkdownRenderer`; it belongs to the host. Keep the status line outside the scrolling area and pass a value accessor. This minimal example uses a fixed bundled theme for both:

```tsx
import { MarkdownRenderer, StatusLine, defaultTheme } from "opentui-markdown-render"

const theme = defaultTheme("dark")

<box width="100%" height="100%" flexDirection="column">
  <scrollbox width="100%" flexGrow={1}>
    <MarkdownRenderer
      content={source}
      renderer={renderer}
      theme={theme}
      discoverConfig={false}
    />
  </scrollbox>
  <StatusLine
    theme={theme}
    state={() => ({ title: "notes.md", position: position() })}
    fields={["title", "position"]}
    border="top"
  />
</box>
```

The host computes `position()` from its scrollbox (or another application source). The library formats and colours the row; it does not monitor scrolling. If themes switch, keep the theme passed to `StatusLine` and `MarkdownRenderer` synchronized. The shared standalone shell in [`src/viewer/app.tsx`](../src/viewer/app.tsx), used by both the demo and `otmd`, shows theme, protocol, cell dimensions, and scroll position in its status line.

## Choose between a scrolling and fixed frame

**Frame scrolls with the document:** pass `frame={{ enabled: true, width: 96, align: "center" }}` directly to `MarkdownRenderer` inside the host scrollbox. This is the standalone demo's approach.

**Frame stays fixed:** create a `DocumentLayout` for the host viewport, mount `MarkdownFrame` around the scrollbox, and give the nested renderer `frame={{ enabled: false }}`, `columns={() => layout.contentWidth}`, and the same theme. Recompute the layout as the host width changes. The [complete fixed-frame example](getting-started.md#keep-the-frame-fixed-while-content-scrolls) includes these pieces.

Do not pass the raw `FrameConfig` object to `MarkdownFrame`; its `frame` prop expects a `ResolvedFrame` returned by `resolveFrame` or `createDocumentLayout`.

## Build selection or review overlays

The renderer exposes non-overlapping render units instead of storing annotation state. A unit is either a top-level non-list block or a whole item in a top-level list. The callback receives `info` as an accessor so its source range can update with the document:

```tsx
<MarkdownRenderer
  content={source}
  renderer={renderer}
  renderUnit={(info, rendered) => (
    <box width="100%" flexDirection="column">
      {rendered}
      {/* Host controls whether to draw an annotation UI beside this unit. */}
    </box>
  )}
/>
```

Inspect `info().kind` to access `block` or `item` and `info().source` for the exact source span when known. A `null` span is valid and must not cause the unit to disappear. Keep persistent IDs and the mapping across edits in the host; source offsets and reused view slots are not stable identity keys. See [Render units and source ranges](api.md#render-units-and-source-ranges) for the exact contract.
