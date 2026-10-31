import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { parseDocument } from "../src/core/parse"
import { measureMermaidDiagram } from "../src/merman/diagram"

const markdown = readFileSync(
  fileURLToPath(new URL("../examples/merman-ext.md", import.meta.url)),
  "utf8",
)
const allSources = parseDocument(markdown).blocks.flatMap((block) => block.type === "mermaid" ? [block.content] : [])
const sources = allSources.filter((source) => measureMermaidDiagram(source)?.kind !== "classDiagram")

function plainText(source: string): string {
  return measureMermaidDiagram(source, { layoutMaxWidth: 100 })?.text.chunks.map((chunk) => chunk.text).join("") ?? ""
}

test("the extension fixture combines class diagrams with every non-class family", () => {
  expect(allSources).toHaveLength(95)
  const kinds = allSources.map((source) => measureMermaidDiagram(source)?.kind)
  expect(kinds.filter((value) => value === "classDiagram")).toHaveLength(35)
  expect(sources).toHaveLength(60)
  for (const kind of ["flowchart", "sequence", "state", "gantt", "timeline", "gitGraph"]) {
    expect(kinds.filter((value) => value === kind)).toHaveLength(10)
  }
})

test("every edge-case diagram prepares at each supported width", () => {
  for (const width of [60, 80, 100, 120]) {
    for (const source of sources) {
      const prepared = measureMermaidDiagram(source, { layoutMaxWidth: width })
      expect(prepared?.height).toBeGreaterThan(0)
    }
  }
})

test("flowchart edge cases keep every node shape and link style", () => {
  const shapes = sources.find((source) => source.includes("[/Parallelogram/]"))
  expect(shapes).toBeDefined()
  const text = plainText(shapes!)
  for (const label of ["Box", "Rounded", "Circle", "Decision", "Database", "Subroutine", "Hexagon", "Parallelogram"]) {
    expect(text).toContain(label)
  }
})

test("circles, hexagons and parallelograms have distinct, aligned outlines", () => {
  const circle = plainText("flowchart TD\n C((Circle))").split("\n")
  const hexagon = plainText("flowchart TD\n H{{Hexagon}}").split("\n")
  const parallelogram = plainText("flowchart TD\n P[/Parallelogram/]").split("\n")
  expect(circle[0]).toContain("╭")
  expect(circle.at(-1)).toContain("╰")
  expect(hexagon[0]).toMatch(/╱─+╲/)
  expect(hexagon.at(-1)).toMatch(/╲─+╱/)
  expect(hexagon.join("\n")).not.toContain("╭")
  expect(parallelogram[0]).toMatch(/^  ╱─+╱$/)
  expect(parallelogram[1]).toMatch(/^ ╱ Parallelogram ╱$/)
  expect(parallelogram[2]).toMatch(/^╱─+╱$/)
})

test("the self-loop fixture draws D, G and H while retaining disconnected and order-only nodes", () => {
  const loops = sources.find((source) => source.includes("A -->|retry| A"))!
  for (const id of ["D", "G", "H"]) expect(loops).toContain(`${id} --> ${id}`)
  expect(loops).toContain("J ~~~ K")
  const text = plainText(loops)
  for (const id of ["D", "G", "H"]) expect(text).toContain(`│ ${id} ├`)
  for (const id of ["I", "J", "K"]) expect(text).toContain(`│ ${id} │`)
  expect(text.match(/╰─────╯/g)).toHaveLength(4)
})

test("nested sequence fragments and message kinds remain visible", () => {
  const nested = sources.find((source) => source.includes("loop retry"))
  const messages = sources.find((source) => source.includes("A-xB"))
  expect(nested).toBeDefined()
  expect(messages).toBeDefined()
  const nestedText = plainText(nested!)
  expect(nestedText).toContain("alt: success")
  expect(nestedText).toContain("loop: retry")
  expect(nestedText).toContain("else: failure")
  const messageText = plainText(messages!)
  for (const label of ["Think", "Sync", "Reply", "Cross", "Async", "Final"]) expect(messageText).toContain(label)
})

test("state edge cases keep choices, forks, joins and nested composites", () => {
  const fork = sources.find((source) => source.includes("<<fork>>"))
  const nested = sources.find((source) => source.includes("state Inner {"))
  expect(fork).toBeDefined()
  expect(nested).toBeDefined()
  const forkText = plainText(fork!)
  for (const label of ["ok", "bad", "Accept", "Reject", "WorkA", "WorkB"]) expect(forkText).toContain(label)
  const nestedText = plainText(nested!)
  for (const label of ["Outer", "Inner", "Leaf", "Done"]) expect(nestedText).toContain(label)
})

test("Gantt edge cases keep clock dates, dependencies and long labels", () => {
  const clock = sources.find((source) => source.includes("dateFormat HH:mm"))
  const labels = sources.find((source) => source.includes("much longer label"))
  expect(clock).toBeDefined()
  expect(labels).toBeDefined()
  const clockText = plainText(clock!)
  for (const label of ["Standup", "Focus", "Review"]) expect(clockText).toContain(label)
  expect(plainText(labels!)).toContain("A task with a much longer label than usual")
})

test("timeline edge cases keep quoted labels and continuation events", () => {
  const quoted = sources.find((source) => source.includes('"2026: Q1"'))
  const continuation = sources.find((source) => source.includes("       : Renderer"))
  expect(quoted).toBeDefined()
  expect(continuation).toBeDefined()
  const quotedText = plainText(quoted!)
  expect(quotedText).toContain("Parser: first pass")
  expect(quotedText).toContain("Renderer: layout")
  const continuationText = plainText(continuation!)
  for (const event of ["Parser", "Renderer", "Tables"]) expect(continuationText).toContain(event)
})

