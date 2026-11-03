# Kestrel (fictional sample application)

Kestrel is the night-shift console for turning a noisy flight log into a report
someone can trust. It keeps the original evidence close at hand while adding the
small amount of structure an operator needs: a readable timeline, checked
figures, and diagrams that still make sense over a slow SSH connection.

This fixture uses Kestrel as a fictional host application. The snippets below
are illustrative content for the Markdown renderer; Kestrel itself is not a
package shipped by this repository.

## Install the renderer

```sh
bun add opentui-markdown-render @opentui/core @opentui/solid solid-js
```

## Mission brief

The command-line client is designed for the hour after a launch, when the
vehicle is safe but the ground team is still comparing recorder channels. It
does four jobs without turning the report into a web page:

- **Reads CommonMark** and keeps the terminal's native rhythm, so an incident
  report is comfortable to scan beside the live console
- **Typesets equations** with MiTeX and Typst, while keeping the original source
  visible when the terminal cannot draw a formula
- **Draws Mermaid diagrams** for everything from the ingest pipeline to the
  vehicle's class model
- **Plays local media** from the mission archive, compositing transparent PNGs
  against the operator's current terminal background

### Inline formatting in an operator note

Reports mix **decisions**, *observations*, ~~superseded readings~~ and `channel
names`. A cross-reference such as [the OpenTUI project](https://github.com/anomalyco/opentui)
keeps its label when the report is read offline. Escapes stay literal:
\*not emphasis\* — and the pad's reserve charge is \$5 per kilogram, which is
not a formula.

### Heading levels in the watch book

A terminal has one text size, so hierarchy comes from colour, weight and the
space around a heading. The six levels below are intentionally useful labels,
not placeholders: the same visual language is used throughout these examples.

# Mission brief

## Vehicle profile

### Flight phases

#### Guidance notes

##### Ground-station handover

###### Archive conventions

### What a report contains

- The launch profile, as both a frame and a table
  - altitude, velocity and propellant mass
  - the phase boundaries used by the flight director
- The equations used to verify the trajectory
  - orbital energy and transfer velocity
  - a readable source fallback for unsupported math
- The evidence captured by the ground station
  - decoded telemetry channels
  - diagrams and sensor frames from the local archive

The review order follows the operation:

1. Confirm the recorder identity and time base.
2. Check boost, MECO and stage-separation transitions.
3. Recompute the insertion estimate before signing the report.

> A flight log is often read over SSH, on a terminal that cannot draw a single
> pixel. Kestrel never drops a formula silently: it prints the original source
> instead of a broken image.
>
> The same rule holds for diagrams and telemetry frames. A degraded report is
> still evidence; an empty report is not.

---

## Configuration

The standalone demo reads `opentui-markdown-render.jsonc` from the working
directory and walks upward until it finds one. The mission archive keeps the
configuration deliberately small:

```json
{
  "theme": { "mode": "dark" },
  "images": { "maxColumns": 80, "maxRows": 32 },
  "frame": { "enabled": true, "width": 96, "align": "center" }
}
```

The terminal theme is a presentation choice, not part of the flight record. A
reviewer can switch from dark to light without changing the numbers in the
report.

## Reading a log

```ts
// Application-specific loader used by the fictional host:
const report = await openFlightReport("KST-118")
console.log(report.flight.samples.length, report.flight.apogee)
```

For a first pass, the operator checks the sample count, the maximum altitude,
and the timestamp of the last valid beacon. Only then is the report attached to
the mission archive.

## Licence

MIT. See the [OpenTUI project](https://github.com/anomalyco/opentui) for the
renderer host and issue tracker.
