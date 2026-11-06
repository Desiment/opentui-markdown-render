# Renderer Examples

The examples form a small mission-control archive for the fictional Kestrel
flight console. The prose is written as material an operator might actually
read: a watch-book page, a telemetry reference, a trajectory note, and a signed
flight summary. Each fixture still isolates one area, so a rendering regression
has a small, obvious reproduction case.

Kestrel and the KST-118 mission are fictional. The operational language is only
the scenario used to make the renderer fixtures readable; it is not a separate
CLI or flight-control product. Code and configuration snippets in the fixtures
are illustrative unless they are explicitly described as demo commands.

| Fixture | Command | Content |
| --- | --- | --- |
| `plain.md` | `bun run demo:plain` | the Kestrel watch book: mission brief, formatting, lists, fallback policy, TypeScript and JSON blocks |
| `tables.md` | `bun run demo:tables` | the telemetry handbook: channel ranges, recorder modes, decoder statuses and alignment |
| `math.md` | `bun run demo:math` | the KST-118 trajectory note: inline/display formulas, orbital checks, renderer-specific math constructs and source fallbacks |
| `images.md` | `bun run demo:images` | the flight image archive: ascent, coverage, plume and calibration frames plus refused sources |
| `rendered.md` | `bun run demo:mixed` | the signed flight summary: timeline, evidence path, trajectory equation and handover frame |
| `frame.md` | `bun run demo:frame` | the operator window: alignment rules, a wide ground-station table and consistent list alignment |
| `mermaid.md` | `bun run demo:mermaid` | the mission architecture reference: every diagram family in a ground-operations scenario |
| `merman-ext.md` | `bun run demo:merman-ext` | the KST-118 diagram archive: 35 vehicle models plus 60 operational edge cases |
| `all.md` | `bun run demo:all` | the complete mission dossier: every rendering path in one report |

Run `bun run generate:examples` before the image, mixed, or all examples. Kitty
graphics gives the sharpest math and image output; OpenTUI also supports Sixel
or block-character rendering depending on terminal capabilities. A missing
native math addon or invalid formula keeps the original LaTeX source readable.

The shared demo/CLI viewer shows an informational status line at the bottom with the file
name, theme mode, graphics protocol, cell pixel size, and scroll position.
Press `c` to open the configuration panel: Up/Down selects a setting,
Left/Right changes it, and `c` or Esc closes the panel. The panel offers
the shipped light theme and any themes installed in the user's XDG theme directory,
along with Mermaid class layout, frame, and table settings. Changes take effect immediately
and are not saved to JSONC. Press `q` to request exit, then Enter or `y` to confirm
or `n`/Esc to stay. `Ctrl+C` exits immediately; closing the configuration
panel does not require confirmation. The installed `otmd` command uses the same
viewer controls; only file and configuration discovery differ between entrypoints.
Mouse selection copies on release when the host or terminal clipboard supports it.

`opentui-markdown-render.jsonc` in this directory is picked up automatically by
the config discovery and configures the status line: the `bar` style paints it
as its own strip with an accent border and highlights the file name. The same
file configures the heading levels, so the fixture shows the hierarchy the
bundled styles produce. It also turns on the document frame (a 100-column
window, centered, with rounded corners) and keeps tables content-sized and
horizontally scrollable, so every demo exercises the width the frame leaves to
the document.
