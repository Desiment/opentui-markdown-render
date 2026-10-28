import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
import { MermaidDiagramView } from "../src/view/mermaid"
import { defaultTheme } from "../src/theme/defaults"

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

test("unrecognized first Mermaid fence remains readable code", async () => {
  const setup = await testRender(() => <MermaidDiagramView source="not a diagram" theme={defaultTheme("dark")} columns={40} />,
    { width: 40, height: 8 })
  await setup.renderOnce()
  expect(setup.captureCharFrame()).toContain("not a diagram")
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
