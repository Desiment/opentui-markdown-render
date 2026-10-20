import { createCliRenderer } from "@opentui/core"
import { render } from "@opentui/solid"
import path from "node:path"
import { createSignal } from "solid-js"
import { MarkdownRenderer, resolveRendererTheme, type ThemeModeSetting } from "../src"

const renderer = await createCliRenderer({})
const requested = process.argv[2] ?? "plain.md"
if (!/^[a-z-]+\.md$/.test(requested)) throw new Error("Example must be a Markdown filename")
const file = path.join(import.meta.dir, requested)
if (!file.startsWith(`${import.meta.dir}${path.sep}`)) throw new Error("Example must be inside the examples directory")
const content = await Bun.file(file).text()

const modes: ThemeModeSetting[] = ["auto", "dark", "light"]

function Demo() {
  const [mode, setMode] = createSignal<ThemeModeSetting>("auto")
  const [scale, setScale] = createSignal(1)
  const theme = () => resolveRendererTheme(renderer, { themeMode: mode(), cwd: import.meta.dir })

  renderer.keyInput.on("keypress", (key) => {
    if (key.name === "q" || (key.ctrl && key.name === "c")) {
      renderer.destroy()
      process.exit(0)
    }
    if (key.name === "t") {
      const index = modes.indexOf(mode())
      setMode(modes[(index + 1) % modes.length]!)
    }
    if (key.name === "+" || key.name === "=") setScale((value) => Math.min(2, Math.round((value + 0.1) * 10) / 10))
    if (key.name === "-" || key.name === "_") setScale((value) => Math.max(0.5, Math.round((value - 0.1) * 10) / 10))
  })

  return (
    <box width="100%" height="100%" flexDirection="column" backgroundColor={theme().background.base}>
      <box width="100%" height={1} flexShrink={0} paddingLeft={1} paddingRight={1} flexDirection="row" justifyContent="space-between">
        <text fg={theme().text.base}>{requested}</text>
        <text fg={theme().text.muted}>{`theme:${mode()}  math:${scale().toFixed(1)}  [t] theme  [+/-] math  [q] quit`}</text>
      </box>
      <scrollbox width="100%" flexGrow={1} contentOptions={{ paddingLeft: 1, paddingRight: 1, paddingTop: 1, paddingBottom: 1 }}>
        <MarkdownRenderer
          content={() => content}
          renderer={renderer}
          assetBase={() => import.meta.dir}
          themeMode={mode}
          mathScale={scale}
          cwd={import.meta.dir}
        />
      </scrollbox>
    </box>
  )
}

await render(() => <Demo />, renderer)
