import { createResource, createSignal, Match, Switch } from "solid-js"
import { mosaicScale, type CanvasGraphics } from "../graphics"
import { mathImageID, renderMathImage, rgbaToHex, type CellSize, type MathImage } from "../math"
import type { Theme } from "../theme/types"

// Display math owns its own block. Inline math flows with the text around it.
export function DisplayMath(props: {
  content: string
  open: string
  close: string
  maxWidth: () => number
  surface: () => string
  theme: () => Theme
  graphics: CanvasGraphics
  scale: () => number
}) {
  const [failed, setFailed] = createSignal(false)
  const color = () => rgbaToHex(props.theme().text.base)
  // The block-character mosaic packs two vertical pixels per cell, so its
  // cell box (not its raster) is scaled separately from font rasterization.
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
        scale: props.scale(),
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
              id={`opentui-markdown-math-${mathImageID(props.content, true, color(), props.graphics.cell(), props.scale())}-${props.surface()}`}
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
