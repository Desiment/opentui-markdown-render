# Features and supported Markdown

This page describes the observable rendering contract. It is intentionally more specific than a list of “supported features”: terminal layout has different constraints from HTML, and a host should know what remains source text, what becomes a terminal primitive, and what requires graphics support.

## Markdown blocks

The parser produces an AST-lite document containing these block kinds:

| Block | Behaviour |
| --- | --- |
| Paragraph | Inline text and inline math share one layout flow. |
| Heading | Levels 1–6 use theme colours plus configurable attributes and margins; the `#` marker remains visible. |
| Quote | Nested blocks render recursively with quote styling. |
| List | Ordered, unordered, nested, loose, and task-list items are supported. |
| Table | Cells use inline layout; tables use the configured sizing and overflow policy. |
| Fenced code | Rendered with OpenTUI's code primitive. Language is retained for highlighting and diagnostics. |
| Mermaid fence | A detected supported family becomes a terminal diagram; otherwise the original fence is shown. |
| Horizontal rule | Rendered as a themed terminal rule. |
| Display math | `$$...$$` and `\[...\]` are rendered as display-style math images when possible. |
| Standalone image | A local supported image is decoded and placed in the terminal. |
| Literal | Source-oriented text retained for constructs that the terminal renderer cannot represent. |

The parser keeps raw source on every block and preserves the original document source. It does not rewrite the canonical Markdown.

## Inline content

Supported inline forms include plain text, inline code, strong emphasis, emphasis, strikethrough, links, hard and soft breaks, inline images, and math:

```markdown
Normal, **strong**, *emphasized*, ~~deleted~~, `code`,
[a link](https://example.com), and $a^2 + b^2 = c^2$.
```

Inline math supports `$...$` and `\(...\)`. Code spans and fenced code are not scanned for math delimiters. An unclosed formula remains literal text; there is no separate “open formula” event for a host to handle.

Links retain their `href` in the parsed model. When the terminal cannot render hyperlinks, the output includes the target in readable text rather than dropping it.

## Headings

Terminals do not have multiple text sizes, so heading hierarchy is expressed through colour, attributes, and vertical spacing. Each level has its own theme colour and configurable style:

- `bold`
- `italic`
- `underline`
- `dim`
- `uppercase`
- `marginTop`
- `marginBottom`

