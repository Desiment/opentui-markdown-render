#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core"
import { render } from "@opentui/solid"
import { createSignal, onCleanup, Show } from "solid-js"
import path from "node:path"
import {
  MarkdownRenderer,
  StatusLine,
  cliUsage,
  loadRendererConfig,
  parseCliArgs,
  resolveRendererTheme,
  useCanvasGraphics,
} from "../src"

const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as { version: string }

function fail(message: string): never {
  console.error(`otmd: ${message}`)
  console.error("Try 'otmd --help' for usage.")
  process.exit(2)
}

let command
try {
  command = parseCliArgs(process.argv.slice(2))
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

if (command.kind === "help") {
  process.stdout.write(cliUsage)
  process.exit(0)
}
if (command.kind === "version") {
  process.stdout.write(`${manifest.version}\n`)
  process.exit(0)
}

const file = command.file
const filePath = file && file !== "-" ? path.resolve(file) : undefined
const content = file === "-"
  ? await new Response(Bun.stdin).text()
  : filePath
    ? await readFile(filePath)
    : fail("a Markdown file is required (use - to read stdin)")
const assetBase = filePath ? path.dirname(filePath) : process.cwd()
const config = loadRendererConfig(command.configPath, process.cwd(), { discover: command.discoverConfig })
const renderer = await createCliRenderer({})

function Otmd() {
  const graphics = useCanvasGraphics(renderer)
  const theme = () => resolveRendererTheme(renderer, { config, cwd: process.cwd() })
  const [position] = createSignal("1/1")
  const onKeypress = (key: { name?: string }) => {
    if (key.name === "q" || key.name === "escape") {
      renderer.destroy()
      process.exit(0)
    }
  }
  renderer.keyInput.on("keypress", onKeypress)
  onCleanup(() => renderer.keyInput.off("keypress", onKeypress))
  const state = () => ({
    title: filePath ? path.basename(filePath) : "stdin",
    protocol: graphics.protocol(),
    cell: graphics.cell() ? `${graphics.cell()!.width}x${graphics.cell()!.height}` : undefined,
    position: position(),
  })

  return (
    <box width="100%" height="100%" flexDirection="column" backgroundColor={theme().background.base}>
      <scrollbox width="100%" flexGrow={1} contentOptions={{ paddingLeft: 1, paddingRight: 1, paddingTop: 1, paddingBottom: 1 }}>
        <MarkdownRenderer
          content={() => content}
          renderer={renderer}
          assetBase={() => assetBase}
          config={() => config}
          cwd={process.cwd()}
          discoverConfig={false}
        />
      </scrollbox>
      <Show when={config.statusline?.enabled !== false}>
        <StatusLine theme={theme()} state={state} fields={config.statusline?.fields} separator={config.statusline?.separator} border={config.statusline?.border} style={config.statusline?.style} highlight={config.statusline?.highlight} />
      </Show>
    </box>
  )
}

await render(() => <Otmd />, renderer)

async function readFile(filePath: string) {
  const file = Bun.file(filePath)
  if (!(await file.exists())) fail(`file not found: ${filePath}`)
  try {
    return await file.text()
  } catch (error) {
    fail(`unable to read ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
