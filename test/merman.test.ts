import { describe, expect, test } from "bun:test"
import { detectMermaidDiagram } from "../src/merman"

describe("vendored Mermaid detection", () => {
  test("recognizes every diagram family covered by the example fixture", () => {
    expect(detectMermaidDiagram("classDiagram\n  class Animal")).toBe("classDiagram")
    expect(detectMermaidDiagram("classDiagram LR\n  Animal <|-- Dog")).toBe("classDiagram")
    expect(detectMermaidDiagram("flowchart LR\n  A --> B")).toBe("flowchart")
    expect(detectMermaidDiagram("sequenceDiagram\n  participant User\n  User->>Renderer: Open")).toBe("sequence")
    expect(detectMermaidDiagram("stateDiagram-v2\n  [*] --> Ready")).toBe("state")
    expect(detectMermaidDiagram("gantt\n  section Render\n  Parse :0, 2")).toBe("gantt")
    expect(detectMermaidDiagram("timeline\n  title History\n  2026 : Render")).toBe("timeline")
    expect(detectMermaidDiagram("gitGraph\n  commit id: \"base\"\n  branch media")).toBe("gitGraph")
  })

  test("leaves ordinary code fences alone", () => {
    expect(detectMermaidDiagram("not a Mermaid diagram")).toBeUndefined()
  })
})
