import { describe, expect, test } from "bun:test"
import { MermaidSyntaxError } from "../src/merman"
import { renderClassDiagram } from "../src/merman/class/diagram"
import { createClassDiagramLayout } from "../src/merman/class/drawing"
import { layoutClassDiagram } from "../src/merman/class/layout"
import { isMermaidClassDiagram, parseMermaidClassDiagram } from "../src/merman/class/parser"
import { measureMermaidDiagram } from "../src/merman/diagram"

describe("class diagram detection", () => {
  test("matches the header with and without an inline direction", () => {
    expect(isMermaidClassDiagram("classDiagram")).toBe(true)
    expect(isMermaidClassDiagram("classDiagram TB")).toBe(true)
    expect(isMermaidClassDiagram("classDiagram LR")).toBe(true)
    expect(isMermaidClassDiagram("\n  classDiagram BT\n  A <|-- B")).toBe(true)
    expect(isMermaidClassDiagram("classDiagramX")).toBe(false)
    expect(isMermaidClassDiagram("flowchart LR\n  A --> B")).toBe(false)
  })
})

describe("class diagram parser", () => {
  test("collects classes, members, and stereotypes", () => {
    const diagram = parseMermaidClassDiagram(
      [
        "classDiagram",
        "  class Shape {",
        "    <<interface>>",
        "    +area() double",
        "  }",
        "  Shape : +String name",
        "  <<service>> Registry",
      ].join("\n"),
    )

    const shape = diagram.classes.find((entry) => entry.id === "Shape")!
    expect(shape.stereotype).toBe("interface")
    expect(shape.members).toEqual([
      { text: "+area() double", method: true },
      { text: "+String name", method: false },
    ])

    const registry = diagram.classes.find((entry) => entry.id === "Registry")!
    expect(registry.stereotype).toBe("service")

    expect(diagram.classes.map((entry) => entry.id)).toContain("Shape")
  })

  test("distinguishes methods from attributes", () => {
    const diagram = parseMermaidClassDiagram(["classDiagram", "  class Point {", "    +int x", "    +move(dx): void", "  }"].join("\n"))
    const point = diagram.classes[0]!
    expect(point.members).toEqual([
      { text: "+int x", method: false },
      { text: "+move(dx): void", method: true },
    ])
  })

  test("maps every relationship operator to its kind and head", () => {
    const diagram = parseMermaidClassDiagram(
      [
        "classDiagram",
        "  A <|-- B",
        "  A *-- C",
        "  A o-- D",
        "  A --> E",
        "  A ..> F",
        "  A <|.. G",
        "  A -- H",
        "  A --|> I",
        "  A --* J",
        "  A --o K",
        "  A <-- L",
        "  A <.. M",
        "  A ..|> N",
      ].join("\n"),
    )

    expect(diagram.relationships.map((relation) => relation.kind)).toEqual([
      "inheritance",
      "composition",
      "aggregation",
      "association",
      "dependency",
      "realization",
      "link",
      "inheritance",
      "composition",
      "aggregation",
      "association",
      "dependency",
      "realization",
    ])
    expect(diagram.relationships.map((relation) => relation.headAt)).toEqual([
      "from",
      "from",
      "from",
      "to",
      "to",
      "from",
      "none",
      "to",
      "to",
      "to",
      "from",
      "from",
      "to",
    ])
    expect(diagram.relationships.filter((relation) => relation.dashed).map((relation) => relation.kind)).toEqual([
      "dependency",
      "realization",
      "dependency",
      "realization",
    ])
  })

  test("does not confuse operator text inside quoted cardinalities", () => {
    const diagram = parseMermaidClassDiagram(['classDiagram', '  A "0..*" --> "1..*" B : uses'].join("\n"))
    const relation = diagram.relationships[0]!
    expect(relation.from).toBe("A")
    expect(relation.to).toBe("B")
    expect(relation.kind).toBe("association")
    expect(relation.fromCardinality).toBe("0..*")
    expect(relation.toCardinality).toBe("1..*")
    expect(relation.label).toBe("uses")
  })

  test("keeps labels and multiplicities", () => {
    const diagram = parseMermaidClassDiagram(["classDiagram", '  Square "1" --> "4" Point : uses'].join("\n"))
    const relation = diagram.relationships[0]!
    expect(relation.from).toBe("Square")
    expect(relation.to).toBe("Point")
    expect(relation.label).toBe("uses")
    expect(relation.fromCardinality).toBe("1")
    expect(relation.toCardinality).toBe("4")
  })

  test("reads the direction from the header and from a direction line", () => {
    expect(parseMermaidClassDiagram("classDiagram LR\n  A --> B").direction).toBe("LR")
    expect(parseMermaidClassDiagram("classDiagram\n  direction BT\n  A --> B").direction).toBe("BT")
    expect(parseMermaidClassDiagram("classDiagram\n  A --> B").direction).toBe("TB")
  })
})

