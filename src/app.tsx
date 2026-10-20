import type { CliRenderer, MarkdownOptions } from "@opentui/core"
import { createMemo, createResource, createSignal, For, Match, Show, Switch } from "solid-js"
import { useCanvasGraphics, mosaicScale, type CanvasGraphics } from "./graphics"
import { CanvasFlow, scanDocument, type CanvasBlock, type FlowBlock } from "./inline"
import { LocalImage } from "./media"
import { mathImageID, renderMathImage, rgbaToHex, type CellSize, type MathImage } from "./math"
import { createThemedMermaidRenderer } from "./merman"
import { generateSyntax } from "./theme/syntax"
import { loadThemeConfig } from "./theme/config"
import { resolveTheme } from "./theme/resolve"
import type { Theme, ThemeMode } from "./theme/types"

export type ThemeModeSetting = ThemeMode | "auto"

export type MarkdownRendererProps = {
  readonly content: () => string
  readonly renderer: CliRenderer
  readonly columns?: () => number
  readonly assetBase?: () => string | undefined
  // A host that already resolved a theme wins over the config file and default.
  readonly theme?: Theme | (() => Theme)
  // An explicit JSON/JSONC config path. Without one the package walks up from
  // `cwd` looking for `opentui-markdown-render.json[c]`.
  readonly configPath?: string
  readonly themeMode?: ThemeModeSetting | (() => ThemeModeSetting | null | undefined)
  readonly mathScale?: () => number
  readonly cwd?: string
}

// Theme priority: a host-provided theme, then the config file, then the bundled
// default. `auto` mode follows the terminal's reported theme, falling back to the
// config's own mode and finally to dark.
export function resolveRendererTheme(
  renderer: CliRenderer,
  options: {
    theme?: Theme | (() => Theme)
    configPath?: string
    themeMode?: ThemeModeSetting | null | undefined
    cwd?: string
  } = {},
): Theme {
  const host = typeof options.theme === "function" ? options.theme() : options.theme
  if (host) return host
  let override
  try {
    override = loadThemeConfig(options.configPath, options.cwd)
  } catch (error) {
    console.warn(`[opentui-markdown-render] ${error instanceof Error ? error.message : String(error)}`)
  }
  const setting = options.themeMode
  const mode = setting && setting !== "auto" ? setting : (override?.mode ?? renderer.themeMode ?? "dark")
  return resolveTheme({ mode, override })
}

