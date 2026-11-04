import type { CliRenderer } from "@opentui/core"
import { createEffect, createMemo, createSignal, onCleanup, type Accessor } from "solid-js"
import { useCanvasGraphics } from "./graphics"
import { resolveHeadingStyles } from "./headings"
import { rgbaToHex } from "./math"
import { loadRendererConfig, resolveConfiguredTheme, resolveConfiguredLayout } from "./config"
import type { ImagesConfig, MarkdownConfig, ThemeModeSetting } from "./config"
import { parseDocument, type Document, type FrameConfig, type TablesConfig, type UnitInfo } from "./core"
import { MarkdownFrame } from "./view/frame"
import { DocumentView, type RenderUnit } from "./view/document"
import type { Theme } from "./theme/types"
import { generateSyntax } from "./theme/syntax"

export type { ThemeModeSetting } from "./config"
export { loadRendererConfig } from "./config"

// A diagnostic is a warning or a failure the host may want to show in its own
// UI instead of the terminal's stderr.
export type MarkdownDiagnostic = {
  readonly level: "warning" | "error"
  readonly message: string
}

export type MarkdownRendererCommonProps = {
  readonly renderer: CliRenderer
  readonly columns?: () => number
  readonly assetBase?: () => string | undefined
  // A host that already resolved a theme wins over the config file and default.
  readonly theme?: Theme | (() => Theme)
  // A ready-made configuration. It replaces the file lookup entirely.
  readonly config?: MarkdownConfig | (() => MarkdownConfig)
  // An explicit JSON/JSONC config path. Without one the package walks up from
  // `cwd` looking for `opentui-markdown-render.json[c]`.
  readonly configPath?: string
  readonly themeMode?: ThemeModeSetting | (() => ThemeModeSetting | null | undefined)
  // Host-controlled display-math enlargement. Inline formulas keep text size.
  readonly mathScale?: number | (() => number)
  readonly cwd?: string
  // The viewer window. `enabled: false` keeps the document in the whole area.
  readonly frame?: FrameConfig | (() => FrameConfig)
  // Table sizing and overflow. Defaults to content-sized, horizontally
  // scrollable tables.
  readonly tables?: TablesConfig | (() => TablesConfig)
  // An embedded host passes `false` so the renderer never walks the file system
  // for a config that belongs to a standalone viewer.
  readonly discoverConfig?: boolean
  // Warnings and errors are reported here instead of stderr, which lets a host
  // put them in its own UI.
  readonly onDiagnostic?: (diagnostic: MarkdownDiagnostic) => void
  // The host may wrap every top-level block and every item of a top-level list.
  readonly renderUnit?: RenderUnit
  // A host-owned unit state such as a review selection can replace the surface
  // painted by text rows and rasterized media inside that unit.
  readonly unitSurface?: (info: Accessor<UnitInfo>) => string | undefined
}

// The renderer takes either Markdown text or a document the host already parsed.
// A ready document skips the parser entirely.
export type MarkdownRendererProps = MarkdownRendererCommonProps & (
  | { readonly content: () => string; readonly document?: never }
  | { readonly document: () => Document; readonly content?: never }
)

// Keep the public host helper, but use the same config/runtime resolution as
// the component. Loading the file remains an optional concern of this adapter.
// The renderer argument stays for existing callers, but its terminal theme
// does not determine the default palette.
export function resolveRendererTheme(
  renderer: CliRenderer,
  options: {
    theme?: Theme | (() => Theme)
    config?: MarkdownConfig
    configPath?: string
    themeMode?: ThemeModeSetting | null | undefined
    cwd?: string
  } = {},
): Theme {
  const host = typeof options.theme === "function" ? options.theme() : options.theme
  if (host) return host
  const config = options.config ?? loadRendererConfig(options.configPath, options.cwd)
  return resolveConfiguredTheme(config, {
    themeMode: options.themeMode,
  })
}