test("Git graph edge cases keep cherry-picks, merges and long branch names", () => {
  const cherry = sources.find((source) => source.includes('cherry-pick id: "fix"'))
  const longNames = sources.find((source) => source.includes("feature/very-long-branch-name"))
  expect(cherry).toBeDefined()
  expect(longNames).toBeDefined()
  const cherryText = plainText(cherry!)
  expect(cherryText).toContain("cherry-pick fix")
  expect(cherryText).toContain("sync")
  const longText = plainText(longNames!)
  expect(longText).toContain("A very long commit message that should remain readable")
  expect(longText).toContain("feature/very-long-branch-name")
})

test("advanced flowcharts keep quoted labels and uncommon links", () => {
  const quoted = sources.find((source) => source.includes('Start: parse'))
  const links = sources.find((source) => source.includes("B -.-> C"))
  expect(quoted).toBeDefined()
  expect(links).toBeDefined()
  const quotedText = plainText(quoted!)
  expect(quotedText).toContain("yes: continue")
  expect(quotedText).toContain("no, retry")
  const linkText = plainText(links!)
  for (const label of ["A", "B", "C", "D", "E", "F", "G"]) expect(linkText).toContain(label)
})

test("advanced sequence fragments keep deep nesting and early notes", () => {
  const nested = sources.find((source) => source.includes("alt outer"))
  const earlyNotes = sources.find((source) => source.includes("Before declarations"))
  const arrows = sources.find((source) => source.includes("A-xB"))
  expect(nested).toBeDefined()
  expect(earlyNotes).toBeDefined()
  expect(arrows).toBeDefined()
  const nestedText = plainText(nested!)
  for (const label of ["alt: outer", "par: left", "and: right", "loop: retry", "else: fallback", "opt: maybe"]) {
    expect(nestedText).toContain(label)
  }
  const noteText = plainText(earlyNotes!)
  expect(noteText).toContain("Before declarations")
  expect(noteText).toContain("After declarations")
  expect(noteText).toContain("hello")
  const arrowText = plainText(arrows!)
  expect(arrowText).toContain("Sync")
  expect(arrowText).toContain("Async")
})

test("advanced state cases keep nested fork/join, notes and punctuation", () => {
  const fork = sources.find((source) => source.includes("state Active {") && source.includes("state Split <<fork>>"))
  const notes = sources.find((source) => source.includes("Composite note"))
  const long = sources.find((source) => source.includes("A very long state name"))
  expect(fork).toBeDefined()
  expect(notes).toBeDefined()
  expect(long).toBeDefined()
  const forkText = plainText(fork!)
  for (const label of ["Active", "A", "B"]) expect(forkText).toContain(label)
  const noteText = plainText(notes!)
  expect(noteText).toContain("Composite note")
  expect(noteText).toContain("Inner note")
  expect(plainText(long!)).toContain("finish: cleanup")
})

test("advanced Gantt cases keep second precision, milestones and quoted labels", () => {
  const seconds = sources.find((source) => source.includes("09:00:00"))
  const milestone = sources.find((source) => source.includes("after t d"))
  const quoted = sources.find((source) => source.includes("Task with punctuation!"))
  expect(seconds).toBeDefined()
  expect(milestone).toBeDefined()
  expect(quoted).toBeDefined()
  const secondText = plainText(seconds!)
  for (const label of ["Ingest", "Transform", "Load"]) expect(secondText).toContain(label)
  const milestoneText = plainText(milestone!)
  expect(milestoneText).toContain("Ship")
  expect(milestoneText).toContain("Announce")
  const quotedText = plainText(quoted!)
  expect(quotedText).toContain("Quoted schedule")
  expect(quotedText).toContain("Task with punctuation!")
})

test("advanced timeline cases keep sections, no-section events and clock periods", () => {
  const sections = sources.find((source) => source.includes("M5 : Launch"))
  const noSections = sources.find((source) => source.includes("title Unsections"))
  const clock = sources.find((source) => source.includes("09:00 : Standup"))
  const long = sources.find((source) => source.includes("A very long event label"))
  expect(sections).toBeDefined()
  expect(noSections).toBeDefined()
  expect(clock).toBeDefined()
  expect(long).toBeDefined()
  const sectionText = plainText(sections!)
  for (const label of ["Alpha", "Beta", "Gamma"]) expect(sectionText).toContain(label)
  const noSectionText = plainText(noSections!)
  for (const event of ["Research", "Prototype", "Launch"]) expect(noSectionText).toContain(event)
  const clockText = plainText(clock!)
  for (const event of ["Morning", "Afternoon", "Standup", "Retro"]) expect(clockText).toContain(event)
  expect(plainText(long!)).toContain("Another long event label for the same period")
})

test("advanced Git graph cases keep generated IDs and sequential merges", () => {
  const collision = sources.find((source) => source.includes('commit id: "commit-1"'))
  const generated = sources.find((source) => source.includes("merge feature") && !source.includes("id:"))
  const merges = sources.find((source) => source.includes('merge one id: "merge-one"'))
  expect(collision).toBeDefined()
  expect(generated).toBeDefined()
  expect(merges).toBeDefined()
  expect(plainText(collision!)).toContain("cherry-pick side-1")
  expect(plainText(generated!)).toContain("commit-5")
  const mergeText = plainText(merges!)
  expect(mergeText).toContain("merge-one")
  expect(mergeText).toContain("merge-two")
})
