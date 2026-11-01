import { expect, test } from "bun:test"
import { testRender, useRenderer } from "@opentui/solid"
import { createSignal } from "solid-js"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { MermaidDiagramView } from "../src/view/mermaid"
import { MarkdownRenderer } from "../src/app"
import { defaultTheme } from "../src/theme/defaults"
import { parseDocument } from "../src/core/parse"
import { parseMermaidFlowchartDiagram } from "../src/merman/flowchart/parser"
import { parseMermaidStateDiagram } from "../src/merman/state/parser"

test("all.md flowcharts, including a circle node, render as diagrams", async () => {
  const markdown = readFileSync(fileURLToPath(new URL("../examples/all.md", import.meta.url)), "utf8")
  const sources = parseDocument(markdown).blocks.flatMap((block) =>
    block.type === "mermaid" && block.content.startsWith("flowchart") ? [block.content] : [],
  )
  expect(sources).toHaveLength(3)
  expect(parseMermaidFlowchartDiagram(sources[1]!).nodes.find((node) => node.id === "B")).toMatchObject({
    label: "Round", shape: "circle",
  })
  for (const [index, source] of sources.entries()) {
    const setup = await testRender(() => <MermaidDiagramView source={source} theme={defaultTheme("dark")} columns={80} />,
      { width: 80, height: 30 })
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).not.toContain("flowchart")
    expect(frame).toContain(["Start", "Round", "Group"][index]!)
    if (index === 1) {
      expect(frame).not.toContain("(")
      expect(frame).not.toContain(")")
      expect(frame).toContain("╱")
      expect(frame).toContain("╲")
    }
  }
})

test("all.md fork state diagram renders instead of falling back to source", async () => {
  const markdown = readFileSync(fileURLToPath(new URL("../examples/all.md", import.meta.url)), "utf8")
  const sources = parseDocument(markdown).blocks.flatMap((block) =>
    block.type === "mermaid" && block.content.startsWith("stateDiagram") ? [block.content] : [],
  )
  expect(sources).toHaveLength(2)
  expect(parseMermaidStateDiagram(sources[1]!).states.find((state) => state.id === "Fork")?.kind).toBe("fork")
  const setup = await testRender(() => <MermaidDiagramView source={sources[1]!}
    theme={defaultTheme("dark")} columns={80} />, { width: 80, height: 30 })
  await setup.renderOnce()
  const frame = setup.captureCharFrame()
  expect(frame).not.toContain("stateDiagram-v2")
  expect(frame).toContain("A")
  expect(frame).toContain("┃")
})

test("fork and join state markers connect parallel branches", async () => {
  const source = "stateDiagram-v2\n [*] --> Fork\n state Fork <<fork>>\n Fork --> A\n Fork --> B\n A --> Join\n B --> Join\n state Join <<join>>\n Join --> [*]"
  const states = parseMermaidStateDiagram(source).states
  expect(states.find((state) => state.id === "Join")?.kind).toBe("join")
  const setup = await testRender(() => <MermaidDiagramView source={source} theme={defaultTheme("dark")} columns={80} />,
    { width: 80, height: 30 })
  await setup.renderOnce()
  const frame = setup.captureCharFrame()
  expect(frame).not.toContain("stateDiagram-v2")
  expect(frame).toContain("A")
  expect(frame).toContain("B")
  expect(frame.match(/┃/g)?.length).toBeGreaterThanOrEqual(2)
})

test("vertical state diagrams use horizontal fork and join bars", async () => {
  const source = "stateDiagram-v2\n direction TB\n [*] --> Fork\n state Fork <<fork>>\n Fork --> A\n Fork --> B\n A --> Join\n B --> Join\n state Join <<join>>\n Join --> [*]"
  const setup = await testRender(() => <MermaidDiagramView source={source} theme={defaultTheme("dark")} columns={80} />,
    { width: 80, height: 40 })
  await setup.renderOnce()
  const frame = setup.captureCharFrame()
  expect(frame).not.toContain("stateDiagram-v2")
  expect(frame.match(/━/g)?.length).toBeGreaterThanOrEqual(2)
})

