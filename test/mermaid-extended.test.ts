import { expect, test } from "bun:test"
import { measureMermaidDiagram } from "../src/merman/diagram"
import { MermaidSyntaxError } from "../src/merman/diagnostics"
import { parseMermaidSequenceDiagram } from "../src/merman/sequence/parser"
import { parseMermaidFlowchartDiagram } from "../src/merman/flowchart/parser"
import { parseMermaidStateDiagram } from "../src/merman/state/parser"
import { parseMermaidGanttDiagram } from "../src/merman/gantt/parser"
import { parseMermaidGitGraphDiagram } from "../src/merman/gitgraph/parser"
import { parseMermaidClassDiagram } from "../src/merman/class/parser"
import { createClassDiagramLayout, drawClassDiagramGrid } from "../src/merman/class/drawing"
import { renderClassDiagram } from "../src/merman/class/diagram"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { parseDocument } from "../src/core/parse"

function exampleMermaidSources(name: string): string[] {
  const markdown = readFileSync(fileURLToPath(new URL(`../examples/${name}.md`, import.meta.url)), "utf8")
  return parseDocument(markdown).blocks.flatMap((block) => block.type === "mermaid" ? [block.content] : [])
}

test("sequence opt, par, critical, and break blocks render their branches", () => {
  const source = `sequenceDiagram
    participant User
    participant Service
    opt cached
      User->>Service: Lookup
    end
    par first
      Service-->>User: One
    and second
      Service-->>User: Two
    end
    critical must succeed
      User->>Service: Save
    option retry
      User->>Service: Retry
    end
    break failure
      Service-->>User: Error
    end`
  const diagram = parseMermaidSequenceDiagram(source)
  expect(diagram.steps.filter((step) => step.type === "fragment").map((step) => step.fragment.kind)).toEqual([
    "opt", "end", "par", "and", "end", "critical", "option", "end", "break", "end",
  ])
  expect(measureMermaidDiagram(source)?.height).toBeGreaterThan(0)
})

test("sequence rejects a branch without its enclosing fragment", () => {
  expect(() => parseMermaidSequenceDiagram("sequenceDiagram\n and another"))
    .toThrow(MermaidSyntaxError)
  expect(() => parseMermaidSequenceDiagram("sequenceDiagram\n option fallback"))
    .toThrow(MermaidSyntaxError)
})

test("flowcharts accept multiple statements per line without splitting labels", () => {
  const source = "flowchart LR; A[Alpha; Beta] -->|Ready; set| B; B --> C"
  const diagram = parseMermaidFlowchartDiagram(source)
  expect(diagram.nodes.map((node) => node.label)).toEqual(["Alpha; Beta", "B", "C"])
  expect(diagram.edges.map((edge) => edge.label)).toEqual(["Ready; set", ""])
  expect(measureMermaidDiagram(source)?.height).toBeGreaterThan(0)
})

test("flowchart inline comments do not become nodes or statements", () => {
  const source = "flowchart LR %% direction\n A[100%% done] --> B; %% done\n B --> C %% comment; not a node"
  const diagram = parseMermaidFlowchartDiagram(source)
  expect(diagram.nodes.map((node) => node.label)).toEqual(["100%% done", "B", "C"])
  expect(diagram.edges).toHaveLength(2)
  expect(measureMermaidDiagram(source)?.height).toBeGreaterThan(0)
})

test("flowchart CSS declarations with semicolons stay ignored", () => {
  const source = "flowchart TD\n classDef mark fill:#f00;stroke:#111;\n A --> B\n style A fill:#f00;stroke:#111"
  expect(parseMermaidFlowchartDiagram(source).edges).toHaveLength(1)
  expect(measureMermaidDiagram(source)?.height).toBeGreaterThan(0)
})

test("flowchart hexagon and parallelogram forms keep their labels and edges", () => {
  const source = "flowchart TD\n Source[/Input/] --> Stage{{Process}}\n Stage --> Done"
  const diagram = parseMermaidFlowchartDiagram(source)
  expect(diagram.nodes.map((node) => [node.id, node.shape, node.label])).toEqual([
    ["Source", "parallelogram", "Input"], ["Stage", "hexagon", "Process"], ["Done", "box", "Done"],
  ])
  expect(diagram.edges).toHaveLength(2)
  expect(measureMermaidDiagram(source)?.height).toBeGreaterThan(0)
})

