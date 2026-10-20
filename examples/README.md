# Renderer Examples

Each fixture is intentionally independent so a rendering regression has a
small, obvious reproduction case.

| Fixture | Command | Coverage |
| --- | --- | --- |
| `plain.md` | `bun run demo:plain` | headings, formatting, lists, quotes, rules, code |
| `tables.md` | `bun run demo:tables` | table alignment and inline formatting |
| `mermaid.md` | `bun run demo:mermaid` | flowchart, sequence, state, Gantt, timeline, Git graph, class, invalid fallback |
| `class-diag.md` | `bun run demo:class-diag` | 30 large class diagrams: hierarchy, fan-out, every relationship kind, directions, multiplicities, corridors, cycles, quoted names |
| `math.md` | `bun run demo:math` | all math delimiters and source-preserving fallbacks |
| `images.md` | `bun run demo:images` | opaque, transparent, animated, missing, remote, and traversal media |
| `rendered.md` | `bun run demo:mixed` | all rendering paths in one document |
| `all.md` | `bun run demo:all` | headings, code, tables, math, Mermaid, and image/GIF media |

Run `bun run generate:examples` before the image, mixed, or all examples. Math needs a
Kitty-compatible terminal with reported pixel dimensions; source LaTeX is the
expected fallback otherwise.

The demo app shows a status line at the bottom with the file name, theme mode,
graphics protocol, cell pixel size, math scale, scroll position, and the key
hints. It toggles the theme with `t`, resizes display math with `+`/`-`, and
quits with `q`.

`opentui-markdown-render.jsonc` in this directory is picked up automatically by
the config discovery and configures the status line.
