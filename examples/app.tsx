import { createCliRenderer } from "@opentui/core"
import { render } from "@opentui/solid"
import path from "node:path"
import { loadRendererConfig, type FrameConfig } from "../src"
import { StandaloneViewer } from "../src/viewer/app"

const renderer = await createCliRenderer({})
const requested = process.argv[2] ?? "plain.md"
if (!/^[a-z-]+\.md$/.test(requested)) throw new Error("Example must be a Markdown filename")
const file = path.join(import.meta.dir, requested)
if (!file.startsWith(`${import.meta.dir}${path.sep}`)) throw new Error("Example must be inside the examples directory")
const content = await Bun.file(file).text()
const config = loadRendererConfig(undefined, import.meta.dir)

// The frame fixture shows the props API winning over the config file: it asks
// for a window of its own style, aligned to the right.
const frame: FrameConfig | undefined = requested === "frame.md"
  ? {
      enabled: true,
      width: 88,
      align: "right",
      style: "double",
      paddingX: 2,
      title: "frame.md",
      titleAlign: "center",
    }
  : undefined

const onExit = () => {
  renderer.destroy()
  process.exit(0)
}

await render(() => (
  <StandaloneViewer
    renderer={renderer}
    content={content}
    title={requested}
    assetBase={import.meta.dir}
    cwd={import.meta.dir}
    config={config}
    frame={frame}
    onExit={onExit}
  />
), renderer)
