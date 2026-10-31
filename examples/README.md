# Renderer Examples

The examples are the documentation pages of a fictional terminal tool, so the
renderer is exercised with content that reads like a real report. Each fixture
still isolates one area, so a rendering regression has a small, obvious
reproduction case.

| Fixture | Command | Content |
| --- | --- | --- |
| `plain.md` | `bun run demo:plain` | the project README: headings of every level, formatting, lists, a quote, a rule, TypeScript and JSON blocks |
| `tables.md` | `bun run demo:tables` | the telemetry reference: channel, recorder and decoding tables with left, center and right alignment |
| `math.md` | `bun run demo:math` | orbital mechanics: inline, parenthesised and display formulas, the display style, the MiTeX scope commands, plus the source fallbacks |
| `images.md` | `bun run demo:images` | telemetry frames: five high resolution assets and the three sources that must be refused |
| `rendered.md` | `bun run demo:mixed` | one flight summary that mixes prose, a table, a formula, a diagram and a frame |
| `frame.md` | `bun run demo:frame` | the viewer window: frame alignment, left-aligned text, and a wide table that pans sideways |
| `mermaid.md` | `bun run demo:mermaid` | the architecture reference: every diagram kind, plus the class diagram stress cases |
| `all.md` | `bun run demo:all` | the documentation index: every rendering path in one document |

Run `bun run generate:examples` before the image, mixed, or all examples. Math needs a
Kitty-compatible terminal with reported pixel dimensions; source LaTeX is the
expected fallback otherwise.

The demo app shows an informational status line at the bottom with the file
name, theme mode, graphics protocol, cell pixel size, and scroll position.
Press `c` to open the configuration panel: Up/Down selects a setting,
Left/Right changes it, and `c` or Esc closes the panel. The panel offers
light/dark theme, frame, and table settings. Changes take effect immediately
and are not saved to JSONC. Press `q` to request exit, then Enter or `y` to confirm
or `n`/Esc to stay. `Ctrl+C` exits immediately; closing the configuration
panel does not require confirmation.

`opentui-markdown-render.jsonc` in this directory is picked up automatically by
the config discovery and configures the status line: the `bar` style paints it
as its own strip with an accent border and highlights the file name. The same
file configures the heading levels, so the fixture shows the hierarchy the
bundled styles produce. It also turns on the document frame (a 100-column
window, centered, with rounded corners) and keeps tables content-sized and
pannable, so every demo exercises the width the frame leaves to the document.
