# Kestrel mission dossier

The complete KST-118 review in one page: a shift handover, a few working notes,
the calculations behind the insertion estimate, and the diagrams and frames
that make the evidence easier to audit.

## The watch console

Kestrel turns a raw flight log into a readable terminal report without hiding
the raw material. The night shift can move from a sentence to a code sample, a
table, a formula, or a sensor frame without leaving the terminal.

### A note from the flight director

Reports mix *observations*, **decisions** and `channel names`; a cross-reference
such as [the OpenTUI project](https://github.com/anomalyco/opentui) keeps its label.
The source remains readable when a terminal cannot display a formula, diagram, or image.

### The review order

> Every figure in a report has to survive being read over SSH, on a terminal
> that cannot draw a single pixel. When a frame or a formula cannot be
> rendered, the source is printed instead of a broken image.

The review proceeds in the same order as the operation:

- Flight data
  - altitude and velocity
  - propellant mass and mode changes
- Analysis
  - equations and tolerances
  - diagrams and image evidence
1. Confirm the recorder and time base.
2. Decode the state transitions.
3. Sign the report only after the evidence agrees.

---

## A small archive check

```js
// Application-specific loader used by the fictional host:
const report = await openFlightReport("KST-118")

function lastBeacon(report) {
  return report.flight.samples
    .filter((sample) => sample.channel === "beacon")
    .at(-1)
}
console.log(lastBeacon(report))
```

## Quick-look table

| Event | Time | Status |
|------|:------:|------:|
| MECO | T+63 s | nominal |
| Insertion | T+512 s | signed |

## Math

Inline: $E = mc^2$, $x^2 + y^2 = r^2$, $\sqrt{x+1}$

Display:
$$
\int_0^\infty e^{-x}\,dx = 1
$$

Display style moves the limits of a large operator above and below it, and the
scope handles the commands Typst has no direct equivalent for:
$$
\sum_{k=0}^{n} \frac{1}{2^k} = 2 - \frac{1}{2^n}, \qquad \sqrt[3]{\frac{a}{b}}
$$

Truncated, and therefore left as source: $$\frac{1}{ $$

## Mission diagrams

### From recorder to signed report

```mermaid
flowchart LR
  A[Start] --> B{Range check}
  B -->|Pass| C[End]
  B -->|Review| D[Retry]
```

```mermaid
flowchart TD
  A[Start] --> B((Round))
  B --> C{Decision}
  C -->|Pass| D[(Archive)]
  C -->|Review| E[[Ground station]]
```

```mermaid
flowchart BT
  subgraph Group
    A --> B
  end
  B --> C
```

### Ground-station handoff

```mermaid
sequenceDiagram
  participant Director
  participant Console
  Director->>Console: Open KST-118
  Console-->>Director: Show signed report
  Director->>+Console: Request fresh channel scan
  Console-->>-Director: Archive updated
```

### Vehicle states

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Ready
  Ready --> [*]
```

```mermaid
stateDiagram-v2
  state Fork <<fork>>
  [*] --> Fork
  Fork --> A
  Fork --> B
```

### The processing window

```mermaid
gantt
  dateFormat s
  section Mission review
  Decode recorder :0, 2
  Check trajectory :active, 2, 5
  Sign report :3, 7
```

### Milestones

```mermaid
timeline
  title Kestrel milestones
  section Foundation
  2026 : First flight report
       : Native trajectory checks
  section Media
  2026 : Ground-station frames
       : Transparent handover map
```

### Release history

```mermaid
gitGraph
  commit id: "baseline"
  branch media
  commit id: "images"
  checkout main
  commit id: "docs"
  merge media
```

### The vehicle model

```mermaid
classDiagram
  direction TB
  class VehicleComponent {
    <<interface>>
    +health() string
  }
  class Guidance {
    +double bias
    +health() string
  }
  class Propulsion {
    +double propellant
    +health() string
  }
  class Sensor {
    +int channel
    +health() string
  }
  VehicleComponent <|-- Guidance : implements
  VehicleComponent <|-- Propulsion
  Guidance *-- Sensor : observes
```

## Telemetry frames

The opaque ascent profile stays readable against the dark console:

![Altitude profile of the ascent phase](./assets/opaque.png)

The transparent overlap marks the ground-station handover:

![Overlapping sensor footprints](./assets/transparent.png)

The countdown loop is retained as a timed asset:

![Animated countdown loop](./assets/pulse.gif)

These sources must not load: they point to the network, escape the archive, or
refer to an asset that was never recorded:

![Refused remote frame](https://example.com/frame.png)

![Refused parent path](../outside.png)

![Missing frame](./assets/missing.png)
