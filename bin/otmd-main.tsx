import { createCliRenderer } from "@opentui/core"
import { render } from "@opentui/solid"
import path from "node:path"
import { cliUsage, loadRendererConfig, parseCliArgs } from "../src"
import { StandaloneViewer } from "../src/viewer/app"

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
const onExit = () => {
  renderer.destroy()
  process.exit(0)
}

await render(() => (
  <StandaloneViewer
    renderer={renderer}
    content={content}
    title={filePath ? path.basename(filePath) : "stdin"}
    assetBase={assetBase}
    cwd={process.cwd()}
    config={config}
    onExit={onExit}
  />
), renderer)

async function readFile(filePath: string) {
  const file = Bun.file(filePath)
  if (!(await file.exists())) fail(`file not found: ${filePath}`)
  try {
    return await file.text()
  } catch (error) {
    fail(`unable to read ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
