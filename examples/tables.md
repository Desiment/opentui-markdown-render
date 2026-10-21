# Telemetry reference

Every channel Kestrel can decode, the unit it is reported in, and the range the
recorder guarantees over a flight.

| Channel | Unit | Range | Notes |
| :--- | :---: | ---: | :--- |
| `alt` | m | 0 – 12000 | Barometric, sea level corrected |
| `vel` | m/s | 0 – 780 | Inertial, air relative |
| `acc` | m/s² | −20 – 20 | Specific force, 1 g at rest |
| `temp` | °C | −80 – 60 | Probe, sampled at 10 Hz |
| `press` | kPa | 1 – 110 | Vessel pressure |

## Recorder modes

| Mode | Channels | Sample rate | Raw size |
| --- | --- | --- | --- |
| Full | 128 | 200 Hz | 2.4 GB/h |
| Flight | 32 | 50 Hz | 96 MB/h |
| Beacon | 4 | 1 Hz | 1.2 MB/h |

## Decoding

| Value | Meaning | Action |
| --- | --- | --- |
| `0` | Nominal | — |
| `1` | Sensor mismatch | Recalibrate before the next flight |
| `2` | Link lost | Check the antenna and the recorder clock |

## How a cell is rendered

| Field | Example | Result |
| --- | --- | --- |
| Emphasis | **bold** | drawn in the accent colour |
| Source | `const x = 1` | fixed width, no wrapping |
| Reference | [OpenTUI](https://github.com/anomalyco/opentui) | underlined label |

The channel table stays on the terminal's own Markdown renderer, separately from
the typeset formulas in the [orbital mechanics page](math.md).