See [Configuration](CONFIGURATION.md#headings) for the JSONC shape and defaults. The heading marker remains in the output so the level is still visible when colours or attributes are unavailable.

## Math

The math pipeline is:

```text
LaTeX-style source -> MiTeX conversion -> Typst typesetting -> PNG -> OpenTUI image
```

Everything happens in-process in the native Rust addon. The renderer does not require a system LaTeX installation and does not invoke `latex`, `xelatex`, `typst`, ImageMagick, or another external process.

### Inline and display math

Inline math shares the baseline and row layout of neighbouring text. Display math uses display style, so large operators place limits above and below where appropriate. Formula raster size follows the terminal cell dimensions; there is no user-facing math scale setting.

An inline formula that has text after it on the same row may be scaled down to fit that row. If the formula ends the line, it keeps the standard text size because it does not need to share the row with following text.

The MiTeX scope includes common constructs such as `\sqrt[n]{x}`, `\dfrac`, `\tfrac`, `\text`, `\operatorname`, `\boxed`, matrix environments, cases, aligned/array environments, `\xrightarrow`, `\middle`, `\big`, `\substack`, and `\displaystyle`. Negative spacing commands such as `\!` and `\negthinspace` are supported. `\textcolor` supports the named colors black, white, red, green, blue, cyan, magenta, yellow, and gray. A formula that cannot be converted or typeset is left as its original source.

The embedded MiTeX scope is not a complete LaTeX engine. In particular, `\set` is not currently supported by the pinned MiTeX converter; use `\{x\}` for set notation instead. `alignedat` accepts its column count but does not apply TeX's precise inter-column spacing.

### Math capability fallback

OpenTUI selects the image protocol from terminal capabilities: Kitty or Sixel when available, otherwise a coarse block-character mosaic. Inline layout adapts the image footprint in `blocks` mode. Terminal pixel measurements improve raster sizing; before they arrive the rasterizer uses a default cell size and refreshes when measurements become available. A missing native prebuild, an invalid/incomplete formula, conversion failure, or image error leaves the original LaTeX source readable. There is no Unicode-math approximation layer.

## Images and GIFs

Standalone local PNG, JPEG, WebP, and GIF files are supported. GIFs are decoded frame by frame and advanced using their embedded frame delays. Transparent pixels are composited against the configured background before terminal placement.

Image loading is constrained by two rules:

1. `assetBase` defines the root directory.
2. Only local relative paths below that root are accepted.

Network URLs, absolute paths outside the asset root, and traversal such as `../secret.png` are rejected. Loading and decoding failures render a themed diagnostic label and preserve the alt text where possible. Image pixels are not recoloured by the Markdown theme.

Images can be limited in the config file:

```jsonc
{
  "images": {
    "maxColumns": 80,
    "maxRows": 32
  }
}
```

Inline images in a table cell remain text because the current `TextTableRenderable` cannot embed terminal images. Standalone images are rendered as image blocks.

The path check resolves `.` and `..` against the asset root, but it is not a `realpath`/symlink sandbox. If Markdown comes from an untrusted author, do not place symlinks to sensitive files inside the asset root; control that directory separately.

## Tables

Tables default to content sizing rather than stretching across the entire window:

```jsonc
{
  "tables": {
    "widthMode": "content",
    "overflow": "scroll",
    "columnFitter": "balanced",
    "cellPaddingX": 1
  }
}
```

`widthMode` can be `content` or `full`. `content` keeps a table close to the width of its cells; `full` restores a full-width grid. `overflow` can be `scroll` or `wrap`. In scroll mode a table wider than the document pans horizontally instead of being clipped. A horizontal wheel or drag belongs to that table; vertical scrolling remains the responsibility of the host scrollbox.

The parsed model retains left, center, and right alignment markers. The current OpenTUI table primitive retains the data but does not visually apply every alignment marker. This is a known distinction between the parser contract and the current terminal view.

An inline formula inside a table cell is displayed as its original math source, not an embedded math image. The table's text primitive cannot host inline image renderables; this does not change the behaviour of formulas outside tables.

## Frames and layout

A frame is an optional window around the document. Its outer width includes the border and padding. The content width inside the frame is the one width shared by paragraphs, tables, formulas, images, and diagrams.

```jsonc
{
  "frame": {
    "enabled": true,
    "width": 100,
    "align": "center",
    "style": "rounded",
    "paddingX": 1,
    "paddingY": 0,
    "title": "notes.md",
    "titleAlign": "center"
  }
}
```

Supported styles are `box`, `ascii`, `rounded`, `heavy`, and `double`. `ascii` uses `+`, `-`, and `|` for terminals whose box-drawing glyphs do not align. A configured width is clamped to the measured area, and a title longer than the top border is cut.

## Status line

`StatusLine` is an independent host helper. The host supplies values; the library controls field ordering, separators, emphasis, theme colours, and optional borders. Available fields are:

`title`, `mode`, `protocol`, `cell`, `mathScale`, `position`, `hint`, and `text`.

The `text` field expands a list of additional host strings. Fields without values are skipped. The `bar` style gives the row its own background and accent border; `plain` keeps it in page colours. See [Configuration](CONFIGURATION.md#statusline) and [API](api.md#statusline) for the component and formatting helpers.

## Source preservation and updates

`parseDocument` lexes the source once with Marked plus local math extensions. It keeps the original source, raw block text, math delimiters, link targets, and source ranges where the parser can prove an exact match. Newline normalization is mapped back to offsets in the original source.

Not every normalized nested token has an exact range. In those cases `source` is `null`; the renderer never invents an approximate range. The `end` offset of a `SourceRange` is exclusive: `document.source.slice(start, end)` extracts the matched source. A top-level list item's range can exclude the document's final trailing newline. Source ranges are suitable for host-owned selection and review tools, but they are not persistent IDs and do not survive arbitrary document reordering as identity keys.

Streaming updates retain unchanged prefix/suffix view slots and refresh changed content. An edited Mermaid block may retain its last-good rendering while new source is incomplete. These optimizations are view continuity, not a general-purpose AST diff or review model.

## Fallbacks and limitations

The renderer prioritizes readable output over pretending to support content it cannot represent:

- HTML is displayed literally.
- Unsupported Mermaid syntax stays a source fence, with the last valid diagram sometimes retained during an edit.
- Unsupported math stays LaTeX-style source text.
- Images outside `assetBase`, network images, and path traversal are rejected.
- Inline image content cannot be placed inside a table cell.
- The terminal has one text size; headings use colour and attributes instead of font scaling.
- Formula and image quality depends on the terminal's image protocol; the block-character fallback is coarser than Kitty or Sixel.
- Mermaid canvas output is limited to 250,000 cells, and a flowchart source line is limited to 10,000 characters.

For the exact Mermaid grammar, use the [Mermaid support matrix](MERMAID_SUPPORT.md).
