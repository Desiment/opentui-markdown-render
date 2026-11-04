import { describe, expect, test } from "bun:test"
import { testRender, useRenderer } from "@opentui/solid"
import { createSignal } from "solid-js"
import { ImageRenderable, TextRenderable, type Renderable } from "@opentui/core"
import { MarkdownRenderer } from "../src/app"
import { parseDocument, type Document, type UnitInfo } from "../src/core"
import { defaultHeadingStyles } from "../src/headings"
import { resolveTableOptions } from "../src/core/tables"
import { defaultTheme } from "../src/theme/defaults"
import { DocumentView, type RenderUnit } from "../src/view/document"
import { MarkdownTableRenderable } from "../src/view/document-table"

const graphics = { protocol: () => "kitty", cell: () => ({ width: 8, height: 16 }) } as never

function linkURLs(root: Renderable): string[] {
  const visit = (node: Renderable): TextRenderable[] => [
    ...(node instanceof TextRenderable ? [node] : []),
    ...node.getChildren().flatMap(visit),
  ]
  return visit(root).flatMap((node) => node.chunks.flatMap((chunk) => chunk.link?.url ? [chunk.link.url] : []))
}

function definition(url: string): string {
  return `[ref]: ${url}\n\nSee [site][ref].\n`
}

function tables(root: Renderable): MarkdownTableRenderable[] {
  return [...(root instanceof MarkdownTableRenderable ? [root] : []), ...root.getChildren().flatMap(tables)]
}

function images(root: Renderable): ImageRenderable[] {
  return [...(root instanceof ImageRenderable ? [root] : []), ...root.getChildren().flatMap(images)]
}

