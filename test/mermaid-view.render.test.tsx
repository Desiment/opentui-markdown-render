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