describe("class diagram rendering", () => {
  const model = [
    "classDiagram",
    "  class Shape {",
    "    <<interface>>",
    "    +area() double",
    "  }",
    "  class Circle {",
    "    +double radius",
    "    +area() double",
    "  }",
    "  Shape <|-- Circle : extends",
  ].join("\n")

  test("draws class names, stereotypes, and members", () => {
    const output = renderClassDiagram(model)
    expect(output).toContain("Shape")
    expect(output).toContain("«interface»")
    expect(output).toContain("+area() double")
    expect(output).toContain("Circle")
    expect(output).toContain("extends")
  })

  test("renders a diagram for every direction", () => {
    for (const direction of ["TB", "BT", "LR", "RL"] as const) {
      const output = renderClassDiagram(`classDiagram\n  direction ${direction}\n  A <|-- B\n  B --> C\n`)
      expect(output).toContain("A")
      expect(output).toContain("B")
      expect(output).toContain("C")
      expect(output.split("\n").length).toBeGreaterThan(2)
    }
  })

  test("keeps a vertical connector for the deepest parallel lane", () => {
    const source = [
      "classDiagram",
      ...Array.from({ length: 8 }, (_, index) => `  A <|-- B${index}`),
    ].join("\n")
    const layout = layoutClassDiagram(parseMermaidClassDiagram(source), "TB")
    expect(layout.edges).toHaveLength(8)
    // Siblings share a horizontal bus instead of occupying eight separate rows.
    expect(new Set(layout.edges.map((edge) => edge.path[1]!.y)).size).toBe(1)
    for (const edge of layout.edges) {
      const last = edge.path[edge.path.length - 1]!
      const previous = edge.path[edge.path.length - 2]!
      // Each edge must reach its child through a non-empty vertical drop.
      expect(Math.abs(last.x - previous.x)).toBe(0)
      expect(Math.abs(last.y - previous.y)).toBeGreaterThan(0)
    }
  })

  test("long back edges do not expand every rank gap", () => {
    const source = [
      "classDiagram", "  A <|-- B", "  B <|-- C", "  C <|-- D",
      "  D --> A", "  D --> B", "  C --> A",
    ].join("\n")
    const layout = layoutClassDiagram(parseMermaidClassDiagram(source), "TB")
    const boxes = new Map(layout.boxes.map((box) => [box.definition.id, box.bounds]))
    for (const [parent, child] of [["A", "B"], ["B", "C"], ["C", "D"]]) {
      const upper = boxes.get(parent)!
      const lower = boxes.get(child)!
      expect(lower.top - (upper.top + upper.height)).toBe(4)
    }
    for (const edge of layout.edges.filter((entry) => entry.fromId === "D")) {
      // Back edges leave via an offset port and travel outside the node column.
      expect(edge.path[0]!.x).not.toBe(edge.from.centerX)
      expect(edge.path.some((point) => point.x < boxes.get("A")!.left || point.x > boxes.get("A")!.left + boxes.get("A")!.width)).toBe(true)
    }
  })

  test("keeps horizontal crossings continuous without X markers", () => {
    const output = renderClassDiagram("classDiagram\n A --> B\n B --> C\n C --> A\n A --> C")
    expect(output).toContain("└────┐│")
    expect(output).not.toContain("╳")
  })

  test("preserves open association arrows and hollow inheritance heads", () => {
    expect(renderClassDiagram("classDiagram\n A --> B")).toContain("↓")
    expect(renderClassDiagram("classDiagram\n A <|-- B")).toContain("△")
  })

  test("folds a wide horizontal diagram to vertical when capped", () => {
    const source = ["classDiagram", "  direction LR", "  A --> B", "  B --> C", "  C --> D"].join("\n")
    const wide = renderClassDiagram(source, { layoutMaxWidth: 1000 })
    const folded = renderClassDiagram(source, { layoutMaxWidth: 24 })
    const width = (text: string) => Math.max(...text.split("\n").map((line) => line.length))
    expect(width(folded)).toBeLessThan(width(wide))
  })

  test("selects Dagre without changing the builtin default", () => {
    const source = "classDiagram\n A --> B\n A --> C\n B ..> D : uses\n C --> D"
    const diagram = parseMermaidClassDiagram(source)
    expect(renderClassDiagram(source)).toBe(renderClassDiagram(source, { classLayout: "builtin" }))
    const dagre = createClassDiagramLayout(diagram, { classLayout: "dagre" })
    expect(dagre.boxes).toHaveLength(4)
    expect(dagre.edges).toHaveLength(4)
    expect(dagre.edges[2]?.relationship.dashed).toBe(true)
    for (const edge of dagre.edges) {
      for (let index = 1; index < edge.path.length; index++) {
        const from = edge.path[index - 1]!
        const to = edge.path[index]!
        expect(from.x === to.x || from.y === to.y).toBe(true)
      }
    }
    const output = renderClassDiagram(source, { classLayout: "dagre" })
    for (const label of ["A", "B", "C", "D", "uses"]) expect(output).toContain(label)
    expect(measureMermaidDiagram(source, { classLayout: "dagre" })?.kind).toBe("classDiagram")
  })

  test("Dagre renders cycles, self loops and all four directions", () => {
    for (const direction of ["TB", "BT", "LR", "RL"] as const) {
      const source = `classDiagram\n direction ${direction}\n A --> A : retry\n A --> B\n B --> C\n C --> A`
      const loop = createClassDiagramLayout(parseMermaidClassDiagram(source), { classLayout: "dagre" }).edges[0]!.path
      expect(loop.length).toBeGreaterThan(2)
      expect(new Set(loop.map((point) => `${point.x}:${point.y}`)).size).toBeGreaterThan(2)
      const output = renderClassDiagram(source, { classLayout: "dagre" })
      for (const label of ["A", "B", "C", "retry"]) expect(output).toContain(label)
    }
  })

  test("Dagre preserves straight horizontal arrows and responsive folding", () => {
    const source = "classDiagram\n direction LR\n A --> B\n B --> C\n C --> D"
    const wide = renderClassDiagram(source, { classLayout: "dagre", layoutMaxWidth: 1000 })
    const folded = renderClassDiagram(source, { classLayout: "dagre", layoutMaxWidth: 24 })
    expect(wide).toContain("─────────→")
    expect(Math.max(...folded.split("\n").map((line) => line.length))).toBeLessThan(
      Math.max(...wide.split("\n").map((line) => line.length)),
    )
  })
})

