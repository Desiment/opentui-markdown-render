# Mermaid

## Flowchart

```mermaid
flowchart LR
  Source[Raw Markdown] --> Detect{Block kind}
  Detect -->|Math| Typeset[MiTeX + Typst]
  Detect -->|Media| Decode[Image decoder]
  Typeset --> Output[OpenTUI]
  Decode --> Output
```

```mermaid
flowchart TD
  A[Rectangle] --> B((Rounded))
  B --> C{Decision}
  C -->|Yes| D[(Database)]
  C -->|No| E[[Subroutine]]
  E --> F
```

```mermaid
flowchart BT
  subgraph Layout
    A --> B
    B --> C
  end
  C --> D
```

```mermaid
graph RL
  A --- B
  B -- Link --> C
  C -.-> D
  D ==> E
```

## Sequence Diagram

```mermaid
sequenceDiagram
  participant User
  participant Renderer
  User->>Renderer: Open example
  Renderer-->>User: Draw terminal diagram
```

```mermaid
sequenceDiagram
  actor Dev
  participant CLI
  participant Renderer
  Dev->>+CLI: Run demo
  CLI->>+Renderer: Render document
  Renderer-->>-CLI: Output
  CLI-->>-Dev: Done
```

```mermaid
sequenceDiagram
  participant A
  participant B
  A--x B: Lost
  A-x B: Broken
  A->>B: Sync
  B-->>A: Async reply
```

## State Diagram (v2)

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Ready
  Ready --> [*]
```

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Processing: Start
  Processing --> Success: Complete
  Processing --> Failure: Error
  Success --> [*]
  Failure --> Idle: Retry
```

```mermaid
stateDiagram-v2
  state Fork <<fork>>
  state Join <<join>>
  [*] --> Fork
  Fork --> TaskA
  Fork --> TaskB
  TaskA --> Join
  TaskB --> Join
  Join --> Done
  Done --> [*]
```

## Gantt Chart

```mermaid
gantt
  dateFormat s
  section Render
  Parse Markdown :0, 2
  Typeset math :active, 2, 5
  Draw media :3, 7
```

```mermaid
gantt
  title Build Pipeline
  dateFormat HH:mm
  section Core
  Scan :a1, 00:00, 2h
  Inline :after a1, 3h
  section Extensions
  Mermaid :00:30, 2h
  Math :1h, 2h
```

## Timeline

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

```mermaid
timeline
  title Feature Timeline
  section Parsing
  Q1 2026 : Block detection
          : Inline runs
  section Rendering
  Q2 2026 : Terminal diagrams
          : Math output
  section Polish
  Q3 2026 : Examples and docs
```

## Git Graph

```mermaid
gitGraph
  commit id: "baseline"
  branch media
  commit id: "images"
  checkout main
  commit id: "docs"
  merge media
```

```mermaid
gitGraph
  commit
  branch feature
  checkout feature
  commit
  commit
  checkout main
  commit
  merge feature
  branch release
  commit tag: "v0.1.0"
```

## Class Diagram

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
  Shape <|-- Circle : implements
  Shape <|-- Square
```

```mermaid
classDiagram
  class Order {
    +String id
    +total() double
  }
  class Customer {
    +String name
  }
  class LineItem {
    +int quantity
  }
  Order --> Customer : places
  Order *-- LineItem : contains
```

```mermaid
classDiagram
  direction LR
  class Renderer {
    <<service>>
    +render(input) void
  }
  class Parser {
    +parse(source) Document
  }
  class Document {
    +String title
  }
  Renderer ..> Parser : uses
  Parser ..> Document : builds
```

```mermaid
classDiagram
  direction BT
  class Wallet {
    +String owner
  }
  class Payment {
    <<abstract>>
    +amount() double
  }
  class Card {
    +String last4
  }
  class Cash {
    +double tendered
  }
  Wallet "1" o-- "0..*" Payment : holds
  Payment <|-- Card
  Payment <|-- Cash
```

```mermaid
classDiagram
  class Notifier {
    <<interface>>
    +send(message) void
  }
  class Store {
    +save(key, value) void
  }
  class Logger {
    +log(line) void
  }
  Notifier <|.. Store : implements
  Store -- Logger : uses
```

Invalid class syntax falls back to the source fence:

```mermaid
classDiagram
  class Animal {
    +String name
  }
  note for Animal "Not supported"
```