export function MarkdownRenderer(props: MarkdownRendererProps) {
  const renderer = props.renderer
  const graphics = useCanvasGraphics(renderer)
  const surface = () => rgbaToHex(theme().background.base)
  // The document is laid out for the width of the area it is rendered in, not
  // for the width of the terminal: a host that insets the document (a scroll
  // box with padding, a sidebar, a border) leaves less room, and a line that
  // reaches past it is cut off by the terminal. The root box measures itself,
  // so the layout follows the host. An explicit `columns` wins over it.
  const [measured, setMeasured] = createSignal(0)
  // The area the host gives the viewer: the terminal is only the fallback for
  // the first frame, before the root box has been measured.
  const viewportWidth = () => {
    const explicit = props.columns?.()
    if (explicit !== undefined && explicit > 0) return Math.max(8, explicit)
    const width = measured()
    return Math.max(8, width > 0 ? width : renderer.terminalWidth)
  }

  const themeModeSetting = () => (typeof props.themeMode === "function" ? props.themeMode() : props.themeMode)
  const mathScale = () => {
    const value = typeof props.mathScale === "function" ? props.mathScale() : props.mathScale
    return value !== undefined && Number.isFinite(value) && value > 0 ? value : 1
  }
  const config = createMemo<MarkdownConfig>(() => {
    const provided = typeof props.config === "function" ? props.config() : props.config
    if (provided) return provided
    return loadRendererConfig(props.configPath, props.cwd, {
      discover: props.discoverConfig,
      report: (message) => {
        const handler = props.onDiagnostic
        if (handler) {
          handler({ level: "warning", message })
          return
        }
        console.warn(`[opentui-markdown-render] ${message}`)
      },
    })
  })
  const theme = createMemo<Theme>(() =>
    resolveRendererTheme(renderer, {
      theme: props.theme,
      config: config(),
      themeMode: themeModeSetting(),
    }),
  )

  // The frame decides how much of the measured area the document gets. Every
  // block engine reads the same `contentWidth`, so text, tables and formulas
  // cannot disagree about where the right edge is.
  const frameSetting = createMemo<FrameConfig | undefined>(() => {
    const explicit = typeof props.frame === "function" ? props.frame() : props.frame
    return explicit ?? config().frame
  })
  const tableSetting = createMemo<TablesConfig | undefined>(() => {
    const explicit = typeof props.tables === "function" ? props.tables() : props.tables
    return explicit ?? config().tables
  })
  const layout = createMemo(() =>
    resolveConfiguredLayout(config(), { viewport: viewportWidth(), frame: frameSetting(), tables: tableSetting() }),
  )
  const frame = () => layout().frame
  const contentWidth = () => layout().contentWidth
  const tableOptions = () => layout().tables

  const document = createMemo<Document>(() => {
    const ready = props.document
    if (ready) return ready()
    const content = props.content
    if (!content) throw new Error("MarkdownRenderer requires either a content or a document accessor")
    return parseDocument(content())
  })
  // The look of the heading levels is a configuration of its own: the colours
  // come from the theme, the attributes and the spacing from the config file.
  const headings = createMemo(() => resolveHeadingStyles(config().headings))
  const syntaxStyle = createMemo(() => {
    const nativeScene = (renderer as CliRenderer & { readonly nativeScene?: object }).nativeScene
    return generateSyntax(theme(), headings(), theme().markdown.codeBlock, nativeScene)
  })
  createEffect(() => {
    const style = syntaxStyle()
    onCleanup(() => void renderer.idle().then(() => style.destroy()))
  })
  return (
        <box
          width="100%"
          flexDirection="column"
          flexShrink={0}
          backgroundColor={theme().background.base}
          onSizeChange={function () {
            const width = this.width
            if (width !== viewportWidth()) queueMicrotask(() => setMeasured(width))
          }}
        >
          <MarkdownFrame frame={frame()} theme={theme()}>
            <DocumentView
              document={document()}
              columns={contentWidth()}
              theme={theme()}
              headings={headings()}
              graphics={graphics}
              surface={surface}
              assetBase={() => props.assetBase?.()}
              imageLimits={config().images}
              tableOptions={tableOptions()}
              mermaidOptions={config().mermaid}
              mathScale={mathScale()}
              syntaxStyle={syntaxStyle()}
              onDiagnostic={props.onDiagnostic}
              renderUnit={props.renderUnit}
              unitSurface={props.unitSurface}
            />
          </MarkdownFrame>
        </box>
  )
}