describe("class diagram fallback", () => {
  test("throws a typed syntax error for unsupported syntax", () => {
    const source = ["classDiagram", "  class A", "  note \"unattached\""].join("\n")
    expect(() => parseMermaidClassDiagram(source)).toThrow(MermaidSyntaxError)
    try {
      parseMermaidClassDiagram(source)
    } catch (error) {
      expect(error).toBeInstanceOf(MermaidSyntaxError)
      expect((error as MermaidSyntaxError).kind).toBe("classDiagram")
      expect((error as MermaidSyntaxError).lineNumber).toBe(3)
      expect((error as MermaidSyntaxError).message).toContain("notes")
    }
  })

  test("flags namespaces, packages, and hyperlinks as unsupported", () => {
    expect(() => parseMermaidClassDiagram("classDiagram\n  namespace Foo\n")).toThrow(MermaidSyntaxError)
    expect(() => parseMermaidClassDiagram("classDiagram\n  package Foo\n")).toThrow(MermaidSyntaxError)
    expect(() => parseMermaidClassDiagram("classDiagram\n  click A href \"x\"\n")).toThrow(MermaidSyntaxError)
  })

  test("measureMermaidDiagram propagates the syntax error so the fence stays source", () => {
    const source = ["classDiagram", "  class A", "  note \"unattached\""].join("\n")
    expect(() => measureMermaidDiagram(source)).toThrow(MermaidSyntaxError)
    expect(() => measureMermaidDiagram(source, { classLayout: "dagre" })).toThrow(MermaidSyntaxError)
  })

  test("measureMermaidDiagram prepares a supported class diagram", () => {
    const prepared = measureMermaidDiagram("classDiagram\n  A <|-- B")
    expect(prepared?.kind).toBe("classDiagram")
    expect(prepared?.height).toBeGreaterThan(0)
  })
})
