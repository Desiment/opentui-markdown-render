# All-in-One Demo

## Headings, Text & Links

### Formatting
This is *italic*, **bold**, and `inline code`.

[OpenTUI](https://github.com/sst/opentui)

### Blockquote
> A blockquote for emphasis.

### Lists
- Unordered item 1
- Unordered item 2
  - Nested item
1. Ordered one
2. Ordered two

### Thematic Break
---

## Code Block

```js
function greet(name) {
  return `Hello, ${name}!`
}
console.log(greet("world"))
```

## Tables

| Left | Center | Right |
|------|:------:|------:|
| A    | B      | C     |
| 1    | 2      | 3     |

## Math

Inline: $E = mc^2$, $x^2 + y^2 = r^2$, $\sqrt{x+1}$

Display:
$$
\int_0^\infty e^{-x}\,dx = 1
$$

Truncated (should show source): $$\frac{1}{ $$

## Mermaid

### Flowchart (multiple directions and node shapes)
```mermaid
flowchart LR
  A[Start] --> B{Decision}
  B -->|Yes| C[End]
  B -->|No| D[Retry]
```

```mermaid
flowchart TD
  A[Start] --> B((Round))
  B --> C{Decision}
  C -->|Yes| D[(Database)]
  C -->|No| E[[Subroutine]]
```

```mermaid
flowchart BT
  subgraph Group
    A --> B
  end
  B --> C
```

### Sequence Diagram
```mermaid
sequenceDiagram
  participant User
  participant Renderer
  User->>Renderer: Open example
  Renderer-->>User: Draw terminal diagram
  User->>+Renderer: Request update
  Renderer-->>-User: Updated output
```

### State Diagram (v2)
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

### Gantt Chart
```mermaid
gantt
  dateFormat s
  section Render
  Parse Markdown :0, 2
  Typeset math :active, 2, 5
  Draw media :3, 7
```

### Timeline
```mermaid
timeline
  title Renderer milestones
  section Foundation
  2026 : Markdown blocks
       : Native math
  section Media
  2026 : PNG and GIF support
       : Transparency handling
```

### Git Graph
```mermaid
gitGraph
  commit id: "baseline"
  branch media
  commit id: "images"
  checkout main
  commit id: "docs"
  merge media
```

### Class Diagram
```mermaid
classDiagram
  direction TB
  class Shape {
    <<interface>>
    +area() double
  }
  class Circle {
    +double radius
    +area() double
  }
  class Square {
    +double side
    +area() double
  }
  class Point {
    +int x
    +int y
  }
  Shape <|-- Circle : implements
  Shape <|-- Square
  Circle *-- Point : center
```

## Images

Opaque PNG:

![Opaque generated gradient](./assets/opaque.png)

Transparent PNG:

![Transparent overlapping circles](./assets/transparent.png)

Animated GIF:

![Animated GIF](./assets/pulse.gif)

Failure cases (must not load network assets or escape the example root):

![Blocked remote image](https://example.com/image.png)

![Blocked parent path](../outside.png)

![Missing image](./assets/missing.png)
