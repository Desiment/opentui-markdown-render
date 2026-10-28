import { describe, expect, test } from "bun:test"
import { createTestRenderer } from "@opentui/core/testing"
import { TextRenderable, StyledText, TextAttributes } from "@opentui/core"
import { flattenInline, toTableChunks } from "../src/view/inline-style"
import { defaultTheme } from "../src/theme/defaults"
import { defaultHeadingStyles } from "../src/headings"
import { parseDocument } from "../src/core/parse"

describe("inline style", () => {
  test("styled text with link ref", async () => {
    const testSetup = await createTestRenderer({ width: 40, height: 10 })
    const renderer = testSetup.renderer
    const text = new TextRenderable(renderer, { id: "t1", content: "hi", width: 20 })
    renderer.root.add(text)
    await testSetup.renderOnce()
    text.content = new StyledText([{ __isChunk: true, text: "click", fg: defaultTheme("dark").markdown.linkText, attributes: 0, link: { url: "https://example.com" } }])
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("click")
    expect(text.chunks[0]?.link?.url).toBe("https://example.com")
    renderer.destroy()
  })

  test("nested emphasis and links preserve colors, attributes and href", () => {
    const block = parseDocument("**_bold italic_** [site](https://example.com) **`code`** ![alt](a.png) ~~gone~~").blocks[0]
    if (block?.type !== "paragraph") throw new Error("expected paragraph")
    const theme = defaultTheme("dark")
    const atoms = flattenInline(block.children, { theme, headings: defaultHeadingStyles })
    const text = (value: string) => atoms.find((atom) => atom.type === "text" && atom.text === value)
    const styled = text("bold italic")
    expect(styled?.type === "text" && styled.attributes & (TextAttributes.BOLD | TextAttributes.ITALIC))
      .toBe(TextAttributes.BOLD | TextAttributes.ITALIC)
    expect(text("site")).toMatchObject({ fg: theme.markdown.linkText, href: "https://example.com" })
    expect(text("code")).toMatchObject({ fg: theme.markdown.code, attributes: TextAttributes.NONE })
    expect(text("alt")).toMatchObject({ fg: theme.markdown.linkText, href: "a.png" })
    const deleted = text("gone")
    expect(deleted?.type === "text" && deleted.attributes & TextAttributes.STRIKETHROUGH).toBeTruthy()
  })

  test("table chunks retain raw math and the clickable URL", () => {
    const block = parseDocument("| math | link |\n| --- | --- |\n| $x$ | [site](https://example.com) |").blocks[0]
    if (block?.type !== "table") throw new Error("expected table")
    const theme = defaultTheme("dark")
    expect(toTableChunks(block.rows[0]![0]!.children, theme, defaultHeadingStyles)[0]?.text).toBe("$x$")
    expect(toTableChunks(block.rows[0]![1]!.children, theme, defaultHeadingStyles)[0]?.link?.url).toBe("https://example.com")
  })
})
