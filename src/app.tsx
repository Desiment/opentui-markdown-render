import type { CliRenderer, MarkdownOptions } from "@opentui/core"
import { createMemo, createSignal, For, Show } from "solid-js"
import { useCanvasGraphics, type CanvasGraphics } from "./graphics"
import { resolveHeadingStyles, type HeadingStyles } from "./headings"
import { CanvasFlow } from "./inline"
import { LocalImage } from "./media"
import { rgbaToHex } from "./math"
import { createThemedMermaidRenderer } from "./merman"
import { generateSyntax } from "./theme/syntax"
import { loadRendererConfig, resolveConfiguredTheme, resolveConfiguredLayout } from "./config"
import type { ImagesConfig, MarkdownConfig, ThemeModeSetting } from "./config"
import { scanDocument, type CanvasBlock, type FlowBlock, type FrameConfig, type ResolvedTableOptions, type TablesConfig } from "./core"
import { MarkdownFrame } from "./view/frame"
import { DisplayMath } from "./view/math"
import { createTableRenderer } from "./view/table"
import { createMarkdownStyleRenderer } from "./view/markdown-style"
import type { Theme } from "./theme/types"

export type { ThemeModeSetting } from "./config"
export { loadRendererConfig } from "./config"

// A diagnostic is a warning or a failure the host may want to show in its own
// UI instead of the terminal's stderr.
export type MarkdownDiagnostic = {
  readonly level: "warning" | "error"
  readonly message: string
}

export type MarkdownRendererProps = {
  readonly content: () => string
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
}

// Keep the public host helper, but use the same config/runtime resolution as
// the component. Loading the file remains an optional concern of this adapter.
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
    terminalThemeMode: renderer.themeMode,
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

  const blocks = createMemo(() => scanDocument(props.content()))
  // The look of the heading levels is a configuration of its own: the colours
  // come from the theme, the attributes and the spacing from the config file.
  const headings = createMemo(() => resolveHeadingStyles(config().headings))
  const mermaidNode = createThemedMermaidRenderer(renderer, {
    theme,
    compact: () => config().mermaid?.compact,
    layoutMaxWidth: () => config().mermaid?.layoutMaxWidth,
  })
  const tableNode = createTableRenderer(renderer, () => tableOptions())
  const styleNode = createMarkdownStyleRenderer(renderer, theme)
  // A block is offered to the table renderer first and to the Mermaid renderer
  // second: both answer only for the tokens they own.
  const renderNode: NonNullable<MarkdownOptions["renderNode"]> = (token, context) =>
    tableNode(token, context) ?? mermaidNode(token, context) ?? styleNode(token, context)

  // OpenTUI's markdown renderable caches each chunk's resolved color and only
  // rebuilds a block when its text changes, so a theme swap leaves stale colors
  // behind (most visibly on list markers). Rebuilding the subtree whenever the
  // theme identity changes forces every chunk to be re-resolved.
  return (
    <Show when={theme()} keyed>
      {(activeTheme) => (
        <box
          width="100%"
          flexDirection="column"
          flexShrink={0}
          backgroundColor={activeTheme.background.base}
          onSizeChange={function () {
            setMeasured(this.width)
          }}
        >
          <MarkdownFrame frame={frame()} theme={activeTheme}>
            <For each={blocks()}>
              {(block) => (
                <BlockView
                  block={block}
                  theme={theme}
                  graphics={graphics}
                  renderNode={renderNode}
                  tableOptions={tableOptions}
                  columns={contentWidth}
                  surface={surface}
                  assetBase={() => props.assetBase?.()}
                  imageLimits={config().images}
                  headings={headings()}
                />
              )}
            </For>
          </MarkdownFrame>
        </box>
      )}
    </Show>
  )
}

type BlockViewProps = {
  readonly block: CanvasBlock
  readonly theme: () => Theme
  readonly graphics: CanvasGraphics
  readonly renderNode: NonNullable<MarkdownOptions["renderNode"]>
  readonly tableOptions: () => ResolvedTableOptions
  readonly columns: () => number
  readonly surface: () => string
  readonly assetBase: () => string | undefined
  readonly imageLimits?: ImagesConfig
  readonly headings?: HeadingStyles
}

// A block owns either OpenTUI's Markdown renderer or the inline flow, never both.
function BlockView(props: BlockViewProps) {
  const view = createMemo(() => {
    const block = props.block
    if (block.type === "markdown") {
      return (
        <markdown
          syntaxStyle={generateSyntax(props.theme(), props.headings)}
          renderNode={props.renderNode}
          content={block.content}
          internalBlockMode="top-level"
          tableOptions={{
            style: "grid",
            widthMode: props.tableOptions().widthMode,
            columnFitter: props.tableOptions().columnFitter,
            wrapMode: props.tableOptions().wrapMode,
            cellPaddingX: props.tableOptions().cellPaddingX,
          }}
          conceal
          fg={props.theme().markdown.text}
          bg={props.theme().background.base}
        />
      )
    }
    if (block.type === "display-math") {
      return (
        <DisplayMath
          content={block.content}
          open={block.open}
          close={block.close}
          maxWidth={props.columns}
          surface={props.surface}
          theme={props.theme}
          graphics={props.graphics}
        />
      )
    }
    if (block.type === "image") {
      return (
        <LocalImage
          href={block.href}
          alt={block.alt}
          base={props.assetBase}
          columns={props.columns}
          cell={props.graphics.cell}
          background={props.surface}
          labelColor={() => props.theme().markdown.image}
          textColor={() => props.theme().markdown.imageText}
          limits={props.imageLimits}
        />
      )
    }
    return (
      <CanvasFlow
        block={block.block as FlowBlock}
        columns={props.columns}
        surface={props.surface}
        background={() => props.theme().background.base}
        theme={props.theme()}
        graphics={props.graphics}
        headings={props.headings}
      />
    )
  })
  return (
    <box width="100%" flexDirection="column" flexShrink={0}>
      {view()}
    </box>
  )
}