test("Mermaid keeps the last good diagram while a fence is incomplete", async () => {
  let update!: (value: string) => void
  const setup = await testRender(() => {
    const [source, setSource] = createSignal("flowchart LR\n A[Alpha] --> B[Beta]")
    update = setSource
    return <MermaidDiagramView source={source()} theme={defaultTheme("dark")} columns={60} />
  }, { width: 60, height: 14 })
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("Alpha")
  update("flowchart LR\n A[Alpha] --> B[Beta]\n A-->")
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("Alpha")
  update("flowchart LR\n A[Alpha] --> C[Gamma]")
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("Gamma")
})

test("changing class layout config redraws a mounted Markdown diagram", async () => {
  let setLayout!: (value: "builtin" | "dagre") => void
  const source = "```mermaid\nclassDiagram\n direction LR\n A --> B\n B --> C\n C --> D\n```"
  const setup = await testRender(() => {
    const [layout, update] = createSignal<"builtin" | "dagre">("builtin")
    setLayout = update
    return <MarkdownRenderer content={() => source} renderer={useRenderer()} theme={defaultTheme("dark")}
      config={() => ({ mermaid: { classLayout: layout(), layoutMaxWidth: 200 } })} />
  }, { width: 80, height: 55 })
  await setup.renderOnce()
  const builtin = setup.captureCharFrame()
  expect(builtin).toContain("A")
  setLayout("dagre")
  await setup.renderOnce()
  const dagre = setup.captureCharFrame()
  expect(dagre).toContain("A")
  expect(dagre).not.toBe(builtin)
  setLayout("builtin")
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toBe(builtin)
})

test("unrecognized first Mermaid fence remains readable code", async () => {
  const setup = await testRender(() => <MermaidDiagramView source="not a diagram" theme={defaultTheme("dark")} columns={40} />,
    { width: 40, height: 8 })
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("not a diagram")
})

test("unsupported syntax in a recognized diagram remains readable source", async () => {
  const source = "gantt\n excludes weekends\n Task :2026-01-01, 1d"
  const setup = await testRender(() => <MermaidDiagramView source={source} theme={defaultTheme("dark")} columns={55} />,
    { width: 55, height: 8 })
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("excludes weekends")
})

test("partial first diagram shows valid prefix and theme changes reprepare it", async () => {
  let setMode!: (value: "dark" | "light") => void
  const setup = await testRender(() => {
    const [mode, update] = createSignal<"dark" | "light">("dark")
    setMode = update
    return <MermaidDiagramView source={"flowchart LR\n A[Alpha] --> B[Beta]\n A-->"}
      theme={defaultTheme(mode())} columns={60} />
  }, { width: 60, height: 14 })
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("Alpha")
  const first = setup.captureSpans().lines.flatMap((line) => line.spans).find((span) => span.text.includes("Alpha"))?.fg.toInts()
  setMode("light")
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("Alpha")
  const second = setup.captureSpans().lines.flatMap((line) => line.spans).find((span) => span.text.includes("Alpha"))?.fg.toInts()
  expect(second).not.toEqual(first)
})

for (const [kind, source, label] of [
  ["flowchart", "flowchart LR\n A[Alpha] --> B[Beta]", "Alpha"],
  ["class", "classDiagram\n class Animal", "Animal"],
  ["class LR", "classDiagram LR\n Animal <|-- Dog", "Animal"],
  ["sequence", "sequenceDiagram\n participant User\n User->>Renderer: Open", "User"],
  ["state", "stateDiagram-v2\n [*] --> Ready", "Ready"],
  ["gantt", "gantt\n dateFormat s\n section Render\n Parse Markdown :0, 2", "Parse"],
  ["timeline", "timeline\n title History\n 2026 : Render", "Render"],
  ["gitGraph", "gitGraph\n commit id: \"base\"\n branch media", "base"],
] as const) {
  test(`${kind} renders with the unified Mermaid view`, async () => {
    const setup = await testRender(() => <MermaidDiagramView source={source} theme={defaultTheme("dark")} columns={70} />,
      { width: 70, height: 20 })
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain(label)
  })
}
