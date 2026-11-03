# Telemetry reference

The Kestrel recorder is intentionally boring: every channel has a unit, a
known operating range, and a note explaining what the number means. This page
is the quick reference a flight director keeps open while comparing the live
downlink (the vehicle-to-ground radio link) with the archive from `KST-118`.

## Primary channels

| Channel | Unit | Range | Notes |
| :--- | :---: | ---: | --- |
| `alt` | m | 0 – 120000 | Barometric, sea-level corrected |
| `vel` | m/s | 0 – 780 | Inertial, air-relative estimate |
| `acc` | m/s² | −20 – 20 | Specific force; 1 g at rest |
| `temp` | °C | −80 – 60 | Tank probe, sampled at 10 Hz |
| `press` | kPa | 1 – 110 | Pressurant-vessel pressure |

The ranges are guardrails, not predictions. A value outside one of them is
preserved in the raw log, but the report marks it for review instead of quietly
folding it into a nominal average.

## Recorder modes

| Mode | Channels | Sample rate | Raw size | Use during flight |
| --- | ---: | ---: | ---: | --- |
| Full | 128 | 200 Hz | 2.4 GB/h | post-flight reconstruction |
| Flight | 32 | 50 Hz | 96 MB/h | nominal downlink and review |
| Beacon | 4 | 1 Hz | 1.2 MB/h | low-bandwidth fallback mode |

The recorder starts in `Beacon` mode before ignition, switches to `Flight` when
the vehicle clears the pad, and may return to `Beacon` if the downlink becomes
congested. The mode transition belongs in the report timeline even when every
individual sensor remains inside its range.

## Decoder status

| Value | Meaning | Operator action |
| --- | --- | --- |
| `0` | Nominal | continue the comparison |
| `1` | Sensor mismatch | recalibrate before the next flight |
| `2` | Link lost | check antenna alignment and recorder clock |
| `3` | Clock drift | compare against the ground-station pulse |

Status values are deliberately small enough to read in a narrow terminal. The
long explanation belongs here, beside the code, rather than hidden in a web
dashboard the night shift may not have access to.

## How a cell is rendered

| Field | Example | Result |
| --- | --- | --- |
| Decision | **nominal** | drawn in the accent colour |
| Source sample | `const apogee = 118000` | fixed width, no wrapping |
| Project link | [OpenTUI project](https://github.com/anomalyco/opentui) | underlined label |

The channel table stays on the terminal's own Markdown renderer, separately from
the typeset formulas in the [orbital mechanics page](math.md). Wide tables can
pan horizontally; they do not rewrite the evidence just to fit a small screen.
