import { createCliRenderer, type ScrollBoxRenderable } from "@opentui/core"
import { render } from "@opentui/solid"
import path from "node:path"
import { createSignal, onCleanup, Show } from "solid-js"
import {
  MarkdownRenderer,
  StatusLine,
  loadRendererConfig,
  resolveRendererTheme,
  useCanvasGraphics,
  type StatusLineState,
  type ThemeModeSetting,
} from "../src"

const renderer = await createCliRenderer({})
const requested = process.argv[2] ?? "plain.md"
if (!/^[a-z-]+\.md$/.test(requested)) throw new Error("Example must be a Markdown filename")
const file = path.join(import.meta.dir, requested)
if (!file.startsWith(`${import.meta.dir}${path.sep}`)) throw new Error("Example must be inside the examples directory")
const content = await Bun.file(file).text()

const modes: ThemeModeSetting[] = ["auto", "dark", "light"]
const config = loadRendererConfig(undefined, import.meta.dir)

function Demo() {
  const [mode, setMode] = createSignal<ThemeModeSetting>("auto")
  const [scale, setScale] = createSignal(1)
  const [position, setPosition] = createSignal("1/1")
  const theme = () => resolveRendererTheme(renderer, { themeMode: mode(), config, cwd: import.meta.dir })
  const graphics = useCanvasGraphics(renderer)
  let scroll: ScrollBoxRenderable | undefined

  // The scroll box has no scroll event, so the position is polled. The demo
  // only needs a rough line counter.
  const timer = setInterval(() => {
    if (!scroll) return
    const total = Math.max(0, scroll.scrollHeight - scroll.viewport.height)
    const top = Math.min(total, Math.max(0, scroll.scrollTop))
    setPosition(`${top + 1}/${total + 1}`)
  }, 200)
  onCleanup(() => clearInterval(timer))

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

  const state = (): StatusLineState => ({
    title: requested,
    mode: `theme:${mode()}`,
    protocol: graphics.protocol(),
    cell: graphics.cell() ? `${graphics.cell()!.width}x${graphics.cell()!.height}` : undefined,
    mathScale: scale(),
    position: position(),
    hint: "[t] theme  [+/-] math  [q] quit",
  })

  return (
    <box width="100%" height="100%" flexDirection="column" backgroundColor={theme().background.base}>
      <scrollbox
        ref={(element) => (scroll = element)}
        width="100%"
        flexGrow={1}
        contentOptions={{ paddingLeft: 1, paddingRight: 1, paddingTop: 1, paddingBottom: 1 }}
      >
        <MarkdownRenderer
          content={() => content}
          renderer={renderer}
          assetBase={() => import.meta.dir}
          themeMode={mode}
          mathScale={scale}
          config={config}
          cwd={import.meta.dir}
        />
      </scrollbox>
      <Show when={config.statusline?.enabled !== false}>
        <StatusLine
          theme={theme()}
          state={state}
          fields={config.statusline?.fields}
          separator={config.statusline?.separator}
          border={config.statusline?.border}
        />
      </Show>
    </box>
  )
}

await render(() => <Demo />, renderer)
