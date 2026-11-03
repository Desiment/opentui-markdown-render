# Architecture

`opentui-markdown-render` is split into a renderer-free core, OpenTUI/Solid orchestration, terminal views, and specialised pipelines for math, media, and Mermaid. This separation lets a host choose where parsing and layout happen without forcing the host to adopt the standalone viewer's scrolling or status line.

## Layers

| Layer | Main code | Responsibility |
| --- | --- | --- |
| Pure core | `src/core/parse.ts`, `src/core/document.ts`, `src/core/{frame,layout,tables,image,math}.ts` | Parse Markdown into an AST-lite document, preserve source information, and resolve pure layout policies. It does not import OpenTUI or Solid. |
| Configuration and orchestration | `src/config/*`, `src/app.tsx` | Discover/validate config, resolve theme and layout, measure the assigned width, and choose `content` versus ready `document`. |
| Document view | `src/view/document.tsx`, `src/view/inline-*`, `src/view/document-table.tsx` | Render blocks recursively, lay out text and inline math together, and map document nodes to OpenTUI primitives. |
| Specialised renderers | `src/math/*`, `native/*`, `src/media.tsx`, `src/merman/*` | Rasterize math, decode local images/GIFs, parse Mermaid, and prepare terminal drawing grids. |
| Standalone host | `examples/app.tsx` | Own the `CliRenderer`, file loading, scrollbox, demo controls, config panel, and status values. |

The `opentui-markdown-render/core` entry point exports the parser, document model, frame/layout/table helpers, and other renderer-free utilities. The package root exports those pieces plus the OpenTUI/Solid view and host helpers.

## Data flow

```text
host
  -> MarkdownRenderer(content | document, config, theme, width)
  -> resolve config/theme/frame/table policy
  -> parseDocument(content)  [only for content input]
  -> DocumentView(Document, layout, theme)
  -> text / code / table / image / Mermaid / math OpenTUI primitives
```

The component measures its own assigned box. The terminal width is only the initial fallback before the box has been measured. A positive `columns` prop overrides measurement and is useful when the host has already resolved layout.

## Parsing boundary

`parseDocument` performs one Marked lexing pass with local extensions for `$...$`, `$$...$$`, `\(...\)`, and `\[...\]`. It creates the AST-lite model in `src/core/document.ts` rather than forwarding Marked tokens directly into the view.

The model preserves:

- `Document.source`;
- raw source text on blocks;
- link destinations and titles;
- original math delimiters;
- exact `SourceRange` values where token text matches the original source;
- task-list state and list structure.

Normalized nested tokens can have `source: null`. This is deliberate: a false exact range is worse than an unknown range for selection and review tools. Newline normalization is mapped back to offsets in the original source.

## Layout boundary

The document is laid out against the content width, not the full terminal width. `createDocumentLayout` resolves:

- viewport width;
- frame outer width, alignment, title, and insets;
- the single content width shared by every block;
- table sizing, fitter, padding, and overflow policy.

The same resolved content width is passed to paragraphs, tables, formulas, images, and diagrams. This prevents each renderer from inventing a different right edge.

`resolveConfiguredLayout` combines config-file values with runtime frame/table overrides. It is pure, so hosts can use it before mounting a component and can recompute it on resize.

## View boundary

`DocumentView` maps block kinds to dedicated views:

- paragraphs and headings use the shared inline layout;
- quotes and lists recurse through blocks;
- code uses OpenTUI's code primitive;
- tables use a custom `TextTableRenderable` and horizontal scroller;
- Mermaid sources are prepared by `src/merman/diagram.ts` and displayed by the Mermaid view;
- display math uses the native math pipeline;
- standalone images use the local media resolver and terminal image primitive.

The inline flow keeps ordinary text and inline math in one layout pass. The formula may become a terminal image, but it still participates in the surrounding row and width calculation.

## Math pipeline

```text
inline/display source
  -> math cache key (source, mode, colour, background, cell size, options)
  -> native N-API addon
  -> MiTeX conversion
  -> Typst typesetting
  -> in-memory PNG
  -> OpenTUI image
```

The cell pixel dimensions are part of the raster resource key because a formula rasterized for one terminal cell size cannot be reused safely at another size. The terminal image protocol changes the displayed cell footprint (not the raster itself); in `blocks` mode the layout scales the image box for legibility. Theme changes cause rerasterization because math pixels contain foreground and background colours.

The native addon is in-process Rust. It does not spawn system tools. OpenTUI chooses Kitty, Sixel, or block-character image output according to terminal capabilities. A missing native build, an unrenderable formula, or an image error leaves readable formula source.

## Media boundary

`assetBase` is a security and ownership boundary. The resolver accepts only local paths below that root; URL schemes and traversal outside it are rejected before decoding. `src/media.tsx` identifies image formats, scales them to terminal dimensions, composites transparency against the theme background, and schedules GIF frames using their embedded delays.

Image limits are resolved from config. The Markdown theme colours the loading/error labels and alt text, not the pixels of a successfully decoded image.

## Mermaid boundary

Mermaid is implemented as a vendored terminal-oriented engine under `src/merman`. Detection first identifies one of the supported families. The family parser then builds a diagram model, layout calculates terminal coordinates, and drawing writes a bounded cell grid.

The engine intentionally does not implement the full Mermaid grammar or browser SVG/CSS semantics. The terminal theme wins over Mermaid CSS styling in supported cases. Unsupported statements produce a syntax error and the view falls back to a source fence; during editing, a last-good diagram may remain visible.

See [Mermaid support](MERMAID_SUPPORT.md) for the family-by-family contract.

## Streaming and identity

The view retains unchanged prefix/suffix slots and can keep the identity of an edited block when the update is unambiguous. A changed AST field or source range updates the existing slot. Mermaid views can keep their last-good state while input is temporarily invalid.

These are rendering optimizations, not stable document IDs. Hosts that need selections, comments, review annotations, or persistent identity must use `renderUnit`, source ranges, and host-owned keys.

## Host responsibility

The host owns:

- the `CliRenderer` lifecycle;
- the document source or ready document;
- the scrollbox and vertical scroll position;
- the measured/inset layout when it knows more than the component;
- the asset root;
- persistent interaction state such as selection and comments;
- status-line values.

The renderer owns:

- parsing when `content` is supplied;
- config validation and theme/layout resolution;
- block and inline rendering;
- local media validation and decoding;
- math and Mermaid fallback decisions;
- the visual layout of its own content.

`StatusLine` is intentionally separate from document parsing. A host can use it, replace it, or omit it.