test("state declarations and descriptions update an existing transition endpoint", () => {
  const source = "stateDiagram-v2\n [*] --> Ready\n state Ready\n Ready: Wait for input\n Ready --> [*]"
  expect(parseMermaidStateDiagram(source).states.find((state) => state.id === "Ready")?.label).toBe("Wait for input")
  expect(measureMermaidDiagram(source)?.height).toBeGreaterThan(0)
})

test("Gantt clock dates and explicit tick intervals render", () => {
  const source = "gantt\n dateFormat HH:mm\n axisFormat %H:%M\n tickInterval 30minutes\n section Core\n Scan :a1, 00:00, 2h\n Inline :after a1, 3h"
  const diagram = parseMermaidGanttDiagram(source)
  expect(diagram.tasks[1]!.start).toBe(diagram.tasks[0]!.end)
  expect(diagram.tickInterval).toBe(1_800_000)
  expect(measureMermaidDiagram(source)?.height).toBeGreaterThan(0)
  expect(() => parseMermaidGanttDiagram("gantt\n tickInterval 0days")).toThrow(MermaidSyntaxError)
})

test("the clock-format Gantt fixture renders", () => {
  const markdown = readFileSync(fileURLToPath(new URL("../examples/mermaid.md", import.meta.url)), "utf8")
  const sources = parseDocument(markdown).blocks.flatMap((block) =>
    block.type === "mermaid" && block.content.startsWith("gantt") ? [block.content] : [],
  )
  expect(sources).toHaveLength(2)
  for (const source of sources) expect(measureMermaidDiagram(source)?.height).toBeGreaterThan(0)
})

test("all Mermaid fences in the shipped examples prepare successfully", () => {
  for (const name of ["all", "mermaid", "merman-ext"]) {
    const sources = exampleMermaidSources(name)
    expect(sources.length).toBeGreaterThan(0)
    for (const source of sources) expect(measureMermaidDiagram(source)?.height).toBeGreaterThan(0)
  }
})

test("the restored class diagram stress suite prepares at every supported width", () => {
  const sources = exampleMermaidSources("merman-ext")
    .filter((source) => measureMermaidDiagram(source)?.kind === "classDiagram")
  expect(sources).toHaveLength(35)
  for (const width of [60, 80, 100, 120]) {
    for (const source of sources) {
      const prepared = measureMermaidDiagram(source, { layoutMaxWidth: width })
      expect(prepared?.kind).toBe("classDiagram")
      expect(prepared?.height).toBeGreaterThan(0)
    }
  }
})

test("Dagre prepares every class diagram fixture", () => {
  for (const source of exampleMermaidSources("merman-ext").slice(0, 35)) {
    expect(measureMermaidDiagram(source, { classLayout: "dagre", layoutMaxWidth: 100 })?.height).toBeGreaterThan(0)
  }
})

test("Dagre separates dashed and solid horizontal relationships in example 24", () => {
  const source = exampleMermaidSources("merman-ext")[23]!
  const layout = createClassDiagramLayout(parseMermaidClassDiagram(source), { classLayout: "dagre" })
  const horizontal = (edge: (typeof layout.edges)[number]) => edge.path.slice(1).flatMap((to, index) => {
    const from = edge.path[index]!
    return from.y === to.y ? [{ y: from.y, left: Math.min(from.x, to.x), right: Math.max(from.x, to.x) }] : []
  })
  for (const dashed of layout.edges.filter((edge) => edge.relationship.dashed)) {
    for (const solid of layout.edges.filter((edge) => !edge.relationship.dashed)) {
      for (const a of horizontal(dashed)) for (const b of horizontal(solid)) {
        if (a.y !== b.y) continue
        expect(Math.min(a.right, b.right) - Math.max(a.left, b.left)).toBeLessThan(2)
      }
    }
  }
})

