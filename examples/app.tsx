import { createCliRenderer, type ScrollBoxRenderable } from "@opentui/core"
import { render } from "@opentui/solid"
import path from "node:path"
import { createSignal, For, onCleanup, Show } from "solid-js"
import {
  MarkdownRenderer,
  StatusLine,
  loadRendererConfig,
  resolveRendererTheme,
  useCanvasGraphics,
  type FrameConfig,
  type StatusLineState,
} from "../src"
import { changeSetting, settingKeys, settingRows, type DemoSettings } from "./settings"
import { quitAction } from "./quit-confirmation"

const renderer = await createCliRenderer({})
const requested = process.argv[2] ?? "plain.md"
if (!/^[a-z-]+\.md$/.test(requested)) throw new Error("Example must be a Markdown filename")
const file = path.join(import.meta.dir, requested)
if (!file.startsWith(`${import.meta.dir}${path.sep}`)) throw new Error("Example must be inside the examples directory")
const content = await Bun.file(file).text()

const config = loadRendererConfig(undefined, import.meta.dir)

// The frame fixture shows the props API winning over the config file: it asks
// for a window of its own style, aligned to the right.
const frame: FrameConfig | undefined =
  requested === "frame.md"
    ? {
        enabled: true,
        width: 88,
        align: "right",
        style: "double",
        paddingX: 2,
        title: "frame.md",
        titleAlign: "center",
      }
    : config.frame

function Demo() {
  const [settings, setSettings] = createSignal<DemoSettings>({
    mode: config.theme?.mode ?? "light",
    classLayout: config.mermaid?.classLayout ?? "builtin",
    frame: frame ?? {},
    tables: config.tables ?? {},
  })
  const [panelOpen, setPanelOpen] = createSignal(false)
  const [confirmExit, setConfirmExit] = createSignal(false)
  const [selected, setSelected] = createSignal(0)
  const [position, setPosition] = createSignal("1/1")
  const theme = () => resolveRendererTheme(renderer, { themeMode: settings().mode, config, cwd: import.meta.dir })
  const graphics = useCanvasGraphics(renderer)
  let scroll: ScrollBoxRenderable | undefined
  let savedScrollTop = 0

  // The scroll box has no scroll event, so the position is polled. The demo
  // only needs a rough line counter.
  const timer = setInterval(() => {
    if (!scroll) return
    const total = Math.max(0, scroll.scrollHeight - scroll.viewport.height)
    const top = Math.min(total, Math.max(0, scroll.scrollTop))
    setPosition(`${top + 1}/${total + 1}`)
  }, 200)
  onCleanup(() => clearInterval(timer))

  const onKeypress: Parameters<typeof renderer.keyInput.on<"keypress">>[1] = (key) => {
    const action = quitAction(key, confirmExit())
    if (action === "exit") {
      renderer.destroy()
      process.exit(0)
    }
    if (action === "prompt") {
      if (scroll) {
        savedScrollTop = scroll.scrollTop
        scroll = undefined
      }
      setConfirmExit(true)
      key.preventDefault()
      return
    }
    if (confirmExit()) {
      if (action === "cancel") setConfirmExit(false)
      key.preventDefault()
      return
    }
    if (key.name === "c" || (panelOpen() && key.name === "escape")) {
      if (!panelOpen() && scroll) {
        savedScrollTop = scroll.scrollTop
        scroll = undefined
      }
      setPanelOpen(!panelOpen())
      key.preventDefault()
      return
    }
    if (!panelOpen()) return
    if (key.name === "up" || key.name === "k") {
      setSelected((index) => (index + settingKeys.length - 1) % settingKeys.length)
    } else if (key.name === "down" || key.name === "j") {
      setSelected((index) => (index + 1) % settingKeys.length)
    } else if (key.name === "left" || key.name === "h") {
      setSettings((current) => changeSetting(current, settingKeys[selected()]!, -1))
    } else if (key.name === "right" || key.name === "l" || key.name === "return") {
      setSettings((current) => changeSetting(current, settingKeys[selected()]!, 1))
    } else {
      return
    }
    key.preventDefault()
  }
  renderer.keyInput.on("keypress", onKeypress)
  onCleanup(() => renderer.keyInput.off("keypress", onKeypress))

  const state = (): StatusLineState => ({
    title: requested,
    mode: `theme:${settings().mode}`,
    protocol: graphics.protocol(),
    cell: graphics.cell() ? `${graphics.cell()!.width}x${graphics.cell()!.height}` : undefined,
    position: position(),
  })

  return (
    <box width="100%" height="100%" flexDirection="column" backgroundColor={theme().background.base}>
      <Show when={confirmExit()} fallback={
        <Show when={panelOpen()} fallback={
          <scrollbox
            ref={(element) => {
              scroll = element
              queueMicrotask(() => { element.scrollTop = savedScrollTop })
            }}
            width="100%"
            flexGrow={1}
            contentOptions={{ paddingLeft: 1, paddingRight: 1, paddingTop: 1, paddingBottom: 1 }}
          >
            <MarkdownRenderer
              content={() => content}
              renderer={renderer}
              assetBase={() => import.meta.dir}
              themeMode={() => settings().mode}
              config={() => ({ ...config, mermaid: { ...config.mermaid, classLayout: settings().classLayout } })}
              frame={() => settings().frame}
              tables={() => settings().tables}
              cwd={import.meta.dir}
            />
          </scrollbox>
        }>
          <scrollbox width="100%" flexGrow={1} contentOptions={{ paddingLeft: 2, paddingTop: 1, paddingBottom: 1 }}>
            <text fg={theme().text.base}>Configuration</text>
            <text fg={theme().text.muted}>Up/Down: select  Left/Right: change  c/Esc: close  q: confirm quit</text>
            <box height={1} />
            <For each={settingRows(settings())}>
              {(row, index) => (
                <text fg={selected() === index() ? theme().accent : theme().text.base}>
                  {selected() === index() ? "❯ " : "  "}{row.label}: {row.value}
                </text>
              )}
            </For>
          </scrollbox>
        </Show>
      }>
        <box width="100%" flexGrow={1} flexDirection="column" alignItems="center" justifyContent="center">
          <text fg={theme().accent}>Quit demo?</text>
          <text fg={theme().text.muted}>Configuration changes are not saved.</text>
          <text fg={theme().text.base}>Enter/y: exit  n/Esc: stay</text>
        </box>
      </Show>
      <Show when={config.statusline?.enabled !== false}>
        <StatusLine
          theme={theme()}
          state={state}
          fields={config.statusline?.fields}
          separator={config.statusline?.separator}
          border={config.statusline?.border}
          style={config.statusline?.style}
          highlight={config.statusline?.highlight}
        />
      </Show>
    </box>
  )
}

await render(() => <Demo />, renderer)
