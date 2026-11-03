# Troubleshooting

Start by identifying whether the problem is in the document, the host layout, a terminal capability, configuration, or the native math addon. The focused demos under `examples/` are useful controls: if a feature works in the demo but not in the host, compare the props and container layout before changing the Markdown.

## A quick diagnostic sequence

1. Run `bun run demo:plain` to establish that text renders.
2. Run `bun run demo:math`, `bun run demo:images`, `bun run demo:tables`, or `bun run demo:mermaid` for the affected feature.
3. Check the demo status line: its `protocol` field reports OpenTUI's chosen image protocol, and `cell` shows the measured terminal cell dimensions when known.
4. Check for config warnings in stderr or attach `onDiagnostic` in an embedded host.
5. Confirm the renderer's *assigned box width* and its props (`assetBase`, `columns`, `theme`, `config`, `frame`, `tables`).
6. If math needs the native addon, check the platform and whether `prebuilds/linux-x64-gnu/opentui_markdown_render.node` exists after `bun run build:native`.

The demo status line is informational: it does not itself enable images or math.

## The demo fails to start

**Check:** run `bun --version` and install dependencies with `bun install`. The demo uses the OpenTUI Solid preload in its package scripts; launch it with `bun run demo:plain` rather than running the `.tsx` file without the preload.

**If the native build fails:** check `rustc --version` against the `rust-version` in [`native/Cargo.toml`](../native/Cargo.toml), then try `bun run build:native` separately to see the Rust error. `bun run verify` also runs the Rust test suite, but there is no need to wait for all tests while diagnosing a failed build.

**If a fixture is missing its images:** run `bun run generate:examples`. This creates/recreates `examples/assets/`; it does not create documentation screenshots in the root `assets/` directory.

## A formula shows LaTeX source instead of an image

The source fallback is intentional when the native renderer cannot return an image, a formula is incomplete or invalid, or OpenTUI rejects the resulting image. Check in this order:

1. **Platform:** the current native loader attempts to import a prebuild only on Linux x64. Other platforms do not load the addon through this path.
2. **Build artifact:** from a repository checkout, `bun run build:native` writes `prebuilds/linux-x64-gnu/opentui_markdown_render.node`. `prebuilds/` is ignored by Git, so another fresh checkout needs its own build.
3. **Syntax:** try a simple expression such as `$x^2$` in `bun run demo:math`. An unclosed delimiter or a truncated expression should remain source text instead of rendering an incorrect image.
4. **Host runtime:** use the same package, OpenTUI renderer, and native artifact that the working demo uses. `renderMath` returns `undefined` when disabled, when the addon is unavailable, or after a native failure.
5. **Image protocol:** inspect the status line. Kitty graphics gives the sharpest output; Sixel and `blocks` may render at different quality. A `blocks` protocol alone is **not** proof that the native conversion failed.

There is no user-facing `math.scale` config option. A `math` config section is reported as unknown and does not change raster size.

## Math is present but too coarse or its dimensions change

OpenTUI chooses the image protocol based on detected capabilities. `blocks` uses a coarse mosaic and scales the displayed cell footprint for legibility. Kitty or Sixel can show a finer raster. Terminal pixel resolution may arrive after the first frame; the renderer then recomputes cell dimensions and rerasterizes the formula. Changing theme also causes rerasterization because the PNG contains foreground and background colours.

If the host changes terminal size or gives the component a narrower area, compare the actual scrollbox/parent width to the explicit `columns` value. A stale `columns` accessor overrides the measured width and can make a formula appear incorrectly fitted.

## An image shows “Could not render image”

The image label includes its alt text and a reason. Common cases:

| Reason | What to check |
| --- | --- |
| `No asset base is configured` | Pass `assetBase={() => absoluteAssetRoot}` to `MarkdownRenderer`. |
| `Only local image paths are supported` | Remote URLs and URL-like sources are not accepted; copy the asset under the local root instead. |
| `Image path escapes the asset root` | The resolved path points outside `assetBase`; remove `..` traversal or change the root deliberately. |
| `Image does not exist` | Check spelling, case, working directory, and the path relative to `assetBase`; regenerate example assets if using fixtures. |
| Decode/render error | Confirm that the file contains a supported PNG, JPEG, WebP, or GIF image and that the terminal image protocol can draw it. |

Paths in Markdown are resolved against `assetBase`, **not** automatically against the Markdown file's directory. The demo passes its `examples/` directory explicitly. Inline images within a sentence are linked alt text, not standalone bitmaps; put the image in its own paragraph for bitmap output.

## A table is clipped or cannot be panned

By default tables use `{ "widthMode": "content", "overflow": "scroll" }`. A wide table pans horizontally, including by horizontal wheel or drag. Vertical wheel input remains with the host scrollbox.

If the table unexpectedly stretches, check `tables.widthMode` for `full`. If it wraps instead of scrolling, check `tables.overflow` for `wrap`. A runtime `tables` prop overrides the entire `config.tables` section rather than merging with it field by field. For example, `tables={{ overflow: "wrap" }}` intentionally resolves the remaining table settings from defaults, not from the file.

If any content reaches past the document's right edge, verify the parent box width, scrollbox padding, frame width, and any explicit `columns`. See [Frames and layout](features.md#frames-and-layout).

## A Mermaid fence remains code

A Mermaid fence is only considered for diagram rendering when the first meaningful source line identifies a supported family. Even for a detected family, an unsupported statement may keep the source fence visible. Check the [Mermaid matrix](MERMAID_SUPPORT.md) and run `bun run demo:mermaid` with a known supported example.

While editing, the view may retain the last valid diagram or a valid prefix instead of displaying the invalid version. Diagram-specific syntax errors usually cause the readable code-fence fallback; unexpected internal errors can also be delivered through `onDiagnostic`.

If a diagram is wider than its area, use horizontal dragging to pan it. The Mermaid layout width is capped by both the component's content width and `mermaid.layoutMaxWidth` (120 by default).

## Theme, frame, or table settings do not change

Inspect precedence before assuming the config loader ignored a value:

```text
theme: host Theme > themeMode prop > config.theme.mode > light
frame: frame prop > config.frame > defaults
tables: tables prop > config.tables > defaults
```

`config` replaces file discovery entirely; `discoverConfig={false}` prevents automatic discovery but an explicit `configPath` is still loaded. In the demo, opening the panel with `c` changes session state, not the JSONC file. A `theme` prop is already a resolved theme and wins over both the file and `themeMode`.

If a setting is invalid in a file, validation discards it and keeps valid siblings. Attach `onDiagnostic` or inspect stderr. Passing a ready TypeScript `config` prop skips the JSONC parser/validator, so the host must construct supported values itself.

## Source ranges are `null` or appear to change

An exact range is reported only when the parser can prove a match against the original Markdown. Nested Marked tokens (for example, blocks inside a quote) are sometimes normalized, so their ranges can be `null`. List item ranges are available for top-level lists when the source matches in sequence, but not for a nested list whose enclosing tokens are normalized.

Use `info().source` as an optional source span, not as a stable document ID. On an edit, a range may move even if a render slot survives. The host owns review annotations, selection, and any mapping of old source to new source.

## Where to report a reproducible problem

Include the smallest Markdown sample that demonstrates the behaviour, the focused demo command if one exists, host props/config overrides, Bun/OpenTUI/Solid versions, OS/architecture, terminal image protocol and cell size from the demo status line, and the exact diagnostic or fallback shown. Do not include private terminal screenshots in reports without reviewing their contents.
