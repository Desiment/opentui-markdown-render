# Telemetry frames

The frames that come with a flight log are drawn straight from disk. The
sources are rendered at 1024 pixels and wider, so they stay sharp when the
terminal scales them into a cell grid.

## Ascent profile

The ascent phase, opaque and ready for a dark background:

![Altitude profile of the ascent phase](./assets/opaque.png)

## Sensor overlap

Two sensor footprints with partial coverage, composited against the terminal
background:

![Overlapping sensor footprints](./assets/transparent.png)

## Plume spectrum

The plume spectrum across the visible band:

![Plume spectrum across the visible band](./assets/spectrum.png)

## Calibration grid

A checker grid for measuring how sharp a cell looks:

![Calibration checker grid](./assets/checker.png)

## Countdown

An animated countdown loop:

![Animated countdown loop](./assets/pulse.gif)

## Refused sources

A flight log may point at assets that must not be loaded. Kestrel refuses
remote URLs, paths that escape the log directory, and files that are not there.
It never touches the network.

![Refused remote frame](https://example.com/frame.png)

![Refused parent path](../outside.png)

![Missing frame](./assets/missing.png)
