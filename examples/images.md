# Telemetry frames

The image archive for KST-118 is small enough to carry with the text report.
Each frame is decoded from disk, scaled for the terminal, and labelled with the
observation it supports. The static sources are rendered at 1024 pixels and
wider, so they stay sharp when the terminal scales them into a cell grid.

## Ascent profile

The ascent profile shows the expected climb through the first-stage burn. It is
opaque by design, so the grid remains legible against a dark operator theme:

![Altitude profile of the ascent phase](./assets/opaque.png)

## Sensor overlap

Two ground-station footprints overlap during the handover from the coastal dish
to the inland relay. Transparency matters here: the overlap illustrates shared
coverage, rather than a second opaque rectangle painted over the first one.

![Overlapping sensor footprints](./assets/transparent.png)

## Plume spectrum

The plume spectrum is a compact spectrum-style fixture. The colours are part
of the source image and are not recoloured by the Markdown theme.

![Plume spectrum across the visible band](./assets/spectrum.png)

## Calibration grid

Before a flight, the calibration grid gives the operator a quick way to compare
terminal cell sharpness across Kitty, Sixel and block-character output.

![Calibration checker grid](./assets/checker.png)

## Countdown

The animated loop is the kind of small status asset that appears in a live
briefing. Its embedded frame delays are respected instead of being replaced by
a fixed refresh rate.

![Animated countdown loop](./assets/pulse.gif)

## Refused sources

A flight log may point at assets that must not be loaded. Kestrel refuses remote
URLs, paths that escape the log directory, and files that are not there. It
never touches the network and keeps the alt text so the report still explains
what the missing evidence was supposed to show.

![Refused remote frame](https://example.com/frame.png)

![Refused parent path](../outside.png)

![Missing frame](./assets/missing.png)
