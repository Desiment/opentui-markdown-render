# Development

This page is for contributors and maintainers. It explains how to verify changes, how the fixtures are organized, and what to check when changing parsing, terminal layout, native math, media, or Mermaid.

## Local setup

```sh
bun install
bun run generate:examples
bun run build:native
```

The project uses Bun for TypeScript execution and tests, Solid for the view layer, OpenTUI for terminal primitives, and Rust/N-API for the native math addon. The current native release target is Linux x64 glibc.

The generated files in `native/target` and installed packages in `node_modules` are ignored. Do not commit build output or generated local logs.

## Verification

Run the full check before submitting a change:

```sh
bun run verify
```

This runs:

1. `bun run build:native`;
2. `bun run typecheck`;
3. the Bun test suite with the OpenTUI Solid preload;
4. `cargo test --manifest-path native/Cargo.toml`.

Individual commands are useful while iterating:

```sh
bun run typecheck
bun test --preload @opentui/solid/preload --timeout 30000
cargo test --manifest-path native/Cargo.toml
```

## Test layout

Tests are grouped by contract rather than by implementation file:

- `parse.*` and `document.source.test.ts` cover Markdown structure, math delimiters, and source ranges;
- `layout.test.ts`, `frame.test.ts`, and `tables.test.ts` cover pure geometry and policies;
- `config.*` and `theme.test.ts` cover discovery, validation, precedence, and colour resolution;
- `document.render.test.tsx`, `inline*.test.tsx`, `frame.render.test.tsx`, and table/status-line render tests cover OpenTUI output;
- `mermaid-*`, `merman-*`, and diagram tests cover detection, parsing, layout, drawing, and fallback;
- `native.test.ts` and `math.test.ts` cover the native math boundary and cache behaviour;
- `unified-examples.render.test.tsx` and parity/theme tests ensure fixtures render through the production path.

When a bug is about a public behaviour, prefer adding a focused test at the boundary where the behaviour is observed. A parser-only bug should not need a terminal render test unless the rendered contract is also changing.

## Example fixtures

The files under `examples/` are executable documentation. Each fixture isolates one area so a regression has a small reproduction:

| Fixture | Command | Focus |
| --- | --- | --- |
| `plain.md` | `bun run demo:plain` | Headings, formatting, lists, quote, rule, code |
| `tables.md` | `bun run demo:tables` | Content sizing, alignment data, and overflow |
| `math.md` | `bun run demo:math` | Inline/display formulas and source fallbacks |
| `images.md` | `bun run demo:images` | Local PNG/GIF fixtures, transparency, and rejected paths; the renderer additionally accepts JPEG/WebP files |
| `rendered.md` | `bun run demo:mixed` | A realistic mixed document |
| `frame.md` | `bun run demo:frame` | Frame geometry and a wide pannable table |
| `mermaid.md` | `bun run demo:mermaid` | Diagram families |
| `merman-ext.md` | `bun run demo:merman-ext` | Mermaid edge cases and stress coverage |
| `all.md` | `bun run demo:all` | Full rendering inventory |

Run `bun run generate:examples` before image, mixed, or all fixtures if the generated assets are missing.

## Adding a feature

1. Define or confirm the observable contract. Decide what happens on unsupported terminals and invalid input before writing the view.
2. Add or update the core model/parser if the feature changes document structure.
3. Keep pure geometry and policy in `src/core` where possible.
4. Add the view only after the model and fallback are clear.
5. Add a focused unit test and a render test when terminal output matters.
6. Add or update an example fixture if the feature is user-visible.
7. Update [Features](features.md), [Configuration](CONFIGURATION.md), [API](api.md), or [Mermaid support](MERMAID_SUPPORT.md) as appropriate.
8. Run `bun run verify` and manually inspect the focused demo in a Kitty-compatible terminal when graphics are involved.

## Native math changes

The native addon embeds MiTeX, Typst, fonts, and PNG rasterization. When changing it:

- keep the JavaScript/native request and response shapes in sync;
- include source, display mode, colour, background, cell size, and relevant options in cache identity when output depends on them;
- preserve source fallback when conversion, typesetting, or graphics capability fails;
- run both `bun run build:native` and the Rust tests;
- check that the result works at more than one terminal cell size.

The addon is not a system-tool wrapper. Do not add a requirement for a user-installed TeX or Typst executable without explicitly changing the product contract and setup documentation.

## Config changes

Configuration is soft-validated. A new option should specify:

- its TypeScript type and valid values;
- its default;
- whether it is file-only, runtime-only, or both;
- precedence relative to host props and defaults;
- the diagnostic produced for an invalid value;
- a fixture or test proving the option affects the view.

Keep user-facing supported options separate from speculative or future configuration ideas. Internal implementation constants are not automatically configuration settings.

## Mermaid changes

Mermaid support is a subset contract. Add syntax to the family parser, then update:

- detection or parser tests;
- layout and drawing tests if geometry changes;
- the support matrix's rendered/ignored/unsupported columns;
- the relevant example fixture;
- fallback tests for malformed or unsupported input.

Avoid describing a parser directive as supported merely because it is accepted. If it has no visual or semantic effect, document it as ignored or approximated.

## Documentation media

Future captures belong in the repository-root `assets/` directory and should come from the actual demo rather than a browser mock. Create the directory when adding the first capture; it does not need its own README. `examples/assets/` holds source images *rendered by* the examples, not documentation screenshots. The README deliberately does not embed files that have not yet been produced. Before adding captures:

1. run the matching demo after generating assets and building native math;
2. use a Kitty-compatible terminal for high-quality image and math captures;
3. include the terminal size or crop consistently across captures;
4. keep text large enough to read in the GitHub preview;
5. use descriptive alt text and explain what interaction the GIF demonstrates;
6. replace the visible README placeholder only after the captures are committed and decide where to store them at that point.

Do not link to a local absolute path or an uncommitted external capture.

## Release checklist

- `bun run verify` passes;
- public exports and README examples compile against the current API;
- all documentation links resolve;
- config examples contain only supported options;
- Mermaid support claims match tests and the matrix;
- native fallback behaviour is documented;
- generated assets are present when examples require them;
- media has descriptive alt text and no sensitive terminal content;
- `NOTICE` is updated if bundled third-party components change.
