import type { CliRenderer, ScrollBoxRenderable } from "@opentui/core"
import { createSignal, For, onCleanup, Show } from "solid-js"
import { MarkdownRenderer, resolveRendererTheme } from "../app"
import type { MarkdownConfig } from "../config"
import type { FrameConfig } from "../core"
import { useCanvasGraphics } from "../graphics"
import { StatusLine, type StatusLineState } from "../statusline"
import { listViewerThemes } from "../theme/load"
import { enableSelectionCopy } from "./clipboard"
import { quitAction } from "./quit"
import { changeSetting, settingKeys, settingRows, type ViewerSettings } from "./settings"

export type StandaloneViewerProps = {
  readonly renderer: CliRenderer
  readonly content: string
  readonly title: string
  readonly assetBase: string
  readonly cwd: string
  readonly config: MarkdownConfig
  readonly frame?: FrameConfig
  readonly onExit: () => void
}

export function StandaloneViewer(props: StandaloneViewerProps) {
  const themes = listViewerThemes()
  const initialTheme = props.config.theme?.name
  const [settings, setSettings] = createSignal<ViewerSettings>({
    themeName: initialTheme && themes.includes(initialTheme) ? initialTheme : "light",
    classLayout: props.config.mermaid?.classLayout ?? "builtin",
    frame: props.frame ?? props.config.frame ?? {},
    tables: props.config.tables ?? {},
  })
  const [panelOpen, setPanelOpen] = createSignal(false)
  const [confirmExit, setConfirmExit] = createSignal(false)
  const [selected, setSelected] = createSignal(0)
  const [position, setPosition] = createSignal("1/1")
  const [copyStatus, setCopyStatus] = createSignal<string>()
  const stopCopying = enableSelectionCopy(props.renderer, setCopyStatus)
  onCleanup(stopCopying)
  const viewerConfig = () => ({ ...props.config, theme: { name: settings().themeName } })
  const theme = () => resolveRendererTheme(props.renderer, {
    config: viewerConfig(),
    cwd: props.cwd,
  })
  const graphics = useCanvasGraphics(props.renderer)
  let scroll: ScrollBoxRenderable | undefined
  let savedScrollTop = 0

  const timer = setInterval(() => {
    if (!scroll) return
    const total = Math.max(0, scroll.scrollHeight - scroll.viewport.height)
    const top = Math.min(total, Math.max(0, scroll.scrollTop))
    setPosition(`${top + 1}/${total + 1}`)
  }, 200)
  onCleanup(() => clearInterval(timer))

  const onKeypress: Parameters<typeof props.renderer.keyInput.on<"keypress">>[1] = (key) => {
    // Some terminals forward this shortcut, while others handle it themselves.
    // The viewer has already copied the mouse selection on release.
    if (key.ctrl && key.shift && key.name === "c") {
      key.preventDefault()
      return
    }
    const action = quitAction(key, confirmExit())
    if (action === "exit") {
      props.onExit()
      return
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
      setSettings((current) => changeSetting(current, settingKeys[selected()]!, -1, themes))
    } else if (key.name === "right" || key.name === "l" || key.name === "return") {
      setSettings((current) => changeSetting(current, settingKeys[selected()]!, 1, themes))
    } else {
      return
    }
    key.preventDefault()
  }
  props.renderer.keyInput.on("keypress", onKeypress)
  onCleanup(() => props.renderer.keyInput.off("keypress", onKeypress))

  const state = (): StatusLineState => ({
    title: props.title,
    mode: `theme:${settings().themeName}`,
    protocol: graphics.protocol(),
    cell: graphics.cell() ? `${graphics.cell()!.width}x${graphics.cell()!.height}` : undefined,
    position: position(),
    hint: copyStatus() ?? "c:config q:quit",
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
              content={() => props.content}
              renderer={props.renderer}
              assetBase={() => props.assetBase}
              config={() => ({
                ...viewerConfig(),
                mermaid: { ...props.config.mermaid, classLayout: settings().classLayout },
              })}
              frame={() => settings().frame}
              tables={() => settings().tables}
              cwd={props.cwd}
              discoverConfig={false}
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
          <text fg={theme().accent}>Quit viewer?</text>
          <text fg={theme().text.muted}>Configuration changes are not saved.</text>
          <text fg={theme().text.base}>Enter/y: exit  n/Esc: stay</text>
        </box>
      </Show>
      <Show when={props.config.statusline?.enabled !== false}>
        <StatusLine
          theme={theme()}
          state={state}
          fields={props.config.statusline?.fields}
          separator={props.config.statusline?.separator}
          border={props.config.statusline?.border ?? "top"}
          style={props.config.statusline?.style}
          highlight={props.config.statusline?.highlight}
        />
      </Show>
    </box>
  )
}