export function MarkdownRenderer(props: MarkdownRendererProps) {
  const renderer = props.renderer
  const graphics = useCanvasGraphics(renderer)
  const surface = () => rgbaToHex(theme().background.base)
  const columns = () => Math.max(8, props.columns?.() ?? renderer.terminalWidth)

  const themeModeSetting = () => (typeof props.themeMode === "function" ? props.themeMode() : props.themeMode)
  const theme = createMemo<Theme>(() =>
    resolveRendererTheme(renderer, {
      theme: props.theme,
      configPath: props.configPath,
      themeMode: themeModeSetting(),
      cwd: props.cwd,
    }),
  )

  const blocks = createMemo(() => scanDocument(props.content()))
  const renderNode = createThemedMermaidRenderer(renderer, { theme })

  // OpenTUI's markdown renderable caches each chunk's resolved color and only
  // rebuilds a block when its text changes, so a theme swap leaves stale colors
  // behind (most visibly on list markers). Rebuilding the subtree whenever the
  // theme identity changes forces every chunk to be re-resolved.
  return (
    <Show when={theme()} keyed>
      {(activeTheme) => (
        <box width="100%" flexDirection="column" flexShrink={0} backgroundColor={activeTheme.background.base}>
          <For each={blocks()}>
            {(block) => (
              <BlockView
                block={block}
                theme={theme}
                graphics={graphics}
                renderNode={renderNode}
                columns={columns}
                surface={surface}
                mathScale={() => props.mathScale?.() ?? 1}
                assetBase={() => props.assetBase?.()}
              />
            )}
          </For>
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
  readonly columns: () => number
  readonly surface: () => string
  readonly mathScale: () => number
  readonly assetBase: () => string | undefined
}

// A block owns either OpenTUI's Markdown renderer or the inline flow, never both.
function BlockView(props: BlockViewProps) {
  const view = createMemo(() => {
    const block = props.block
    if (block.type === "markdown") {
      return (
        <markdown
          syntaxStyle={generateSyntax(props.theme())}
          renderNode={props.renderNode}
          content={block.content}
          internalBlockMode="top-level"
          tableOptions={{ style: "grid", cellPaddingX: 1 }}
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
          size={props.mathScale}
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
      />
    )
  })
  return (
    <box width="100%" flexDirection="column" flexShrink={0}>
      {view()}
    </box>
  )
}

// Display math owns its own block. Inline math flows with the text around it and
// is laid out by the inline renderer instead.
function DisplayMath(props: {
  content: string
  open: string
  close: string
  size: () => number
  maxWidth: () => number
  surface: () => string
  theme: () => Theme
  graphics: CanvasGraphics
}) {
  const [failed, setFailed] = createSignal(false)
  const color = () => rgbaToHex(props.theme().text.base)
  // The renderer sizes one em to one cell height on its own, so `size` is only
  // the author-facing enlargement. The block-character mosaic packs two vertical
  // pixels per cell, so its cell box (not its raster) is scaled there.
  const scale = () => props.size()
  const mosaic = () => mosaicScale(props.graphics.protocol())
  // Unrenderable TeX is a value here, not a rejected resource: reading a rejected
  // resource throws, which would abort the tree on the next update.
  const [rendered] = createResource(
    () =>
      JSON.stringify({
        content: props.content,
        color: color(),
        background: props.surface(),
        cell: props.graphics.cell(),
        scale: scale(),
      }),
    async (key): Promise<{ raster: MathImage } | { error: string }> => {
      const input = JSON.parse(key) as { content: string; color: string; background: string; cell: CellSize | null; scale: number }
      try {
        const raster = await renderMathImage(input.content, true, input.color, input.background, input.cell, input.scale)
        return raster ? { raster } : { error: "Renderer returned no image" }
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) }
      }
    },
  )
  const raster = () => {
    const value = rendered()
    return value && "raster" in value ? value.raster : undefined
  }
  const source = () => `${props.open}${props.content}${props.close}`
  const box = () => {
    const image = raster()
    const columns = (image ? image.columns : Math.min(24, props.maxWidth())) * mosaic()
    const rows = (image ? image.rows : 3) * mosaic()
    const max = props.maxWidth()
    if (columns <= max) return { columns, rows: Math.max(1, rows) }
    return { columns: max, rows: Math.max(1, Math.round((rows * max) / columns)) }
  }

  return (
    <box width="100%" flexShrink={0} flexDirection="column" marginTop={1} marginBottom={1}>
      <Switch>
        <Match when={rendered.loading}>
          <text fg={props.theme().text.muted} alignSelf="center">Rendering math...</text>
        </Match>
        <Match when={failed() || (rendered() && "error" in rendered()!)}>
          <box flexDirection="column" border={["left"]} borderColor={props.theme().text.feedback.error} paddingLeft={1} alignSelf="center">
            <text fg={props.theme().text.feedback.error}>Could not render TeX; showing source</text>
            <text fg={props.theme().text.base} wrapMode="word">
              {source()}
            </text>
          </box>
        </Match>
        <Match when={raster()}>
          <box width="100%" height={box().rows} flexShrink={0} alignItems="center" justifyContent="center">
            <image
              id={`opentui-markdown-math-${mathImageID(props.content, true, color(), props.graphics.cell(), scale())}`}
              source={raster()!.png}
              fit="fit"
              protocol="auto"
              width={box().columns}
              height={box().rows}
              onError={() => setFailed(true)}
            />
          </box>
        </Match>
      </Switch>
    </box>
  )
}
