# Kestrel

Kestrel turns a raw flight log into a readable terminal report. It parses
CommonMark, typesets the formulas, and draws the diagrams and telemetry frames
that come with the log.

## Install

```sh
bun add @kestrel/cli
```

## What it does

- **Parses CommonMark** and keeps the terminal's own block renderer, so a
  report looks native instead of foreign
- **Typesets formulas** with MiTeX and Typst, falling back to the source
- **Draws diagrams** from Mermaid blocks, from a pipeline sketch to a class
  model of the whole vehicle
- **Plays media** straight from local PNG and GIF assets, with transparency
  composited against the terminal background

### Inline formatting

Reports mix **bold text**, *emphasis*, ~~a crossed-out range~~ and `inline
code`. A cross-reference such as [the flight plan](https://github.com/anomalyco/opentui)
keeps its label. Escapes stay literal: \*not emphasis\* — and the pad costs
\$5 per kilogram, which is not a formula.

### Heading levels

A terminal has one text size, so the levels of a heading are told apart by
colour, weight and the room around them.

# Level one

## Level two

### Level three

#### Level four

##### Level five

###### Level six

### What a report contains

- The launch profile, as a frame and as a table
  - Altitude, velocity and propellant mass
  - The phases that make up the flight
- The formulas the trajectory is solved from
1. Boost phase
2. MECO and stage separation
3. Payload deployment

> A flight log is often read over SSH, on a terminal that cannot draw a single
> pixel. Kestrel never drops a formula silently: it prints the original source
> instead of a broken image.
>
> The same rule holds for diagrams and telemetry frames.

---

## Configuration

Kestrel reads `kestrel.jsonc` from the working directory and walks up until it
finds one:

```json
{
  "theme": { "mode": "auto" },
  "images": { "maxColumns": 80 }
}
```

## Reading a log

```ts
const report = await kestrel.report("KST-118")
console.log(report.flight.samples.length, report.flight.apogee)
```

## Licence

MIT. See [the project site](https://github.com/anomalyco/opentui) for the
source and the issue tracker.