describe("document units in the real renderer", () => {
  test("refreshes a reference link when content input changes", async () => {
    let update!: (value: string) => void
    const setup = await testRender(() => {
      const [content, setContent] = createSignal(definition("https://a.example"))
      update = setContent
      return <MarkdownRenderer content={() => content()} renderer={useRenderer()} theme={defaultTheme("dark")}
        discoverConfig={false} />
    }, { width: 80, height: 12 })
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("site (https://a.example)")
    expect(linkURLs(setup.renderer.root)).toContain("https://a.example")

    update(definition("https://b.example"))
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("site (https://b.example)")
    expect(frame).not.toContain("https://a.example")
    expect(linkURLs(setup.renderer.root)).toContain("https://b.example")
    expect(linkURLs(setup.renderer.root)).not.toContain("https://a.example")
  })

  test("refreshes a reference link when a ready document input changes", async () => {
    let update!: (url: string) => void
    const setup = await testRender(() => {
      const [document, setDocument] = createSignal<Document>(parseDocument(definition("https://a.example")))
      update = (url) => setDocument(parseDocument(definition(url)))
      return <MarkdownRenderer document={() => document()} renderer={useRenderer()} theme={defaultTheme("dark")}
        discoverConfig={false} />
    }, { width: 80, height: 12 })
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("site (https://a.example)")

    update("https://b.example")
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("site (https://b.example)")
    expect(frame).not.toContain("https://a.example")
    expect(linkURLs(setup.renderer.root)).toContain("https://b.example")
  })

  test("wraps top-level blocks and whole list items exactly once", async () => {
    const source = "Intro\n\n- one\n  - nested\n- two\n\n![alt](missing.png)"
    const calls: UnitInfo[] = []
    const renderUnit: RenderUnit = (info, content) => {
      calls.push(info())
      return content
    }
    const setup = await testRender(() => <MarkdownRenderer content={() => source} renderer={useRenderer()}
      theme={defaultTheme("dark")} discoverConfig={false} renderUnit={renderUnit} />, { width: 60, height: 20 })
    await setup.renderOnce()

    expect(calls.map((call) => call.kind)).toEqual(["block", "list-item", "list-item", "block"])
    expect(calls.every((call) => call.source !== null)).toBe(true)
    const firstItem = calls[1]
    if (firstItem?.kind !== "list-item") throw new Error("expected a list item")
    expect(firstItem.item.blocks.some((block) => block.type === "list")).toBe(true)
  })

  test("an identity wrapper leaves the frame unchanged", async () => {
    const source = "Intro\n\n- one\n- two"
    const plain = await testRender(() => <MarkdownRenderer content={() => source} renderer={useRenderer()}
      theme={defaultTheme("dark")} discoverConfig={false} />, { width: 40, height: 12 })
    await plain.renderOnce()

    const wrapped = await testRender(() => <MarkdownRenderer content={() => source} renderer={useRenderer()}
      theme={defaultTheme("dark")} discoverConfig={false} renderUnit={(_, content) => content} />,
    { width: 40, height: 12 })
    await wrapped.renderOnce()
    expect(wrapped.captureCharFrame()).toBe(plain.captureCharFrame())
  })

  test("paints a multi-block unit surface through headings, text, and display math", async () => {
    const document = parseDocument("# Selected heading\n\nSelected paragraph with $y$\n\n$$\nx^2\n$$\n\n| Name | Value |\n| --- | --- |\n| Cell | 1 |\n\nTail")
    const first = document.blocks[0]?.source
    const last = document.blocks[3]?.source
    if (!first || !last) throw new Error("expected selected source ranges")
    const selection = "#314159"
    const comment = "#5b2f40"
    let saveComment!: () => void
    const setup = await testRender(() => {
      const [selected, setSelected] = createSignal(true)
      const [commented, setCommented] = createSignal(false)
      saveComment = () => {
        setSelected(false)
        setCommented(true)
      }
      return <MarkdownRenderer document={() => document} renderer={useRenderer()}
        theme={defaultTheme("dark")} discoverConfig={false}
        unitSurface={(info) => {
          const source = info().source
          if (!source || source.start < first.start || source.end > last.end) return undefined
          if (selected()) return selection
          return commented() ? comment : undefined
        }} />
    }, { width: 48, height: 30 })
    await setup.renderOnce()
    await new Promise((resolve) => setTimeout(resolve, 400))
    await setup.renderOnce()

    const spans = setup.captureSpans().lines.flatMap((line) => line.spans)
    expect(spans.find((span) => span.text.includes("Selected heading"))?.bg.toInts()).toEqual([49, 65, 89, 255])
    expect(spans.find((span) => span.text.includes("Selected paragraph"))?.bg.toInts()).toEqual([49, 65, 89, 255])
    expect(spans.find((span) => span.text.includes("Cell"))?.bg.toInts()).toEqual([49, 65, 89, 255])
    expect(spans.find((span) => span.text.includes("Tail"))?.bg.toInts()).toEqual([13, 17, 23, 255])
    const math = images(setup.renderer.root).filter((image) => image.id.startsWith("opentui-markdown-math-"))
    expect(math).toHaveLength(2)
    expect(math.every((image) => image.id.endsWith(selection))).toBe(true)

    saveComment()
    await setup.renderOnce()
    await new Promise((resolve) => setTimeout(resolve, 400))
    await setup.renderOnce()
    const commentedSpans = setup.captureSpans().lines.flatMap((line) => line.spans)
    expect(commentedSpans.find((span) => span.text.includes("Selected heading"))?.bg.toInts()).toEqual([91, 47, 64, 255])
    expect(commentedSpans.find((span) => span.text.includes("Selected paragraph"))?.bg.toInts()).toEqual([91, 47, 64, 255])
    expect(commentedSpans.find((span) => span.text.includes("Cell"))?.bg.toInts()).toEqual([91, 47, 64, 255])
    expect(images(setup.renderer.root).filter((image) => image.id.startsWith("opentui-markdown-math-")).every((image) => image.id.endsWith(comment))).toBe(true)
  })

  test("keeps the same units at a narrow width", async () => {
    const source = "Intro\n\n- one\n  - nested\n- two\n\n![alt](missing.png)"
    const calls: UnitInfo[] = []
    const setup = await testRender(() => <MarkdownRenderer content={() => source} renderer={useRenderer()}
      theme={defaultTheme("dark")} discoverConfig={false}
      renderUnit={(info, content) => { calls.push(info()); return content }} />, { width: 20, height: 30 })
    await setup.renderOnce()
    expect(calls.map((call) => call.kind)).toEqual(["block", "list-item", "list-item", "block"])
    expect(setup.captureCharFrame()).toContain("Intro")
  })

  test("renderUnit keeps Mermaid last-good while a fence is edited", async () => {
    let update!: (value: string) => void
    const source = (body: string) => `Prelude\n\n\`\`\`mermaid\n${body}\n\`\`\``
    const setup = await testRender(() => {
      const [content, setContent] = createSignal(source("flowchart LR\n A[Alpha] --> B[Beta]"))
      update = setContent
      return <DocumentView document={parseDocument(content())} columns={60}
        theme={defaultTheme("dark")} headings={defaultHeadingStyles} graphics={graphics}
        surface={() => "#0d1117"} assetBase={() => undefined} tableOptions={resolveTableOptions()}
        renderUnit={(_, content) => content} />
    }, { width: 60, height: 14 })
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("Alpha")

    update(source("flowchart LR\n A[Alpha] --> B[Beta]\n A-->"))
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("Alpha")

    update(source("flowchart LR\n A[Alpha] --> C[Gamma]"))
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("Gamma")
  })

  test("a ready document without proven ranges still renders its units", async () => {
    const document: Document = {
      source: "",
      blocks: [
        {
          type: "paragraph", raw: "Synthetic paragraph", source: null,
          children: [{ type: "text", text: "Synthetic paragraph" }],
        },
        {
          type: "list", raw: "", source: null, ordered: false, start: 1, loose: false,
          items: [{
            task: false, checked: null, loose: false, source: null,
            blocks: [{
              type: "paragraph", raw: "Synthetic item", source: null,
              children: [{ type: "text", text: "Synthetic item" }],
            }],
          }],
        },
      ],
    }
    const calls: UnitInfo[] = []
    const setup = await testRender(() => <MarkdownRenderer document={() => document} renderer={useRenderer()}
      theme={defaultTheme("dark")} discoverConfig={false}
      renderUnit={(info, content) => { calls.push(info()); return content }} />, { width: 40, height: 10 })
    await setup.renderOnce()

    expect(calls.map((call) => call.kind)).toEqual(["block", "list-item"])
    expect(calls.every((call) => call.source === null)).toBe(true)
    const frame = setup.captureCharFrame()
    expect(frame).toContain("Synthetic paragraph")
    expect(frame).toContain("Synthetic item")
  })

  test("renderUnit can be added, replaced, and removed after mount", async () => {
    let update!: (value: RenderUnit | undefined) => void
    const calls: string[] = []
    const wrap = (label: string): RenderUnit => (info, content) => {
      calls.push(`${label}:${info().kind}`)
      return content
    }
    const setup = await testRender(() => {
      const [wrapper, setWrapper] = createSignal<RenderUnit | undefined>(undefined)
      update = (value) => setWrapper(() => value)
      return <MarkdownRenderer content={() => "Intro\n\n- one\n- two"} renderer={useRenderer()}
        theme={defaultTheme("dark")} discoverConfig={false} renderUnit={wrapper()} />
    }, { width: 40, height: 12 })
    await setup.renderOnce()
    expect(calls).toEqual([])
    update(wrap("first"))
    await setup.renderOnce()
    expect(calls.sort()).toEqual(["first:block", "first:list-item", "first:list-item"])
    update(wrap("second"))
    await setup.renderOnce()
    expect(calls.slice(3).sort()).toEqual(["second:block", "second:list-item", "second:list-item"])
    update(undefined)
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("Intro")
    update(wrap("third"))
    await setup.renderOnce()
    expect(calls.slice(6).sort()).toEqual(["third:block", "third:list-item", "third:list-item"])
  })

  test("missing source fields in a ready document yield null unit ranges", async () => {
    const parsed = parseDocument("Intro\n\n- item")
    const blocks = parsed.blocks.map((block) => {
      if (block.type !== "list") return { ...block, source: undefined }
      return { ...block, source: undefined, items: block.items.map((item) => ({ ...item, source: undefined })) }
    })
    const source = { ...parsed, blocks } as unknown as Document
    const infos: Array<() => UnitInfo> = []
    const setup = await testRender(() => <MarkdownRenderer document={() => source} renderer={useRenderer()}
      theme={defaultTheme("dark")} discoverConfig={false}
      renderUnit={(info, content) => { infos.push(info); return content }} />, { width: 40, height: 10 })
    await setup.renderOnce()
    expect(infos.map((info) => info().source)).toEqual([null, null])
    expect(infos.map((info) => {
      const unit = info()
      return unit.kind === "block" ? unit.block.source : unit.item.source
    })).toEqual([null, null])
  })

  test("a source-only insertion preserves panned top-level and nested tables", async () => {
    const cells = Array.from({ length: 10 }, (_, index) => `column ${index}`)
    const table = `| ${cells.join(" | ")} |\n| ${cells.map(() => "---").join(" | ")} |\n| ${cells.join(" | ")} |`
    for (const nested of [false, true]) {
      const original = nested ? `- item\n\n  ${table.replaceAll("\n", "\n  ")}` : table
      let update!: (value: string) => void
      let info!: () => UnitInfo
      const setup = await testRender(() => {
        const [content, setContent] = createSignal(original)
        update = setContent
        return <MarkdownRenderer content={() => content()} renderer={useRenderer()}
          theme={defaultTheme("dark")} discoverConfig={false}
          renderUnit={(unit, content) => {
            const current = unit()
            if (current.kind === "list-item" || (current.kind === "block" && current.block.type === "table")) info = unit
            return content
          }} />
      }, { width: 40, height: 14 })
      await setup.renderOnce()
      const first = tables(setup.renderer.root)[0]
      expect(first).toBeDefined()
      expect(info().source?.start).toBe(0)
      await setup.mockMouse.scroll(5, nested ? 2 : 1, "right")
      await setup.renderOnce()
      const panned = setup.captureCharFrame()
      expect(panned).toContain("column 1")
      update(`Before\n\n${original}`)
      await setup.renderOnce()
      expect(tables(setup.renderer.root)[0]).toBe(first)
      expect(setup.captureCharFrame()).toContain("column 1")
      expect(info().source?.start).toBe(8)
      const unit = info()
      expect(unit.kind === "list-item" ? unit.item.source : unit.block.source).toEqual(unit.source)
    }
  })

  test("long ordered lists align markers across digit boundaries", async () => {
    const source = Array.from({ length: 95 }, (_, index) => `${index + 9}. item`).join("\n")
    const setup = await testRender(() => <MarkdownRenderer content={() => source} renderer={useRenderer()}
      theme={defaultTheme("dark")} discoverConfig={false} />, { width: 28, height: 105 })
    await setup.renderOnce()
    const lines = setup.captureCharFrame().split("\n")
    const nine = lines.find((line) => line.includes("9.  item"))
    const hundred = lines.find((line) => line.includes("100. item"))
    expect(nine).toBeDefined()
    expect(hundred).toBeDefined()
    expect(nine?.indexOf("item")).toBe(hundred?.indexOf("item"))
  })
})
