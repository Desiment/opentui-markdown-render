import { expect, test } from "bun:test"
import { measureMermaidDiagram } from "../src/merman/diagram"
import { MermaidSyntaxError, type MermaidDiagramKind } from "../src/merman/diagnostics"
import { parseMermaidTimelineDiagram } from "../src/merman/timeline/parser"
import { DiagramCanvas, DiagramCanvasSizeError } from "../src/merman/core/canvas"

// Representative examples for the three outcomes documented in MERMAID_SUPPORT.md.
// These are deliberately not a claim of full upstream Mermaid compatibility.
const rendered: readonly [MermaidDiagramKind, string][] = [
  ["flowchart", "flowchart LR; A[/Input/] --> B{{Process}}; B --> C((Done))"],
  ["sequence", "sequenceDiagram\n participant A\n participant B\n par first\n A->>B: Ping\n and second\n B-->>A: Pong\n end"],
  ["state", "stateDiagram-v2\n [*] --> Fork\n state Fork <<fork>>\n Fork --> Done\n Done --> [*]"],
  ["gantt", "gantt\n dateFormat HH:mm\n tickInterval 1h\n section Work\n Task :00:00, 2h"],
  ["timeline", "timeline\n title History\n section Build\n 2026 : Parser\n : Renderer"],
  ["gitGraph", "gitGraph\n commit id: \"base\"\n branch fix\n commit id: \"patch\"\n checkout main\n cherry-pick id: \"patch\""],
  ["classDiagram", "classDiagram\n class Animal[\"The Animal\"]\n note for Animal \"Can swim\"\n Animal --> Habitat"],
]

for (const [kind, source] of rendered) {
  test(`${kind}: documented syntax prepares a diagram`, () => {
    const prepared = measureMermaidDiagram(source)
    expect(prepared?.kind).toBe(kind)
    expect(prepared?.height).toBeGreaterThan(0)
  })
}

function characters(source: string): string | undefined {
  return measureMermaidDiagram(source)?.text.chunks.map((chunk) => chunk.text).join("")
}

const ignored: readonly [string, string, string][] = [
  ["flowchart CSS", "flowchart LR\n classDef mark fill:red;stroke:blue;\n A --> B", "flowchart LR\n A --> B"],
  ["sequence box colour", "sequenceDiagram\n box red Team\n participant A\n end\n A->>A: Ping", "sequenceDiagram\n box Team\n participant A\n end\n A->>A: Ping"],
  ["state comments", "stateDiagram-v2\n %% explanation\n [*] --> Ready", "stateDiagram-v2\n [*] --> Ready"],
  ["gantt accessibility metadata", "gantt\n accTitle: Schedule\n dateFormat s\n Task :0, 2", "gantt\n dateFormat s\n Task :0, 2"],
  ["gantt vert flag", "gantt\n dateFormat s\n Task :vert, 0, 2", "gantt\n dateFormat s\n Task :0, 2"],
  ["timeline accessibility metadata", "timeline\n accTitle: History\n 2026 : Release", "timeline\n 2026 : Release"],
  ["gitGraph title", "gitGraph\n title History\n commit", "gitGraph\n commit"],
  ["class accessibility metadata", "classDiagram\n accTitle: Model\n class Animal", "classDiagram\n class Animal"],
]

for (const [name, withDirective, withoutDirective] of ignored) {
  test(`${name}: accepted directive does not change the drawing`, () => {
    expect(characters(withDirective)).toBeDefined()
    expect(characters(withDirective)).toBe(characters(withoutDirective))
  })
}

for (const [name, header] of [
  ["ER", "erDiagram"], ["pie", "pie"], ["mindmap", "mindmap"],
] as const) {
  test(`${name}: unknown family is not detected`, () => {
    expect(measureMermaidDiagram(`${header}\n A --> B`)).toBeUndefined()
  })
}

const unsupported: readonly [string, string][] = [
  ["flowchart modern shape", "flowchart LR\n A@{ shape: rect } --> B"],
  ["sequence bidirectional message", "sequenceDiagram\n A<<->>B: Ping"],
  ["state composite-local direction", "stateDiagram-v2\n state Group {\n direction TB\n A --> B\n }"],
  ["gantt excludes", "gantt\n excludes weekends\n Task :2026-01-01, 1d"],
  ["gantt todayMarker", "gantt\n todayMarker off\n Task :2026-01-01, 1d"],
  ["gantt calendar-month tick interval", "gantt\n tickInterval 1month\n Task :2026-01-01, 1d"],
  ["gitGraph cherry-pick parent option", "gitGraph\n commit id: \"a\"\n cherry-pick id: \"a\" parent: \"a\""],
  ["class standalone note", "classDiagram\n class Animal\n note \"A note\""],
  ["class namespace", "classDiagram\n namespace Zoo {\n class Animal\n }"],
  ["class style", "classDiagram\n class Animal\n style Animal fill:red"],
  ["timeline empty section", "timeline\n section"],
]

for (const [name, source] of unsupported) {
  test(`${name}: unsupported statement raises a syntax error`, () => {
    expect(() => measureMermaidDiagram(source)).toThrow(MermaidSyntaxError)
  })
}

test("timeline and gitGraph directions are parsed, but their terminal layout stays vertical", () => {
  expect(characters("timeline TD\n 2026 : Release")).toBe(characters("timeline LR\n 2026 : Release"))
  expect(characters("gitGraph TB\n commit")).toBe(characters("gitGraph LR\n commit"))
})

test("timeline unknown statements may be interpreted as period text", () => {
  expect(parseMermaidTimelineDiagram("timeline\n unknownDirective").periods[0]?.period).toBe("unknownDirective")
})

test("large diagrams and flowchart source lines have explicit limits", () => {
  expect(() => new DiagramCanvas(501, 500)).toThrow(DiagramCanvasSizeError)
  expect(() => measureMermaidDiagram(`flowchart LR\n ${"A".repeat(10_001)}`)).toThrow(MermaidSyntaxError)
})