test("the extended class diagram fixture renders labels and attached notes", () => {
  const sources = exampleMermaidSources("merman-ext")
    .filter((source) => measureMermaidDiagram(source)?.kind === "classDiagram")
  const labelled = sources.find((source) => source.includes("Customer Account"))
  const notes = sources.find((source) => source.includes("Validates every request"))
  expect(labelled).toBeDefined()
  expect(notes).toBeDefined()
  const labelledText = measureMermaidDiagram(labelled!)?.text.chunks.map((chunk) => chunk.text).join("") ?? ""
  const noteText = measureMermaidDiagram(notes!)?.text.chunks.map((chunk) => chunk.text).join("") ?? ""
  expect(labelledText).toContain("Customer Account")
  expect(labelledText).toContain("Transaction Ledger")
  expect(noteText).toContain("Validates every request before routing.")
  expect(noteText).toContain("Entries expire after five minutes.")
})

test("independent class edges cross with a vertical gap, but fan-out buses stay joined", () => {
  const sources = exampleMermaidSources("merman-ext")
  const lines = renderClassDiagram(sources[3]!).split("\n") // diamond inheritance
  const hasBridge = lines.some((line, y) => [...line].some((char, x) =>
    char === "─" && line[x - 1] === "─" && line[x + 1] === "─"
      && lines[y - 1]?.[x] === "│" && lines[y + 1]?.[x] === "│",
  ))
  expect(hasBridge).toBe(true)
  const diagram = parseMermaidClassDiagram(sources[3]!)
  const layout = createClassDiagramLayout(diagram)
  const endpoint = layout.edges.find((edge) => edge.fromId === "Device" && edge.toId === "Networked")!.path.at(-1)!
  const grid = drawClassDiagramGrid(diagram)
  // The independent Cluster -> Router line crosses this endpoint: keep the
  // connector into Networked rather than rendering a false four-way junction.
  expect(grid.getCell(endpoint.x, endpoint.y)?.char).toBe("│")
  expect(grid.getCell(endpoint.x - 1, endpoint.y)?.char).toBe("─")
  expect(grid.getCell(endpoint.x + 1, endpoint.y)?.char).toBe("─")
  expect(renderClassDiagram(sources[1]!)).toContain("┴") // shared fan-out bus
})

test("duplicate class routes do not change crossing geometry", () => {
  const links = ["A --> D", "B --> E", "C --> F", "A --> F", "B --> E"]
  const once = renderClassDiagram(`classDiagram\n ${links.join("\n ")}`)
  const repeatedLinks = [...links, ...Array.from({ length: 100 }, () => ["A --> F", "B --> E"]).flat()]
  const repeated = renderClassDiagram(`classDiagram\n ${repeatedLinks.join("\n ")}`)
  expect(repeated).toBe(once)
})

test("gitGraph cherry-pick creates a commit on the current branch", () => {
  const source = `gitGraph
    commit id: "base"
    branch feature
    commit id: "work" msg: "Fix"
    checkout main
    cherry-pick id: "work"`
  const graph = parseMermaidGitGraphDiagram(source)
  expect(graph.commits.at(-1)).toMatchObject({ id: "commit-1", branch: "main", parents: ["base"], message: "Fix" })
  expect(measureMermaidDiagram(source)?.height).toBeGreaterThan(0)
  expect(() => parseMermaidGitGraphDiagram("gitGraph\n commit\n cherry-pick id: \"missing\""))
    .toThrow(MermaidSyntaxError)
  expect(parseMermaidGitGraphDiagram("gitGraph\n commit id: \"commit-1\"\n commit").commits[1]?.id)
    .toBe("commit-2")
})

test("class declarations show an alias while relationships keep the class id", () => {
  const source = "classDiagram\n class Account[\"Customer Account\"] {\n +open() void\n }\n Account --> Ledger"
  const diagram = parseMermaidClassDiagram(source)
  expect(diagram.classes.find((entry) => entry.id === "Account")?.label).toBe("Customer Account")
  expect(diagram.relationships[0]?.from).toBe("Account")
  expect(measureMermaidDiagram(source)?.text.chunks.some((chunk) => chunk.text.includes("Customer Account"))).toBe(true)
})

test("class notes remain readable in the corresponding class box", () => {
  const source = "classDiagram\n class Animal {\n +String name\n }\n note for Animal \"Can swim\""
  expect(parseMermaidClassDiagram(source).classes[0]?.notes).toEqual(["Can swim"])
  expect(measureMermaidDiagram(source)?.text.chunks.some((chunk) => chunk.text.includes("Can swim"))).toBe(true)
})
